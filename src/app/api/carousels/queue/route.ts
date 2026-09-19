import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { calculateScheduleSlots, getSaoPauloDateString } from "@/lib/schedule-calculator";

export const dynamic = "force-dynamic";

/**
 * POST /api/carousels/queue
 * 
 * Cria uma fila de carrosséis: agenda múltiplos carrosséis sequencialmente
 * (1 carrossel = 1 slot de publicação) no fuso de São Paulo.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, message: "Não autenticado." }, { status: 401 });
    }

    const body = await request.json();
    const {
      accountId,
      carouselIds,
      startDate,
      dailyTimes,
      useRandomVariation = true,
      randomVariationMinutes = 5,
    } = body;

    if (!accountId || !Array.isArray(carouselIds) || carouselIds.length === 0) {
      return NextResponse.json(
        { success: false, message: "accountId e ao menos um carouselId são obrigatórios." },
        { status: 400 }
      );
    }

    const supabaseAdmin = createAdminClient();
    const client = supabaseAdmin || supabase;

    // 1. Valida conta
    const { data: account, error: accError } = await client
      .from("instagram_accounts")
      .select("id, username")
      .eq("id", accountId)
      .eq("user_id", user.id)
      .single();

    if (accError || !account) {
      return NextResponse.json(
        { success: false, message: "Conta do Instagram não encontrada ou não autorizada." },
        { status: 404 }
      );
    }

    // 2. Valida carrosséis
    const { data: carousels, error: carError } = await client
      .from("carousels")
      .select("id, title, caption, status")
      .in("id", carouselIds)
      .eq("user_id", user.id)
      .eq("instagram_account_id", accountId);

    if (carError || !carousels || carousels.length === 0) {
      return NextResponse.json(
        { success: false, message: "Nenhum carrossel válido encontrado." },
        { status: 404 }
      );
    }

    // Preserva a ordem original solicitada
    const carouselMap = new Map(carousels.map((c: any) => [c.id, c]));
    const orderedCarousels = carouselIds
      .map((id: string) => carouselMap.get(id))
      .filter(Boolean) as { id: string; title: string; caption: string; status: string }[];

    // 3. Calcula horários sequenciais
    const slots = calculateScheduleSlots({
      itemsCount: orderedCarousels.length,
      startDateStr: startDate || getSaoPauloDateString(),
      dailyTimes: Array.isArray(dailyTimes) && dailyTimes.length > 0 ? dailyTimes : ["18:00"],
      useRandomVariation,
      randomVariationMinutes,
    });

    if (slots.length !== orderedCarousels.length) {
      return NextResponse.json(
        { success: false, message: "Erro no cálculo da grade de horários de publicação." },
        { status: 500 }
      );
    }

    // 4. Insere em scheduled_posts e atualiza carousels
    const scheduledPostsToInsert = orderedCarousels.map((c, idx) => ({
      user_id: user.id,
      instagram_account_id: accountId,
      post_type: "carousel",
      carousel_id: c.id,
      caption: c.caption || "",
      scheduled_at: slots[idx],
      status: "scheduled",
    }));

    const { error: insertError } = await client
      .from("scheduled_posts")
      .insert(scheduledPostsToInsert);

    if (insertError) {
      console.error("[Carousels Queue POST] Erro ao agendar posts:", insertError);
      return NextResponse.json(
        { success: false, message: `Erro ao agendar carrosséis: ${insertError.message}` },
        { status: 500 }
      );
    }

    // Atualiza status dos carrosséis para "scheduled"
    await client
      .from("carousels")
      .update({ status: "scheduled", updated_at: new Date().toISOString() })
      .in("id", carouselIds)
      .eq("user_id", user.id);

    return NextResponse.json({
      success: true,
      message: `${orderedCarousels.length} carrossel(is) foram agendados com sucesso!`,
      scheduledCount: orderedCarousels.length,
      firstSlot: slots[0],
      lastSlot: slots[slots.length - 1],
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("[Carousels Queue POST] Exceção:", msg);
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}

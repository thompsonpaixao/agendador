import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/reel-queues/[id]
 * 
 * Exclui uma fila de Reels com segurança:
 * 1. Cancela/remove agendamentos futuros pendentes vinculados à fila.
 * 2. Preserva integralmente o histórico de posts já publicados (public.published_posts).
 * 3. Preserva todas as mídias e arquivos de vídeo no Supabase Storage.
 * 4. Remove a fila e seus itens do banco de dados.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, message: "Não autenticado." }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, message: "ID da fila obrigatório." }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, message: "Servidor administrativo não configurado." },
        { status: 500 }
      );
    }

    // 1. Verifica se a fila existe e pertence ao usuário
    const { data: queue, error: queueError } = await supabaseAdmin
      .from("reel_queues")
      .select("id, name, instagram_account_id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (queueError || !queue) {
      return NextResponse.json(
        { success: true, message: "Fila já removida anteriormente." },
        { status: 200 }
      );
    }

    // 2. Cancela agendamentos futuros pendentes vinculados a esta fila
    const { error: cancelError } = await supabaseAdmin
      .from("scheduled_posts")
      .delete()
      .eq("queue_id", id)
      .eq("user_id", user.id)
      .eq("status", "scheduled");

    if (cancelError) {
      console.warn("[Delete Queue API] Aviso ao cancelar posts futuros:", cancelError);
    }

    // 3. Remove os itens da fila (cascade seguro)
    await supabaseAdmin
      .from("reel_queue_items")
      .delete()
      .eq("queue_id", id)
      .eq("user_id", user.id);

    // 4. Remove o registro da fila
    const { error: deleteError } = await supabaseAdmin
      .from("reel_queues")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (deleteError) {
      console.error("[Delete Queue API] Erro ao excluir fila:", deleteError);
      return NextResponse.json(
        { success: false, message: `Falha ao excluir fila: ${deleteError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Fila "${queue.name}" excluída com sucesso. Publicações anteriores foram preservadas no histórico.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("[Delete Queue API] Exceção:", message);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

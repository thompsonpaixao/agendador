import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { publishScheduledPost } from "@/lib/instagram/publisher";

export const dynamic = "force-dynamic";

/**
 * POST /api/scheduler/publish
 * 
 * Endpoint de disparo do Scheduler para publicação de posts agendados vencidos.
 * Pode ser invocado periodicamente por:
 * 1. Supabase Cron (pg_cron + pg_net) com cabeçalho "Authorization: Bearer CRON_SECRET"
 * 2. Webhook agendado com cabeçalho "x-cron-secret: CRON_SECRET"
 * 3. Usuário autenticado na aplicação para sincronização manual sob demanda.
 */
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronHeader = request.headers.get("x-cron-secret");
    const expectedSecret = process.env.CRON_SECRET;

    const providedToken = authHeader?.replace("Bearer ", "") || cronHeader;

    let isAuthorized = false;

    // 1. Validação via CRON_SECRET
    if (expectedSecret && providedToken === expectedSecret) {
      isAuthorized = true;
    } else {
      // 2. Validação via sessão de usuário autenticado
      try {
        const supabase = await createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          isAuthorized = true;
        }
      } catch {
        // Falha na sessão
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, message: "Acesso não autorizado ao agendador de publicação." },
        { status: 401 }
      );
    }

    const supabaseAdmin = createAdminClient();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, message: "Servidor administrativo não configurado." },
        { status: 500 }
      );
    }

    const nowIso = new Date().toISOString();
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    // 3. Busca posts agendados vencidos que não estejam travados por outro worker ativo
    const { data: duePosts, error: fetchError } = await supabaseAdmin
      .from("scheduled_posts")
      .select("id, scheduled_at, instagram_account_id, post_type")
      .eq("status", "scheduled")
      .lte("scheduled_at", nowIso)
      .or(`locked_at.is.null,locked_at.lt.${tenMinutesAgo}`)
      .order("scheduled_at", { ascending: true })
      .limit(10);

    if (fetchError) {
      console.error("[Scheduler Publish] Erro ao buscar posts vencidos:", fetchError);
      return NextResponse.json(
        { success: false, message: `Erro ao consultar agendamentos: ${fetchError.message}` },
        { status: 500 }
      );
    }

    if (!duePosts || duePosts.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Nenhum post agendado pendente no momento.",
        processed: 0,
        published: 0,
        failed: 0,
      });
    }

    const results = [];
    let publishedCount = 0;
    let failedCount = 0;

    // 4. Executa a publicação em série de cada post
    for (const post of duePosts) {
      const result = await publishScheduledPost(post.id);
      results.push({
        postId: post.id,
        scheduledAt: post.scheduled_at,
        ...result,
      });

      if (result.success) {
        publishedCount++;
      } else {
        failedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processamento concluído: ${publishedCount} publicado(s), ${failedCount} com falha.`,
      processed: duePosts.length,
      published: publishedCount,
      failed: failedCount,
      results,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Erro desconhecido no scheduler.";
    console.error("[Scheduler Publish API] Exceção:", errorMsg);
    return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { processInstagramPublication } from "@/lib/instagram/publisher";

export const dynamic = "force-dynamic";

/**
 * POST /api/scheduler/publish
 * 
 * Endpoint de disparo periódico do Scheduler para publicação de posts agendados
 * e avanço de posts em processamento assíncrono na Meta.
 * Invocado periodicamente por:
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

    const now = new Date();
    const nowIso = now.toISOString();
    const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000).toISOString();

    console.log(`[Scheduler Publish] Executado em ${nowIso}. Verificando posts agendados e containers...`);

    // 3. Tenta claim atômico via RPC (PostgreSQL FOR UPDATE SKIP LOCKED)
    let claimedPosts: Array<{
      id: string;
      scheduled_at: string;
      instagram_account_id: string;
      post_type: string;
      queue_id?: string | null;
      status?: string;
      meta_container_id?: string | null;
    }> = [];
    let usedRpc = false;

    try {
      const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc("claim_scheduled_posts", {
        p_worker_id: "scheduler-worker",
        p_batch_size: 10,
        p_lock_duration_minutes: 10,
      });

      if (!rpcError && Array.isArray(rpcData) && rpcData.length > 0) {
        claimedPosts = rpcData;
        usedRpc = true;
      }
    } catch {
      // RPC não disponível, segue para fallback
    }

    // 4. Fallback resiliente: consulta direta capturando posts agendados vencidos E posts com container pendente
    if (!usedRpc) {
      // 4A: Posts agendados normais cujo horário chegou
      const { data: scheduledCandidates, error: scheduledErr } = await supabaseAdmin
        .from("scheduled_posts")
        .select("id, scheduled_at, instagram_account_id, post_type, queue_id, status, locked_at, meta_container_id")
        .eq("status", "scheduled")
        .lte("scheduled_at", nowIso)
        .order("scheduled_at", { ascending: true })
        .limit(10);

      // 4B: Posts em processamento assíncrono aguardando container na Meta
      const { data: processingCandidates } = await supabaseAdmin
        .from("scheduled_posts")
        .select("id, scheduled_at, instagram_account_id, post_type, queue_id, status, locked_at, meta_container_id")
        .eq("status", "processing")
        .not("meta_container_id", "is", null)
        .order("scheduled_at", { ascending: true })
        .limit(10);

      if (scheduledErr) {
        console.error("[Scheduler Publish] Erro ao buscar candidatos a publicação:", scheduledErr);
        return NextResponse.json(
          { success: false, message: `Erro ao consultar agendamentos: ${scheduledErr.message}` },
          { status: 500 }
        );
      }

      const allCandidates = [
        ...(scheduledCandidates || []),
        ...(processingCandidates || []),
      ];

      if (allCandidates.length > 0) {
        // Coleta filas para verificar se alguma está pausada
        const queueIds = allCandidates
          .map((c) => c.queue_id)
          .filter((qid): qid is string => Boolean(qid));

        const pausedQueueSet = new Set<string>();
        if (queueIds.length > 0) {
          const { data: queues } = await supabaseAdmin
            .from("reel_queues")
            .select("id, status")
            .in("id", queueIds);

          (queues || []).forEach((q: any) => {
            if (q.status === "paused") {
              pausedQueueSet.add(q.id);
            }
          });
        }

        // Filtra candidatos válidos (não bloqueados recentemente e fila não pausada)
        const validCandidates = allCandidates.filter((post) => {
          if (post.queue_id && pausedQueueSet.has(post.queue_id)) {
            return false;
          }
          if (post.locked_at) {
            const lockedTime = new Date(post.locked_at).getTime();
            // Se bloqueado há menos de 2 minutos, outro worker ainda está ativo nele
            if (now.getTime() - lockedTime < 2 * 60 * 1000) {
              return false;
            }
          }
          return true;
        });

        // Realiza claim dos candidatos válidos
        for (const cand of validCandidates) {
          const { error: claimErr } = await supabaseAdmin
            .from("scheduled_posts")
            .update({
              status: "processing",
              locked_at: nowIso,
              locked_by: "scheduler-worker",
              updated_at: nowIso,
            })
            .eq("id", cand.id);

          if (!claimErr) {
            claimedPosts.push(cand);
          }
        }
      }
    }

    // 5. Diagnóstico de posts vencidos há mais de 15 minutos sem processamento
    const { data: stuckPosts } = await supabaseAdmin
      .from("scheduled_posts")
      .select("id, scheduled_at, instagram_account_id, user_id, caption")
      .eq("status", "scheduled")
      .lt("scheduled_at", fifteenMinutesAgo)
      .is("locked_at", null)
      .limit(5);

    if (stuckPosts && stuckPosts.length > 0) {
      for (const stuck of stuckPosts) {
        await supabaseAdmin.from("error_logs").insert({
          user_id: stuck.user_id,
          instagram_account_id: stuck.instagram_account_id,
          scheduled_post_id: stuck.id,
          severity: "warning",
          category: "publishing",
          error_code: "SCHEDULED_POST_OVERDUE",
          message: `O agendamento previsto para ${stuck.scheduled_at} ultrapassou o horário limite de execução sem ser claimado pelo worker.`,
          technical_details: JSON.stringify({
            postId: stuck.id,
            scheduledAt: stuck.scheduled_at,
            checkedAt: nowIso,
          }),
        });
      }
    }

    // 6. Diagnóstico do Próximo Post Agendado
    const { data: upcomingQuery } = await supabaseAdmin
      .from("scheduled_posts")
      .select("id, scheduled_at, status")
      .eq("status", "scheduled")
      .gt("scheduled_at", nowIso)
      .order("scheduled_at", { ascending: true })
      .limit(1);

    const nextUpcoming = upcomingQuery && upcomingQuery.length > 0 ? upcomingQuery[0] : null;

    console.log(
      `[Scheduler Publish] Diagnóstico: Claimados=${claimedPosts.length} (usou RPC: ${usedRpc}). Próximo agendado no banco: ${
        nextUpcoming ? `${nextUpcoming.id} para ${nextUpcoming.scheduled_at}` : "nenhum futuro"
      }`
    );

    if (claimedPosts.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Nenhum post agendado ou em processamento pendente para este minuto.",
        due: 0,
        claimed: 0,
        processed: 0,
        published: 0,
        processing: 0,
        failed: 0,
        nextScheduledAt: nextUpcoming?.scheduled_at || null,
      });
    }

    const results = [];
    let publishedCount = 0;
    let processingCount = 0;
    let failedCount = 0;

    // 7. Executa a publicação em série de cada post claimado
    for (const post of claimedPosts) {
      const result = await processInstagramPublication(post.id, {
        isImmediateUserRequest: false,
      });

      results.push({
        postId: post.id,
        scheduledAt: post.scheduled_at,
        ...result,
      });

      if (result.published) {
        publishedCount++;
      } else if (result.processing) {
        processingCount++;
      } else {
        failedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processamento concluído: ${publishedCount} publicado(s), ${processingCount} em andamento na Meta, ${failedCount} com falha.`,
      due: claimedPosts.length,
      claimed: claimedPosts.length,
      processed: claimedPosts.length,
      published: publishedCount,
      processing: processingCount,
      failed: failedCount,
      nextScheduledAt: nextUpcoming?.scheduled_at || null,
      results,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Erro desconhecido no scheduler.";
    console.error("[Scheduler Publish API] Exceção:", errorMsg);
    return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
  }
}

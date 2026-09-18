import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * GET /api/reel-queues/[id]
 * 
 * Retorna o relatório detalhado e a lista sequencial de todos os vídeos de uma fila
 * (ativa ou finalizada), com status operacional real, horários planejados e reais,
 * links do Instagram e resumo de execução.
 */
export async function GET(
  _request: Request,
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

    const { id: queueId } = await params;
    if (!queueId) {
      return NextResponse.json({ success: false, message: "ID da fila obrigatório." }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, message: "Servidor administrativo não configurado." },
        { status: 500 }
      );
    }

    // 1. Busca a fila do usuário
    const { data: queue, error: queueError } = await supabaseAdmin
      .from("reel_queues")
      .select(`
        id,
        user_id,
        instagram_account_id,
        name,
        status,
        created_at,
        updated_at,
        instagram_accounts:instagram_account_id (
          id,
          username,
          name,
          profile_picture_url
        )
      `)
      .eq("id", queueId)
      .eq("user_id", user.id)
      .single();

    if (queueError || !queue) {
      return NextResponse.json({ success: false, message: "Fila não encontrada." }, { status: 404 });
    }

    // 2. Busca itens da fila ordenados por posição
    const { data: queueItems, error: itemsError } = await supabaseAdmin
      .from("reel_queue_items")
      .select("id, queue_id, media_id, position, custom_caption, status, created_at")
      .eq("queue_id", queueId)
      .eq("user_id", user.id)
      .order("position", { ascending: true });

    if (itemsError) {
      console.error("[Queue Details GET] Erro ao buscar itens:", itemsError);
      return NextResponse.json(
        { success: false, message: "Erro ao buscar itens da fila." },
        { status: 500 }
      );
    }

    const mediaIds = (queueItems || []).map((qi) => qi.media_id).filter(Boolean);

    // 3. Busca dados de mídia
    const mediaMap = new Map<string, any>();
    if (mediaIds.length > 0) {
      const { data: mediaList } = await supabaseAdmin
        .from("media")
        .select("id, original_name, storage_path, thumbnail_url, duration_seconds, size_bytes, retention_status")
        .in("id", mediaIds);

      (mediaList || []).forEach((m) => mediaMap.set(m.id, m));
    }

    // 4. Busca scheduled_posts da fila
    const scheduledMap = new Map<string, any>();
    const { data: scheduledList } = await supabaseAdmin
      .from("scheduled_posts")
      .select("id, queue_item_id, media_id, status, scheduled_at, error_message, error_code, last_error_at")
      .eq("queue_id", queueId);

    (scheduledList || []).forEach((sp) => {
      if (sp.queue_item_id) scheduledMap.set(sp.queue_item_id, sp);
      else if (sp.media_id && !scheduledMap.has(sp.media_id)) scheduledMap.set(sp.media_id, sp);
    });

    // 5. Busca published_posts relacionados
    const publishedMap = new Map<string, any>();
    if (mediaIds.length > 0) {
      const { data: publishedList } = await supabaseAdmin
        .from("published_posts")
        .select("id, media_id, instagram_media_id, permalink, published_at")
        .in("media_id", mediaIds)
        .eq("user_id", user.id);

      (publishedList || []).forEach((pub) => publishedMap.set(pub.media_id, pub));
    }

    // 6. Monta os itens enriquecidos e gera Signed URLs para as thumbnails
    let publishedCount = 0;
    let errorCount = 0;
    let scheduledCount = 0;
    let waitingCount = 0;
    let cancelledCount = 0;

    const populatedItems = await Promise.all(
      (queueItems || []).map(async (qi, index) => {
        const media = mediaMap.get(qi.media_id);
        const sp = scheduledMap.get(qi.id) || scheduledMap.get(qi.media_id);
        const pub = publishedMap.get(qi.media_id);

        let thumbUrl = "";
        if (media?.thumbnail_url && media.thumbnail_url.startsWith("users/")) {
          const { data: tSigned } = await supabaseAdmin.storage
            .from("media")
            .createSignedUrl(media.thumbnail_url, 7200);
          thumbUrl = tSigned?.signedUrl || "";
        } else if (media?.thumbnail_url) {
          thumbUrl = media.thumbnail_url;
        } else if (media?.storage_path) {
          const { data: vSigned } = await supabaseAdmin.storage
            .from("media")
            .createSignedUrl(media.storage_path, 7200);
          thumbUrl = vSigned?.signedUrl || "";
        }

        // Determina o status operacional do item
        let itemStatus: "Aguardando" | "Agendado" | "Publicando" | "Processando" | "Publicado" | "Falhou" | "Cancelado" = "Aguardando";
        let publishedAt: string | undefined = undefined;
        let permalink: string | undefined = undefined;
        let errorMessage: string | undefined = undefined;

        if (pub || sp?.status === "published" || qi.status === "published") {
          itemStatus = "Publicado";
          publishedCount++;
          publishedAt = pub?.published_at || sp?.scheduled_at;
          permalink = pub?.permalink;
        } else if (sp?.status === "processing" || qi.status === "processing") {
          itemStatus = "Publicando";
          scheduledCount++;
        } else if (sp?.status === "failed" || qi.status === "failed") {
          itemStatus = "Falhou";
          errorCount++;
          errorMessage = sp?.error_message || "Falha na publicação pela Meta API.";
        } else if (sp?.status === "cancelled" || qi.status === "cancelled") {
          itemStatus = "Cancelado";
          cancelledCount++;
        } else if (sp?.status === "scheduled" || qi.status === "scheduled") {
          itemStatus = "Agendado";
          scheduledCount++;
        } else {
          itemStatus = "Aguardando";
          waitingCount++;
        }

        return {
          id: qi.id,
          position: qi.position ?? index + 1,
          mediaId: qi.media_id,
          name: media?.original_name || `Vídeo #${index + 1}`,
          thumbnailUrl: thumbUrl,
          durationSeconds: media?.duration_seconds,
          sizeBytes: media?.size_bytes || 0,
          caption: qi.custom_caption || "",
          status: itemStatus,
          plannedAt: sp?.scheduled_at || null,
          publishedAt,
          permalink,
          errorMessage,
          errorCode: sp?.error_code,
        };
      })
    );

    // Identifica período da fila (data do primeiro slot até o último)
    const validPlannedDates = populatedItems
      .map((i) => i.plannedAt)
      .filter(Boolean)
      .sort();

    const firstDate = validPlannedDates[0] || queue.created_at;
    const lastDate = validPlannedDates[validPlannedDates.length - 1] || queue.created_at;

    const accountData = queue.instagram_accounts as any;

    return NextResponse.json({
      success: true,
      queue: {
        id: queue.id,
        name: queue.name,
        status: queue.status,
        createdAt: queue.created_at,
        updatedAt: queue.updated_at,
        accountId: queue.instagram_account_id,
        accountUsername: accountData?.username || "conta",
        accountAvatar: accountData?.profile_picture_url || "/avatars/default.png",
      },
      summary: {
        total: populatedItems.length,
        published: publishedCount,
        failed: errorCount,
        scheduled: scheduledCount,
        waiting: waitingCount,
        cancelled: cancelledCount,
        period: {
          start: firstDate,
          end: lastDate,
        },
      },
      items: populatedItems,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("[Queue Details GET] Exceção:", errorMsg);
    return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
  }
}

/**
 * DELETE /api/reel-queues/[id]
 * 
 * Exclui uma fila de Reels com segurança:
 * 1. Cancela/remove agendamentos futuros pendentes vinculados à fila.
 * 2. Preserva integralmente o histórico de posts já publicados (public.published_posts).
 * 3. Preserva todas as mídias e arquivos de vídeo no Supabase Storage.
 * 4. Remove a fila e seus itens do banco de dados.
 * Idempotente: se a fila já tiver sido removida, responde com HTTP 200 OK.
 */
export async function DELETE(
  _request: Request,
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

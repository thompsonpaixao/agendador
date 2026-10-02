import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { deleteMediaObject } from "@/lib/storage";

export const dynamic = "force-dynamic";

/**
 * POST /api/media/bulk-delete
 * 
 * Exclusão em lote com validação de vínculo e tratamento granular:
 * A) Mídia sem vínculo: excluída normalmente.
 * B) Mídia em fila/pending/scheduled: cancela agendamentos futuros e exclui normalmente.
 * C) Mídia processing/publishing na Meta: PRESERVADA (não falha o lote).
 * D) Mídia já published: excluída do repositório normalmente.
 * 
 * Retorna contadores precisos: deletedCount, preservedCount, message.
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
    const { mediaIds, permanent = false } = body;

    if (!Array.isArray(mediaIds) || mediaIds.length === 0) {
      return NextResponse.json(
        { success: false, message: "Nenhuma mídia informada para exclusão." },
        { status: 400 }
      );
    }

    const supabaseAdmin = createAdminClient();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, message: "Servidor administrativo não configurado." },
        { status: 500 }
      );
    }

    // 1. Busca todas as mídias pertencentes ao usuário autenticado
    const { data: mediaItems, error: fetchErr } = await supabaseAdmin
      .from("media")
      .select("id, original_name, storage_provider, storage_path, thumbnail_url")
      .in("id", mediaIds)
      .eq("user_id", user.id);

    if (fetchErr || !mediaItems || mediaItems.length === 0) {
      return NextResponse.json(
        { success: false, message: "Nenhuma mídia válida encontrada para este usuário." },
        { status: 404 }
      );
    }

    // 2. Busca posts em processamento ativo para essas mídias
    const { data: processingPosts } = await supabaseAdmin
      .from("scheduled_posts")
      .select("id, media_id, status, meta_container_id, locked_at")
      .in("media_id", mediaIds)
      .eq("status", "processing");

    const activelyProcessingMediaIds = new Set<string>();
    (processingPosts || []).forEach((p) => {
      if (p.meta_container_id) {
        activelyProcessingMediaIds.add(p.media_id);
      } else if (p.locked_at) {
        const lockAge = Date.now() - new Date(p.locked_at).getTime();
        if (lockAge < 5 * 60 * 1000) {
          activelyProcessingMediaIds.add(p.media_id);
        }
      }
    });

    const deletableMedia = mediaItems.filter((m) => !activelyProcessingMediaIds.has(m.id));
    const preservedMedia = mediaItems.filter((m) => activelyProcessingMediaIds.has(m.id));

    const deletableIds = deletableMedia.map((m) => m.id);

    if (deletableIds.length > 0) {
      // 3. Cancela agendamentos futuros relacionados (scheduled, pending)
      const { data: deletedScheduled } = await supabaseAdmin
        .from("scheduled_posts")
        .delete()
        .in("media_id", deletableIds)
        .eq("user_id", user.id)
        .in("status", ["scheduled", "pending"])
        .select("queue_id");

      // 4. Remove itens de fila relacionados
      const { data: deletedQueueItems } = await supabaseAdmin
        .from("reel_queue_items")
        .delete()
        .in("media_id", deletableIds)
        .eq("user_id", user.id)
        .select("queue_id");

      // 5. Atualiza contadores das filas afetadas
      const affectedQueueIds = new Set<string>();
      (deletedScheduled || []).forEach((s) => {
        if (s.queue_id) affectedQueueIds.add(s.queue_id);
      });
      (deletedQueueItems || []).forEach((q) => {
        if (q.queue_id) affectedQueueIds.add(q.queue_id);
      });

      for (const qId of affectedQueueIds) {
        const { count } = await supabaseAdmin
          .from("reel_queue_items")
          .select("id", { count: "exact", head: true })
          .eq("queue_id", qId);

        if (count !== null) {
          await supabaseAdmin
            .from("reel_queues")
            .update({
              total_videos: count,
              updated_at: new Date().toISOString(),
              ...(count === 0 ? { status: "completed" } : {}),
            })
            .eq("id", qId);
        }
      }

      // 6. Remove referências em carrosséis
      await supabaseAdmin
        .from("carousel_items")
        .delete()
        .in("media_id", deletableIds)
        .eq("user_id", user.id);

      if (!permanent) {
        // Soft-delete: Move para a Lixeira e desativa retenção
        await supabaseAdmin
          .from("media")
          .update({
            deleted_at: new Date().toISOString(),
            retention_status: "eligible_for_deletion",
            updated_at: new Date().toISOString(),
          })
          .in("id", deletableIds)
          .eq("user_id", user.id);
      } else {
        // Exclusão definitiva de R2/Storage e banco
        for (const item of deletableMedia) {
          try {
            await deleteMediaObject({
              storage_provider: item.storage_provider,
              storage_path: item.storage_path,
              thumbnail_url: item.thumbnail_url,
            });
          } catch (storageErr) {
            console.warn(`[Bulk Delete] Erro ao remover storage para ${item.id}:`, storageErr);
          }
        }

        await supabaseAdmin
          .from("media")
          .delete()
          .in("id", deletableIds)
          .eq("user_id", user.id);
      }
    }

    const deletedCount = deletableIds.length;
    const preservedCount = preservedMedia.length;

    let message = "";
    if (preservedCount > 0 && deletedCount > 0) {
      message = `${deletedCount} excluída${deletedCount !== 1 ? "s" : ""}. ${preservedCount} não ${preservedCount !== 1 ? "puderam" : "pôde"} ser excluída${preservedCount !== 1 ? "s" : ""} porque estava${preservedCount !== 1 ? "m" : ""} sendo processada${preservedCount !== 1 ? "s" : ""} pelo Instagram.`;
    } else if (preservedCount > 0 && deletedCount === 0) {
      message = `Nenhuma mídia foi excluída. ${preservedCount} mídia${preservedCount !== 1 ? "s" : ""} está${preservedCount !== 1 ? "o" : ""} sendo processada${preservedCount !== 1 ? "s" : ""} pelo Instagram no momento.`;
    } else {
      message = `${deletedCount} mídia${deletedCount !== 1 ? "s" : ""} excluída${deletedCount !== 1 ? "s" : ""} com sucesso.`;
    }

    return NextResponse.json({
      success: true,
      deletedCount,
      preservedCount,
      message,
      preservedNames: preservedMedia.map((m) => m.original_name),
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("[Bulk Delete API] Exceção:", errorMsg);
    return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
  }
}

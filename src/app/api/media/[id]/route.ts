import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { deleteMediaObject } from "@/lib/storage";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/media/[id]
 * 
 * Exclusão segura de mídia do repositório:
 * 1. Valida posse da mídia pelo user_id autenticado.
 * 2. Valida regras de retenção (impede exclusão se estiver em fila ativa ou post futuro).
 * 3. Remove os arquivos físicos do Supabase Storage.
 * 4. Remove o registro do banco de dados em public.media.
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

    const { id: mediaId } = await params;

    if (!mediaId) {
      return NextResponse.json({ success: false, message: "ID da mídia obrigatório." }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, message: "Servidor administrativo não configurado." },
        { status: 500 }
      );
    }

    // 1. Busca a mídia e valida ownership
    const { data: mediaItem, error: fetchError } = await supabaseAdmin
      .from("media")
      .select("id, user_id, storage_path, thumbnail_url, original_name, storage_provider, storage_bucket")
      .eq("id", mediaId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !mediaItem) {
      return NextResponse.json({ success: false, message: "Mídia não encontrada." }, { status: 404 });
    }

    // 2. Verifica se a mídia está ativamente sendo processada pelo Instagram (ÚNICO bloqueio real)
    const { data: processingPosts } = await supabaseAdmin
      .from("scheduled_posts")
      .select("id, status, meta_container_id, locked_at")
      .eq("media_id", mediaId)
      .eq("status", "processing");

    const isActivelyProcessing = processingPosts?.some((p) => {
      if (p.meta_container_id) return true;
      if (p.locked_at) {
        const lockAge = Date.now() - new Date(p.locked_at).getTime();
        return lockAge < 5 * 60 * 1000;
      }
      return false;
    });

    if (isActivelyProcessing) {
      return NextResponse.json(
        {
          success: false,
          message: "Este Reel já está sendo processado pelo Instagram. Aguarde a publicação terminar antes de excluí-lo.",
        },
        { status: 409 }
      );
    }

    // Verifica se a mídia está em carrossel ativamente em processamento
    const { data: carouselRefs } = await supabaseAdmin
      .from("carousel_items")
      .select("id, carousels!inner(status)")
      .eq("media_id", mediaId);

    const isProcessingCarousel = carouselRefs?.some(
      (ci: any) => ci.carousels?.status === "processing" || ci.carousels?.status === "publishing"
    );

    if (isProcessingCarousel) {
      return NextResponse.json(
        {
          success: false,
          message: "Este Reel já está sendo processado pelo Instagram. Aguarde a publicação terminar antes de excluí-lo.",
        },
        { status: 409 }
      );
    }

    // 3. Cancela/remove agendamentos futuros pendentes relacionados (scheduled, pending)
    // NOTA: Preserva integralmente posts 'published' e históricos de erro para auditoria
    const { data: deletedScheduled } = await supabaseAdmin
      .from("scheduled_posts")
      .delete()
      .eq("media_id", mediaId)
      .eq("user_id", user.id)
      .in("status", ["scheduled", "pending"])
      .select("id, queue_id");

    // 4. Cancela/remove itens de fila relacionados
    const { data: deletedQueueItems } = await supabaseAdmin
      .from("reel_queue_items")
      .delete()
      .eq("media_id", mediaId)
      .eq("user_id", user.id)
      .select("id, queue_id");

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

    // 6. Remove referências em carrosséis rascunho se aplicável
    await supabaseAdmin
      .from("carousel_items")
      .delete()
      .eq("media_id", mediaId)
      .eq("user_id", user.id);

    const { searchParams } = new URL(request.url);
    const isPermanent = searchParams.get("permanent") === "true";

    if (!isPermanent) {
      // Soft-delete: Move para a Lixeira e desativa retenção de fila
      const { error: updateError } = await supabaseAdmin
        .from("media")
        .update({
          deleted_at: new Date().toISOString(),
          retention_status: "eligible_for_deletion",
          updated_at: new Date().toISOString(),
        })
        .eq("id", mediaId)
        .eq("user_id", user.id);

      if (updateError) {
        return NextResponse.json(
          { success: false, message: `Erro ao mover mídia para a Lixeira: ${updateError.message}` },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `Mídia "${mediaItem.original_name}" movida para a Lixeira com sucesso.`,
        cancelledScheduledCount: deletedScheduled?.length || 0,
        cancelledQueueItemsCount: deletedQueueItems?.length || 0,
      });
    }

    // 7. Exclusão permanente: Remove arquivos físicos do Storage (R2 ou Supabase)
    await deleteMediaObject({
      storage_provider: mediaItem.storage_provider,
      storage_path: mediaItem.storage_path,
      thumbnail_url: mediaItem.thumbnail_url,
    });

    // 8. Remove registro permanentemente do banco
    const { error: deleteError } = await supabaseAdmin
      .from("media")
      .delete()
      .eq("id", mediaId)
      .eq("user_id", user.id);

    if (deleteError) {
      return NextResponse.json(
        { success: false, message: `Erro ao excluir registro no banco: ${deleteError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Mídia "${mediaItem.original_name}" excluída permanentemente.`,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("[Media Delete API] Exceção:", errorMsg);
    return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
  }
}

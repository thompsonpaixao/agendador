import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
      .select("id, user_id, storage_path, thumbnail_url, original_name")
      .eq("id", mediaId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !mediaItem) {
      return NextResponse.json({ success: false, message: "Mídia não encontrada." }, { status: 404 });
    }

    // 2. Valida se a mídia está vinculada a postagens agendadas futuras
    const { data: futurePosts } = await supabaseAdmin
      .from("scheduled_posts")
      .select("id")
      .eq("media_id", mediaId)
      .in("status", ["scheduled", "processing"])
      .limit(1);

    if (futurePosts && futurePosts.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Esta mídia está sendo utilizada em uma fila/agendamento e não pode ser excluída agora.",
        },
        { status: 400 }
      );
    }

    // 3. Valida se a mídia está vinculada a itens de filas ativas
    const { data: activeQueueItems } = await supabaseAdmin
      .from("reel_queue_items")
      .select("id")
      .eq("media_id", mediaId)
      .in("status", ["pending", "scheduled", "processing"])
      .limit(1);

    if (activeQueueItems && activeQueueItems.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Esta mídia está sendo utilizada em uma fila/agendamento e não pode ser excluída agora.",
        },
        { status: 400 }
      );
    }

    // 4. Valida se a mídia está vinculada a carrosséis não publicados / agendados / rascunho ativo
    const { data: carouselRefs } = await supabaseAdmin
      .from("carousel_items")
      .select("id, carousels!inner(status)")
      .eq("media_id", mediaId)
      .limit(5);

    const isUsedInActiveCarousel = carouselRefs?.some((ci: any) =>
      ["draft", "queued", "scheduled", "processing", "publishing"].includes(ci.carousels?.status)
    );

    if (isUsedInActiveCarousel) {
      return NextResponse.json(
        {
          success: false,
          message: "Esta mídia está sendo utilizada em uma fila/agendamento e não pode ser excluída agora.",
        },
        { status: 400 }
      );
    }

    // 4. Remove arquivos físicos do Supabase Storage
    const filesToRemove: string[] = [];
    if (mediaItem.storage_path) filesToRemove.push(mediaItem.storage_path);
    if (mediaItem.thumbnail_url && mediaItem.thumbnail_url.startsWith("users/")) {
      filesToRemove.push(mediaItem.thumbnail_url);
    }

    if (filesToRemove.length > 0) {
      const { error: storageError } = await supabaseAdmin.storage
        .from("media")
        .remove(filesToRemove);

      if (storageError) {
        console.warn("[Media Delete] Aviso ao remover arquivos do Storage:", storageError.message);
      }
    }

    // 5. Remove registro do banco
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
      message: `Mídia "${mediaItem.original_name}" excluída com sucesso.`,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("[Media Delete API] Exceção:", errorMsg);
    return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
  }
}

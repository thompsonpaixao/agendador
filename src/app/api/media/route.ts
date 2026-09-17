import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { MediaItem } from "@/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/media
 * 
 * Lista mídias reais do repositório a partir de public.media,
 * com isolamento estrito por user_id e geração de Signed URLs para
 * acesso seguro aos arquivos privados do Supabase Storage.
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, message: "Não autenticado." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get("accountId");

    const supabaseAdmin = createAdminClient();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, message: "Servidor administrativo não configurado." },
        { status: 500 }
      );
    }

    let query = supabaseAdmin
      .from("media")
      .select("*")
      .eq("user_id", user.id)
      .neq("retention_status", "deleted")
      .order("created_at", { ascending: false });

    if (accountId && accountId !== "all") {
      query = query.eq("instagram_account_id", accountId);
    }

    const { data: records, error } = await query;

    if (error) {
      console.error("[Media GET] Erro ao buscar mídias:", error);
      return NextResponse.json(
        { success: false, message: `Erro ao buscar mídias: ${error.message}` },
        { status: 500 }
      );
    }

    if (!records || records.length === 0) {
      return NextResponse.json({ success: true, media: [] });
    }

    const mediaIds = records.map((r) => r.id);

    // Consulta status em scheduled_posts para cada media_id
    const scheduledMap = new Map<string, { status: string; id: string }>();
    if (mediaIds.length > 0) {
      const { data: posts } = await supabaseAdmin
        .from("scheduled_posts")
        .select("id, media_id, status")
        .in("media_id", mediaIds)
        .order("created_at", { ascending: false });

      (posts || []).forEach((p: any) => {
        if (p.media_id && !scheduledMap.has(p.media_id)) {
          scheduledMap.set(p.media_id, { status: p.status, id: p.id });
        }
      });
    }

    // Consulta status em reel_queue_items
    const queueItemMap = new Map<string, string>();
    if (mediaIds.length > 0) {
      const { data: qItems } = await supabaseAdmin
        .from("reel_queue_items")
        .select("media_id, status")
        .in("media_id", mediaIds)
        .in("status", ["pending", "scheduled", "processing"]);

      (qItems || []).forEach((qi: any) => {
        if (qi.media_id && !queueItemMap.has(qi.media_id)) {
          queueItemMap.set(qi.media_id, qi.status);
        }
      });
    }

    // Consulta status em carousel_items
    const carouselStatusMap = new Map<string, string>();
    if (mediaIds.length > 0) {
      const { data: cItems } = await supabaseAdmin
        .from("carousel_items")
        .select("media_id, carousels!inner(status)")
        .in("media_id", mediaIds);

      (cItems || []).forEach((ci: any) => {
        if (ci.media_id && !carouselStatusMap.has(ci.media_id)) {
          carouselStatusMap.set(ci.media_id, ci.carousels?.status || "ready");
        }
      });
    }

    // Gera Signed URLs em lote para exibição segura no frontend (validade: 2 horas)
    const mediaItems: MediaItem[] = await Promise.all(
      records.map(async (item) => {
        let videoUrl = "";
        let thumbUrl = "";

        if (item.storage_path) {
          const { data: vSigned } = await supabaseAdmin.storage
            .from("media")
            .createSignedUrl(item.storage_path, 7200);
          videoUrl = vSigned?.signedUrl || "";
        }

        if (item.thumbnail_url && item.thumbnail_url.startsWith("users/")) {
          const { data: tSigned } = await supabaseAdmin.storage
            .from("media")
            .createSignedUrl(item.thumbnail_url, 7200);
          thumbUrl = tSigned?.signedUrl || videoUrl;
        } else if (item.thumbnail_url) {
          thumbUrl = item.thumbnail_url;
        } else {
          thumbUrl = videoUrl;
        }

        // Determina o status operacional real
        let opStatus: MediaItem["operationalStatus"] = "available";
        const sp = scheduledMap.get(item.id);
        const qi = queueItemMap.get(item.id);
        const ciStatus = carouselStatusMap.get(item.id);

        if (item.published_at || sp?.status === "published" || ciStatus === "published" || item.retention_status === "eligible_for_deletion") {
          opStatus = "published";
        } else if (sp?.status === "processing") {
          opStatus = "publishing";
        } else if (sp?.status === "failed" || ciStatus === "error") {
          opStatus = "failed";
        } else if (sp?.status === "scheduled" || ciStatus === "scheduled") {
          opStatus = "scheduled";
        } else if (qi || ciStatus === "queued" || item.retention_status === "waiting_publication") {
          opStatus = "in_queue";
        } else {
          opStatus = "available";
        }

        return {
          id: item.id,
          userId: item.user_id,
          accountId: item.instagram_account_id,
          name: item.original_name,
          url: videoUrl,
          thumbnailUrl: thumbUrl,
          type: item.media_type as "video" | "image",
          sizeBytes: Number(item.size_bytes) || 0,
          durationSeconds: item.duration_seconds ? Number(item.duration_seconds) : undefined,
          position: item.position || 0,
          status: item.status as "ready" | "processing" | "uploaded" | "error",
          retentionStatus: item.retention_status,
          operationalStatus: opStatus,
          createdAt: item.created_at,
          deleteAfter: item.delete_after,
          publishedAt: item.published_at,
          relatedPostId: sp?.id,
        };
      })
    );

    return NextResponse.json({
      success: true,
      media: mediaItems,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("[Media GET API] Exceção:", errorMsg);
    return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
  }
}

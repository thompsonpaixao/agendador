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
          createdAt: item.created_at,
          deleteAfter: item.delete_after,
          publishedAt: item.published_at,
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

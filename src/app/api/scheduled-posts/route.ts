import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ScheduledPost } from "@/types";

export const dynamic = "force-dynamic";

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
      .from("scheduled_posts")
      .select(`
        id, user_id, instagram_account_id, post_type, caption, scheduled_at, status, queue_id,
        media:media_id (id, original_name, thumbnail_url),
        instagram_accounts:instagram_account_id (id, username, profile_picture_url)
      `)
      .eq("user_id", user.id)
      .order("scheduled_at", { ascending: true });

    if (accountId && accountId !== "all") {
      query = query.eq("instagram_account_id", accountId);
    }

    const { data: records, error } = await query;
    if (error) {
      return NextResponse.json(
        { success: false, message: `Erro ao buscar agendamentos: ${error.message}` },
        { status: 500 }
      );
    }

    const posts: ScheduledPost[] = (records || []).map((row: any) => {
      const igAcc = Array.isArray(row.instagram_accounts) ? row.instagram_accounts[0] : row.instagram_accounts;
      const media = Array.isArray(row.media) ? row.media[0] : row.media;

      let postStatus: ScheduledPost["status"] = "scheduled";
      if (row.status === "processing") postStatus = "processing";
      else if (row.status === "published") postStatus = "published";
      else if (row.status === "failed") postStatus = "error";
      else if (row.status === "cancelled") postStatus = "cancelled";

      return {
        id: row.id,
        userId: row.user_id,
        accountId: row.instagram_account_id,
        accountUsername: igAcc?.username || "",
        accountAvatar: igAcc?.profile_picture_url || "",
        type: (row.post_type === "carousel" ? "carousel" : "reel") as ScheduledPost["type"],
        title: media?.original_name || (row.post_type === "carousel" ? "Carrossel Agendado" : "Reel Agendado"),
        caption: row.caption || "",
        scheduledAt: row.scheduled_at,
        thumbnailUrl: media?.thumbnail_url || "",
        status: postStatus,
        queueId: row.queue_id || undefined,
        history: [
          {
            timestamp: row.scheduled_at,
            message: "Agendamento registrado",
            state: postStatus,
          },
        ],
      };
    });

    return NextResponse.json({ success: true, posts });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

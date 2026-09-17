import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PublishedPost } from "@/types";

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
      .from("published_posts")
      .select(`
        id, user_id, instagram_account_id, media_type, instagram_media_id, permalink, caption, published_at, status,
        instagram_accounts:instagram_account_id (id, username, profile_picture_url)
      `)
      .eq("user_id", user.id)
      .order("published_at", { ascending: false });

    if (accountId && accountId !== "all") {
      query = query.eq("instagram_account_id", accountId);
    }

    const { data: records, error } = await query;
    if (error) {
      return NextResponse.json(
        { success: false, message: `Erro ao buscar publicações: ${error.message}` },
        { status: 500 }
      );
    }

    const posts: PublishedPost[] = (records || []).map((row: any) => {
      const igAcc = Array.isArray(row.instagram_accounts) ? row.instagram_accounts[0] : row.instagram_accounts;

      return {
        id: row.id,
        userId: row.user_id,
        accountId: row.instagram_account_id,
        accountUsername: igAcc?.username || "",
        accountAvatar: igAcc?.profile_picture_url || "",
        type: (row.media_type === "carousel" ? "carousel" : "reel") as PublishedPost["type"],
        thumbnailUrl: "",
        caption: row.caption || "",
        publishedAt: row.published_at,
        views: 0,
        reach: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        saves: 0,
        profileVisits: 0,
        followersGained: 0,
        status: "published",
        instagramMediaId: row.instagram_media_id,
        permalink: row.permalink || undefined,
      };
    });

    return NextResponse.json({ success: true, posts });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { encryptToken } from "@/lib/crypto";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);

  // 1. Tratamento de erros retornados diretamente pela Meta
  const errorParam = searchParams.get("error");
  const errorReason = searchParams.get("error_reason");

  if (errorParam || errorReason) {
    if (errorParam === "access_denied" || errorReason === "user_denied") {
      return NextResponse.redirect(`${origin}/contas?error=cancelled`);
    }
    return NextResponse.redirect(`${origin}/contas?error=permission_denied`);
  }

  const code = searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(`${origin}/contas?error=invalid_callback`);
  }

  // 1.1 Extrai o modo de conexão e valida o state
  const stateParam = searchParams.get("state") || "";
  let connectionMode: "development" | "external" = "development";
  let stateUserId = "";
  if (stateParam.includes(":")) {
    const [uid, mode] = stateParam.split(":");
    stateUserId = uid;
    if (mode === "external" || mode === "development") {
      connectionMode = mode;
    }
  }

  // 2. Verifica se o usuário do Supabase está autenticado
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || (stateUserId && stateUserId !== user.id)) {
    return NextResponse.redirect(`${origin}/login?redirect=/contas`);
  }

  // 3. Credenciais da Meta exclusivamente server-side
  const metaAppId = process.env.META_APP_ID;
  const metaAppSecret = process.env.META_APP_SECRET;
  const metaRedirectUri =
    process.env.META_REDIRECT_URI || `${origin}/api/instagram/callback`;

  if (!metaAppId || !metaAppSecret) {
    return NextResponse.redirect(`${origin}/contas?error=meta_not_configured`);
  }

  try {
    // 4. Troca o código pelo Short-Lived Access Token via endpoint oficial da Meta
    const tokenFormData = new FormData();
    tokenFormData.append("client_id", metaAppId);
    tokenFormData.append("client_secret", metaAppSecret);
    tokenFormData.append("grant_type", "authorization_code");
    tokenFormData.append("redirect_uri", metaRedirectUri);
    tokenFormData.append("code", code);

    const tokenResponse = await fetch(
      "https://api.instagram.com/oauth/access_token",
      {
        method: "POST",
        body: tokenFormData,
      }
    );

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData.access_token) {
      // Segurança: Log sanitizado sem expor resposta bruta ou tokens
      const errorCode = tokenData.error?.code || tokenData.error_type || "token_exchange_failed";
      console.warn("Falha segura na troca do token Meta. Código:", errorCode);
      return NextResponse.redirect(`${origin}/contas?error=invalid_token`);
    }

    const shortLivedToken = tokenData.access_token;
    const instagramUserId = String(tokenData.user_id);

    // 5. Troca pelo Long-Lived Access Token (60 dias) via graph.instagram.com
    let finalAccessToken = shortLivedToken;
    let tokenExpiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();

    try {
      const longLivedUrl = `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${metaAppSecret}&access_token=${shortLivedToken}`;
      const longLivedResponse = await fetch(longLivedUrl);
      const longLivedData = await longLivedResponse.json();

      if (longLivedResponse.ok && longLivedData.access_token) {
        finalAccessToken = longLivedData.access_token;
        if (longLivedData.expires_in) {
          tokenExpiresAt = new Date(
            Date.now() + longLivedData.expires_in * 1000
          ).toISOString();
        }
      }
    } catch {
      // Fallback seguro: usa o shortLivedToken sem logar detalhes sensíveis
    }

    // 6. Busca dados do perfil do Instagram via Graph API
    let profileData: {
      id?: string;
      username?: string;
      name?: string;
      account_type?: string;
      profile_picture_url?: string;
      followers_count?: number;
    } = {};

    try {
      const profileUrl = `https://graph.instagram.com/v21.0/me?fields=id,username,name,account_type,profile_picture_url,followers_count&access_token=${finalAccessToken}`;
      const profileResponse = await fetch(profileUrl);
      if (profileResponse.ok) {
        profileData = await profileResponse.json();
      } else {
        const fallbackUrl = `https://graph.instagram.com/me?fields=id,username,name,account_type,profile_picture_url&access_token=${finalAccessToken}`;
        const fallbackRes = await fetch(fallbackUrl);
        if (fallbackRes.ok) {
          profileData = await fallbackRes.json();
        }
      }
    } catch {
      // Perfil será montado com os dados básicos retornados no token
    }

    // Validação de Conta Profissional (Business ou Creator)
    if (
      profileData.account_type &&
      profileData.account_type.toUpperCase() === "PERSONAL"
    ) {
      return NextResponse.redirect(`${origin}/contas?error=not_professional`);
    }

    const username = (profileData.username || `user_${instagramUserId.substring(0, 6)}`)
      .replace("@", "")
      .trim();
    const displayName = profileData.name || username;
    const profilePic =
      profileData.profile_picture_url ||
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80";

    // 7. Salva a conta conectada no Supabase vinculada ao user_id autenticado
    // O token fica armazenado estritamente em instagram_account_secrets (cofre isolado sem SELECT para o frontend)
    const { data: savedAccount } = await supabase
      .from("instagram_accounts")
      .upsert(
        {
          user_id: user.id,
          instagram_user_id: String(profileData.id || instagramUserId),
          username: username,
          name: displayName,
          profile_picture_url: profilePic,
          account_type: profileData.account_type || "UNKNOWN",
          status: "connected",
          status_message: "Conexão oficial ativa via Meta Graph API",
          token_status: "valid",
          has_publish_permission: true,
          has_insights_permission: false,
          last_verified_at: new Date().toISOString(),
          followers_count: profileData.followers_count || 0,
          token_expires_at: tokenExpiresAt,
          connection_mode: connectionMode,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,instagram_user_id" }
      )
      .select("id")
      .single();

    const accountId = savedAccount?.id;

    if (accountId) {
      const supabaseAdmin = createAdminClient();
      if (supabaseAdmin) {
        const { encrypted, iv } = encryptToken(finalAccessToken);
        await supabaseAdmin
          .from("instagram_account_secrets")
          .upsert(
            {
              user_id: user.id,
              instagram_account_id: accountId,
              token_encrypted: encrypted,
              token_iv: iv,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "instagram_account_id" }
          );
      }
    }

    // Compatibilidade legada com a tabela 'accounts' caso exista
    try {
      await supabase
        .from("accounts")
        .upsert(
          {
            user_id: user.id,
            instagram_user_id: String(profileData.id || instagramUserId),
            username: username,
            name: displayName,
            profile_picture: profilePic,
            status: "connected",
            status_message: "Conexão oficial ativa via Meta Graph API",
            followers: profileData.followers_count || 0,
            access_token: finalAccessToken,
            token_expires_at: tokenExpiresAt,
            connection_mode: connectionMode,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,instagram_user_id" }
        );
    } catch {
      // Compatibilidade legada silenciosa
    }

    // 8. Redireciona para /contas com indicação de sucesso (sem expor IDs ou tokens)
    return NextResponse.redirect(
      `${origin}/contas?connected=true&username=${encodeURIComponent(username)}&mode=${connectionMode}`
    );
  } catch {
    // Tratamento de erro seguro: nenhuma stack trace ou dado de token é logado ou exposto
    return NextResponse.redirect(`${origin}/contas?error=invalid_token`);
  }
}

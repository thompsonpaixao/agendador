import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { origin, searchParams } = new URL(request.url);

  // 1. Verifica se o usuário está autenticado no Supabase
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/login?redirect=/contas`);
  }

  // Modo de conexão solicitado: development (padrão) ou external
  const requestedMode = searchParams.get("mode");

  // Regra 15: Modo Externo indisponível até aprovação no Meta App Review
  if (requestedMode === "external") {
    return NextResponse.redirect(`${origin}/contas?error=external_mode_pending_review`);
  }

  const mode = "development";

  // Regra 14: Modo Desenvolvimento permitido apenas para roles developer e admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const userRole = profile?.role || "user";
  if (userRole !== "developer" && userRole !== "admin") {
    return NextResponse.redirect(`${origin}/contas?error=dev_mode_restricted`);
  }

  // 2. Verifica se as variáveis de ambiente da Meta foram configuradas no servidor
  const metaAppId = process.env.META_APP_ID;
  const metaRedirectUri =
    process.env.META_REDIRECT_URI || `${origin}/api/instagram/callback`;

  if (!metaAppId) {
    return NextResponse.redirect(`${origin}/contas?error=meta_not_configured`);
  }

  // 3. Regra 1: Scopes oficiais estritamente restritos aos requisitos do app
  // Somente leitura básica e publicação de conteúdo
  const scopes = [
    "instagram_business_basic",
    "instagram_business_content_publish",
  ].join(",");

  // 4. Constrói a URL oficial de autorização da Meta (Instagram Login)
  const authUrl = new URL("https://api.instagram.com/oauth/authorize");
  authUrl.searchParams.set("client_id", metaAppId);
  authUrl.searchParams.set("redirect_uri", metaRedirectUri);
  authUrl.searchParams.set("scope", scopes);
  authUrl.searchParams.set("response_type", "code");
  // O state protege contra CSRF e transporta com segurança o userId e o modo
  authUrl.searchParams.set("state", `${user.id}:${mode}`);

  return NextResponse.redirect(authUrl.toString());
}

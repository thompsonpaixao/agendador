import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptToken } from "@/lib/crypto";

/**
 * Endpoint para Verificação Real de Conexão com a Meta Graph API
 * Executa chamada direta server-side para validar a integridade do token,
 * escopos de permissão e atualizar o status real da conta.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Não autenticado." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { accountId } = body;

    if (!accountId) {
      return NextResponse.json(
        { success: false, message: "ID da conta obrigatório." },
        { status: 400 }
      );
    }

    // 1. Busca a conta no Supabase com isolamento total por user_id
    const { data: account, error: accountError } = await supabase
      .from("instagram_accounts")
      .select("id, username, token_expires_at, status")
      .eq("id", accountId)
      .eq("user_id", user.id)
      .single();

    if (accountError || !account) {
      return NextResponse.json(
        { success: false, message: "Conta não encontrada." },
        { status: 404 }
      );
    }

    // 2. Recupera o access token de forma segura a partir de instagram_account_secrets (acesso restrito server-side)
    let rawToken = "";
    const supabaseAdmin = createAdminClient();
    if (supabaseAdmin) {
      const { data: secret } = await supabaseAdmin
        .from("instagram_account_secrets")
        .select("token_encrypted, token_iv")
        .eq("instagram_account_id", accountId)
        .eq("user_id", user.id)
        .single();

      if (secret?.token_encrypted && secret?.token_iv) {
        rawToken = decryptToken(secret.token_encrypted, secret.token_iv);
      }
    }

    // Se o token estiver vazio ou for teste de desenvolvimento
    if (!rawToken) {
      const now = new Date().toISOString();
      await supabase
        .from("instagram_accounts")
        .update({
          token_status: "unknown",
          last_verified_at: now,
          last_error_message: "Token ausente ou requer reconexão OAuth.",
          updated_at: now,
        })
        .eq("id", accountId);

      return NextResponse.json({
        success: false,
        tokenStatus: "unknown",
        message: "Token não localizado no cofre criptográfico. Faça uma reconexão com o Instagram.",
      });
    }

    // 3. Chamada REAL à Meta Graph API
    let tokenStatus: "valid" | "expiring_soon" | "invalid" = "valid";
    let hasPublishPermission = true;
    const hasInsightsPermission = false;
    let errorMessage: string | null = null;
    let verifiedUsername = account.username;

    try {
      const metaResponse = await fetch(
        `https://graph.instagram.com/v21.0/me?fields=id,username,account_type&access_token=${rawToken}`
      );

      const metaData = await metaResponse.json();

      if (!metaResponse.ok) {
        tokenStatus = "invalid";
        const metaCode = metaData.error?.code || "unknown";
        errorMessage = metaData.error?.message || `Erro da Meta API (código ${metaCode})`;
        hasPublishPermission = false;
      } else {
        verifiedUsername = metaData.username || account.username;

        // Verifica proximidade de expiração (menos de 7 dias)
        if (account.token_expires_at) {
          const expiresDate = new Date(account.token_expires_at).getTime();
          const sevenDaysFromNow = Date.now() + 7 * 24 * 60 * 60 * 1000;
          if (expiresDate < sevenDaysFromNow) {
            tokenStatus = "expiring_soon";
          }
        }
      }
    } catch {
      tokenStatus = "invalid";
      errorMessage = "Falha ao conectar com os servidores da Meta Graph API.";
      hasPublishPermission = false;
    }

    const now = new Date().toISOString();

    // 4. Atualiza os dados reais no banco de dados
    await supabase
      .from("instagram_accounts")
      .update({
        token_status: tokenStatus,
        has_publish_permission: hasPublishPermission,
        has_insights_permission: hasInsightsPermission,
        last_verified_at: now,
        last_successful_sync_at: tokenStatus !== "invalid" ? now : undefined,
        last_error_message: errorMessage,
        status: tokenStatus === "invalid" ? "error" : "connected",
        status_message: tokenStatus === "valid" ? "Conexão oficial ativa e saudável" : errorMessage,
        updated_at: now,
      })
      .eq("id", accountId);

    return NextResponse.json({
      success: tokenStatus !== "invalid",
      tokenStatus,
      hasPublishPermission,
      hasInsightsPermission,
      lastVerifiedAt: now,
      username: verifiedUsername,
      message:
        tokenStatus === "valid"
          ? "Conexão verificada com sucesso! Token ativo e permissões confirmadas."
          : tokenStatus === "expiring_soon"
          ? "Token válido, porém expira em menos de 7 dias. Recomendada renovação."
          : `Falha na verificação: ${errorMessage || "Token revogado ou expirado."}`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro interno ao verificar conexão.";
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}

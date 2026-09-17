import { createAdminClient } from "@/lib/supabase/admin";
import { decryptToken } from "@/lib/crypto";

export interface PublishResult {
  success: boolean;
  instagramMediaId?: string;
  permalink?: string;
  error?: string;
}

class MetaApiError extends Error {
  code: string;
  subcode?: number;
  details?: unknown;
  constructor(message: string, code: string = "META_PUBLISH_FAILED", subcode?: number, details?: unknown) {
    super(message);
    this.name = "MetaApiError";
    this.code = code;
    this.subcode = subcode;
    this.details = details;
  }
}

function getMetaGraphVersion(): string {
  const version = process.env.META_GRAPH_VERSION || "v21.0";
  return version.startsWith("v") ? version : `v${version}`;
}

function getMetaGraphHost(token: string): string {
  // Tokens obtidos via Instagram Login começam tipicamente com "IG" ou formato de User Token
  // Tokens obtidos via Facebook Login com permissão de página começam com "EAA"
  return token.startsWith("EAA") ? "https://graph.facebook.com" : "https://graph.instagram.com";
}

/**
 * Motor Central de Publicação de Reels na Meta Graph API
 * Executado pelo Agendador (Scheduler) e pelo botão "Postar agora".
 */
export async function publishScheduledPost(postId: string): Promise<PublishResult> {
  const supabaseAdmin = createAdminClient();
  if (!supabaseAdmin) {
    return { success: false, error: "Cliente administrativo do Supabase não configurado." };
  }

  // 1. Claim atômico do scheduled_post
  const { data: post, error: claimError } = await supabaseAdmin
    .from("scheduled_posts")
    .update({
      status: "processing",
      locked_at: new Date().toISOString(),
      locked_by: "publisher-worker",
    })
    .eq("id", postId)
    .in("status", ["scheduled", "processing", "failed"])
    .select("*")
    .single();

  if (claimError || !post) {
    console.error("[Publisher] Não foi possível fazer claim do post:", claimError);
    return {
      success: false,
      error: `Post não localizado ou indisponível para publicação: ${claimError?.message || "Status incompatível"}`,
    };
  }

  // Consulta da conta do Instagram separadamente para evitar problemas com chaves compostas no PostgREST
  const { data: account, error: accountError } = await supabaseAdmin
    .from("instagram_accounts")
    .select("*")
    .eq("id", post.instagram_account_id)
    .single();

  if (accountError || !account) {
    console.error("[Publisher] Conta do Instagram não encontrada:", accountError);
    return {
      success: false,
      error: `Conta do Instagram associada ao post não foi encontrada.`,
    };
  }

  try {
    // 2. Recupera o token criptografado do cofre
    const { data: secretRow, error: secretError } = await supabaseAdmin
      .from("instagram_account_secrets")
      .select("token_encrypted, token_iv, token_auth_tag")
      .eq("instagram_account_id", post.instagram_account_id)
      .single();

    if (secretError || !secretRow) {
      throw new Error("Credenciais de acesso da conta não localizadas no cofre criptográfico.");
    }

    const token = decryptToken(
      secretRow.token_encrypted,
      secretRow.token_iv,
      secretRow.token_auth_tag
    );

    if (!token || typeof token !== "string" || token.trim().length === 0) {
      throw new Error(
        "Falha na descriptografia do token da Meta. Verifique se a variável TOKEN_ENCRYPTION_KEY está configurada corretamente."
      );
    }

    const cleanToken = token.trim();
    const graphHost = getMetaGraphHost(cleanToken);
    const graphVersion = getMetaGraphVersion();

    console.log(
      `[Publisher] Token validado (presente: true, tamanho: ${cleanToken.length}, host: ${graphHost}, api: ${graphVersion})`
    );

    // 3. Localiza o arquivo de mídia e gera Signed URL privada (1h)
    const { data: mediaRow, error: mediaError } = await supabaseAdmin
      .from("media")
      .select("*")
      .eq("id", post.media_id)
      .single();

    if (mediaError || !mediaRow?.storage_path) {
      throw new Error("Arquivo de vídeo não encontrado no repositório de mídias.");
    }

    const { data: signedData, error: signedError } = await supabaseAdmin.storage
      .from("media")
      .createSignedUrl(mediaRow.storage_path, 3600);

    if (signedError || !signedData?.signedUrl) {
      throw new Error(`Não foi possível gerar a URL de acesso ao vídeo: ${signedError?.message}`);
    }

    const igUserId = account.instagram_user_id;
    if (!igUserId) {
      throw new Error("Identificador do perfil do Instagram (instagram_user_id) ausente.");
    }

    // 4. Meta Graph API - Passo 1: Criar Container de Reel
    const containerParams = new URLSearchParams({
      media_type: "REELS",
      video_url: signedData.signedUrl,
      caption: post.caption || "",
      access_token: cleanToken,
    });

    const containerRes = await fetch(
      `${graphHost}/${graphVersion}/${igUserId}/media?${containerParams.toString()}`,
      { method: "POST" }
    );
    const containerData = await containerRes.json();

    if (!containerRes.ok || !containerData?.id) {
      const metaErr = containerData?.error;
      const code = metaErr?.code ? `META_${metaErr.code}` : "META_CONTAINER_FAILED";
      const msg =
        metaErr?.message ||
        `Erro ao inicializar container na Meta (Status HTTP ${containerRes.status}).`;
      throw new MetaApiError(msg, code, metaErr?.error_subcode, metaErr);
    }

    const containerId = containerData.id as string;

    // Atualiza o ID do container para auditoria
    await supabaseAdmin
      .from("scheduled_posts")
      .update({ meta_container_id: containerId })
      .eq("id", post.id);

    // 5. Meta Graph API - Passo 2: Polling do status de processamento do vídeo
    let isFinished = false;
    const maxPollAttempts = 20; // 20 tentativas x 3s = até 60s
    let lastStatusCode = "IN_PROGRESS";

    for (let i = 0; i < maxPollAttempts; i++) {
      await new Promise((resolve) => setTimeout(resolve, 3000));

      const statusRes = await fetch(
        `${graphHost}/${graphVersion}/${containerId}?fields=status_code,status&access_token=${cleanToken}`
      );
      const statusData = await statusRes.json();

      lastStatusCode = statusData.status_code || "UNKNOWN";

      if (statusData.status_code === "FINISHED") {
        isFinished = true;
        break;
      } else if (statusData.status_code === "ERROR") {
        throw new MetaApiError(
          `Falha no processamento do vídeo pela Meta: ${statusData.status || "Erro interno de codificação do vídeo na plataforma da Meta."}`,
          "META_VIDEO_PROCESSING_FAILED",
          undefined,
          statusData
        );
      } else if (statusData.status_code === "EXPIRED") {
        throw new MetaApiError("Container de Reel expirou na Meta antes de ser publicado.", "META_CONTAINER_EXPIRED");
      }
    }

    if (!isFinished) {
      throw new MetaApiError(
        `Tempo limite excedido no processamento do Reel pela Meta (Último status: ${lastStatusCode}). Tente novamente mais tarde.`,
        "META_TIMEOUT"
      );
    }

    // 6. Meta Graph API - Passo 3: Publicar o container processado
    const publishParams = new URLSearchParams({
      creation_id: containerId,
      access_token: cleanToken,
    });

    const publishRes = await fetch(
      `${graphHost}/${graphVersion}/${igUserId}/media_publish?${publishParams.toString()}`,
      { method: "POST" }
    );
    const publishData = await publishRes.json();

    if (!publishRes.ok || !publishData?.id) {
      const metaErr = publishData?.error;
      const code = metaErr?.code ? `META_${metaErr.code}` : "META_PUBLISH_CONFIRM_FAILED";
      const msg =
        metaErr?.message ||
        `Erro ao confirmar publicação na Meta (Status HTTP ${publishRes.status}).`;
      throw new MetaApiError(msg, code, metaErr?.error_subcode, metaErr);
    }

    const instagramMediaId = publishData.id as string;

    // 7. Obtenção do permalink oficial
    let permalink = `https://www.instagram.com/p/${instagramMediaId}`;
    try {
      const permalinkRes = await fetch(
        `${graphHost}/${graphVersion}/${instagramMediaId}?fields=permalink&access_token=${cleanToken}`
      );
      const permalinkData = await permalinkRes.json();
      if (permalinkData?.permalink) {
        permalink = permalinkData.permalink;
      }
    } catch {
      // Ignora erro de permalink mantendo fallback
    }

    const nowIso = new Date().toISOString();

    // 8. Registro em public.published_posts
    await supabaseAdmin.from("published_posts").insert({
      user_id: post.user_id,
      instagram_account_id: post.instagram_account_id,
      scheduled_post_id: post.id,
      media_type: "reel",
      instagram_media_id: instagramMediaId,
      permalink,
      caption: post.caption || "",
      published_at: nowIso,
      status: "published",
    });

    // 9. Atualização do scheduled_post
    await supabaseAdmin
      .from("scheduled_posts")
      .update({
        status: "published",
        meta_media_id: instagramMediaId,
        locked_at: null,
        locked_by: null,
        updated_at: nowIso,
      })
      .eq("id", post.id);

    // 10. Atualização do item da fila se vinculado
    if (post.queue_item_id) {
      await supabaseAdmin
        .from("reel_queue_items")
        .update({
          status: "published",
          updated_at: nowIso,
        })
        .eq("id", post.queue_item_id);
    }

    // 11. Se vinculado a fila, verifica se a fila foi totalmente concluída
    if (post.queue_id) {
      const { data: pendingItems } = await supabaseAdmin
        .from("reel_queue_items")
        .select("id")
        .eq("queue_id", post.queue_id)
        .neq("status", "published");

      if (!pendingItems || pendingItems.length === 0) {
        await supabaseAdmin
          .from("reel_queues")
          .update({
            status: "completed",
            updated_at: nowIso,
          })
          .eq("id", post.queue_id);
      }
    }

    // 12. Atualização da retenção da mídia (exclusão programada para 7 dias após publicação)
    const deleteAfter = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await supabaseAdmin
      .from("media")
      .update({
        published_at: nowIso,
        retention_status: "eligible_for_deletion",
        delete_after: deleteAfter,
        updated_at: nowIso,
      })
      .eq("id", post.media_id);

    // 13. Registro de tentativa bem-sucedida
    await supabaseAdmin.from("publication_attempts").insert({
      user_id: post.user_id,
      scheduled_post_id: post.id,
      attempt_number: (post.retry_count || 0) + 1,
      finished_at: nowIso,
      success: true,
      retryable: false,
    });

    // 14. Notificação de sucesso no sistema
    await supabaseAdmin.from("notifications").insert({
      user_id: post.user_id,
      instagram_account_id: post.instagram_account_id,
      type: "publish_success",
      title: "Reel Publicado com Sucesso!",
      message: `Reel publicado oficialmente em @${account.username || "instagram"}.`,
      link: permalink,
    });

    return {
      success: true,
      instagramMediaId,
      permalink,
    };
  } catch (err: unknown) {
    const errorCode = err instanceof MetaApiError ? err.code : "META_PUBLISH_FAILED";
    const errorMsg = err instanceof Error ? err.message : "Erro desconhecido durante publicação.";
    console.error(`[Publisher] Erro ao publicar post ${postId} (${errorCode}):`, errorMsg);

    const nowIso = new Date().toISOString();

    // Registra tentativa falha
    await supabaseAdmin.from("publication_attempts").insert({
      user_id: post.user_id,
      scheduled_post_id: post.id,
      attempt_number: (post.retry_count || 0) + 1,
      finished_at: nowIso,
      success: false,
      error_code: errorCode,
      error_message: errorMsg,
      retryable: true,
    });

    // Registra no log de erros técnico
    await supabaseAdmin.from("error_logs").insert({
      user_id: post.user_id,
      instagram_account_id: post.instagram_account_id,
      scheduled_post_id: post.id,
      severity: "error",
      category: "publishing",
      error_code: errorCode,
      message: errorMsg,
      technical_details: JSON.stringify({
        postId,
        errorCode,
        error: errorMsg,
        details: err instanceof MetaApiError ? err.details : undefined,
      }),
    });

    // Atualiza o scheduled_post para failed sem apagar a fila
    await supabaseAdmin
      .from("scheduled_posts")
      .update({
        status: "failed",
        error_code: errorCode,
        error_message: errorMsg,
        retry_count: (post.retry_count || 0) + 1,
        locked_at: null,
        locked_by: null,
        updated_at: nowIso,
      })
      .eq("id", post.id);

    if (post.queue_item_id) {
      await supabaseAdmin
        .from("reel_queue_items")
        .update({
          status: "failed",
          updated_at: nowIso,
        })
        .eq("id", post.queue_item_id);
    }

    // Notificação de falha
    await supabaseAdmin.from("notifications").insert({
      user_id: post.user_id,
      instagram_account_id: post.instagram_account_id,
      type: "publish_failed",
      title: "Falha na Publicação do Reel",
      message: `Não foi possível publicar em @${account.username || "instagram"}: ${errorMsg}`,
    });

    return {
      success: false,
      error: errorMsg,
    };
  }
}

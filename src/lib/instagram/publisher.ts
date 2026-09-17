import { createAdminClient } from "@/lib/supabase/admin";
import { decryptToken } from "@/lib/crypto";

export interface PublishResult {
  success: boolean;
  instagramMediaId?: string;
  permalink?: string;
  error?: string;
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
    .select("*, instagram_accounts(*)")
    .single();

  if (claimError || !post) {
    console.error("[Publisher] Não foi possível fazer claim do post:", claimError);
    return {
      success: false,
      error: `Post não localizado ou indisponível para publicação: ${claimError?.message || "Status incompatível"}`,
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

    if (!token) {
      throw new Error(
        "Falha na descriptografia do token da Meta. Verifique se a variável TOKEN_ENCRYPTION_KEY está configurada corretamente."
      );
    }

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

    const igUserId = post.instagram_accounts?.instagram_user_id;
    if (!igUserId) {
      throw new Error("Identificador do perfil do Instagram (instagram_user_id) ausente.");
    }

    // 4. Meta Graph API - Passo 1: Criar Container de Reel
    const containerParams = new URLSearchParams({
      media_type: "REELS",
      video_url: signedData.signedUrl,
      caption: post.caption || "",
      access_token: token,
    });

    const containerRes = await fetch(
      `https://graph.facebook.com/v21.0/${igUserId}/media?${containerParams.toString()}`,
      { method: "POST" }
    );
    const containerData = await containerRes.json();

    if (!containerRes.ok || !containerData?.id) {
      const msg =
        containerData?.error?.message ||
        `Erro ao inicializar container na Meta (Status HTTP ${containerRes.status}).`;
      throw new Error(msg);
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
        `https://graph.facebook.com/v21.0/${containerId}?fields=status_code,status&access_token=${token}`
      );
      const statusData = await statusRes.json();

      lastStatusCode = statusData.status_code || "UNKNOWN";

      if (statusData.status_code === "FINISHED") {
        isFinished = true;
        break;
      } else if (statusData.status_code === "ERROR") {
        throw new Error(
          `Falha no processamento do vídeo pela Meta: ${statusData.status || "Erro interno de codificação do vídeo na plataforma da Meta."}`
        );
      } else if (statusData.status_code === "EXPIRED") {
        throw new Error("Container de Reel expirou na Meta antes de ser publicado.");
      }
    }

    if (!isFinished) {
      throw new Error(
        `Tempo limite excedido no processamento do Reel pela Meta (Último status: ${lastStatusCode}). Tente novamente mais tarde.`
      );
    }

    // 6. Meta Graph API - Passo 3: Publicar o container processado
    const publishParams = new URLSearchParams({
      creation_id: containerId,
      access_token: token,
    });

    const publishRes = await fetch(
      `https://graph.facebook.com/v21.0/${igUserId}/media_publish?${publishParams.toString()}`,
      { method: "POST" }
    );
    const publishData = await publishRes.json();

    if (!publishRes.ok || !publishData?.id) {
      const msg =
        publishData?.error?.message ||
        `Erro ao confirmar publicação na Meta (Status HTTP ${publishRes.status}).`;
      throw new Error(msg);
    }

    const instagramMediaId = publishData.id as string;

    // 7. Obtenção do permalink oficial
    let permalink = `https://www.instagram.com/p/${instagramMediaId}`;
    try {
      const permalinkRes = await fetch(
        `https://graph.facebook.com/v21.0/${instagramMediaId}?fields=permalink&access_token=${token}`
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
      message: `Reel publicado oficialmente em @${post.instagram_accounts?.username || "instagram"}.`,
      link: permalink,
    });

    return {
      success: true,
      instagramMediaId,
      permalink,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Erro desconhecido durante publicação.";
    console.error(`[Publisher] Erro ao publicar post ${postId}:`, errorMsg);

    const nowIso = new Date().toISOString();

    // Registra tentativa falha
    await supabaseAdmin.from("publication_attempts").insert({
      user_id: post.user_id,
      scheduled_post_id: post.id,
      attempt_number: (post.retry_count || 0) + 1,
      finished_at: nowIso,
      success: false,
      error_code: "META_PUBLISH_FAILED",
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
      error_code: "META_PUBLISH_FAILED",
      message: errorMsg,
      technical_details: JSON.stringify({ postId, error: errorMsg }),
    });

    // Atualiza o scheduled_post para failed sem apagar a fila
    await supabaseAdmin
      .from("scheduled_posts")
      .update({
        status: "failed",
        error_code: "META_PUBLISH_FAILED",
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
      message: `Não foi possível publicar em @${post.instagram_accounts?.username || "instagram"}: ${errorMsg}`,
    });

    return {
      success: false,
      error: errorMsg,
    };
  }
}

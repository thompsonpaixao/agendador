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

    const igUserId = account.instagram_user_id;
    if (!igUserId) {
      throw new Error("Identificador do perfil do Instagram (instagram_user_id) ausente.");
    }

    let instagramMediaId = "";

    // 4. Fluxo de Publicação de acordo com o tipo: Reel vs Carrossel
    if (post.post_type === "carousel") {
      // 4A. PUBLICAÇÃO DE CARROSSEL DE MÚLTIPLAS IMAGENS/VÍDEOS
      const carouselId = post.carousel_id;
      if (!carouselId) {
        throw new Error("Agendamento de carrossel sem identificador de carrossel (carousel_id).");
      }

      // Busca os itens do carrossel em ordem de posição
      const { data: carouselItems, error: itemsErr } = await supabaseAdmin
        .from("carousel_items")
        .select("id, media_id, position")
        .eq("carousel_id", carouselId)
        .order("position", { ascending: true });

      if (itemsErr || !carouselItems || carouselItems.length < 2) {
        throw new Error("O carrossel precisa ter no mínimo 2 slides para publicação na Meta.");
      }

      // Busca as mídias dos slides
      const slideMediaIds = carouselItems.map((ci) => ci.media_id);
      const { data: slideMedias, error: slideMediasErr } = await supabaseAdmin
        .from("media")
        .select("*")
        .in("id", slideMediaIds);

      if (slideMediasErr || !slideMedias || slideMedias.length !== slideMediaIds.length) {
        throw new Error("Um ou mais slides do carrossel não foram encontrados no repositório de mídias.");
      }

      const slideMediaMap = new Map(slideMedias.map((m) => [m.id, m]));
      const childrenContainerIds: string[] = [];

      // Cria um container para cada slide (is_carousel_item = true)
      for (const item of carouselItems) {
        const sm = slideMediaMap.get(item.media_id);
        if (!sm?.storage_path) {
          throw new Error(`Arquivo do slide #${item.position + 1} não localizado.`);
        }

        const { data: slideSigned, error: slideSignedErr } = await supabaseAdmin.storage
          .from("media")
          .createSignedUrl(sm.storage_path, 3600);

        if (slideSignedErr || !slideSigned?.signedUrl) {
          throw new Error(`Falha ao gerar URL de acesso para o slide #${item.position + 1}.`);
        }

        const isVideo = sm.media_type === "video";
        const itemParams = new URLSearchParams({
          is_carousel_item: "true",
          access_token: cleanToken,
        });

        if (isVideo) {
          itemParams.set("media_type", "VIDEO");
          itemParams.set("video_url", slideSigned.signedUrl);
        } else {
          itemParams.set("image_url", slideSigned.signedUrl);
        }

        const itemRes = await fetch(
          `${graphHost}/${graphVersion}/${igUserId}/media?${itemParams.toString()}`,
          { method: "POST" }
        );
        const itemData = await itemRes.json();

        if (!itemRes.ok || !itemData?.id) {
          const metaErr = itemData?.error;
          throw new MetaApiError(
            metaErr?.message || `Falha ao criar item do carrossel para o slide #${item.position + 1}.`,
            metaErr?.code ? `META_${metaErr.code}` : "META_CAROUSEL_ITEM_FAILED",
            metaErr?.error_subcode,
            itemData
          );
        }

        childrenContainerIds.push(itemData.id as string);
      }

      // Cria o container pai do Carrossel com os IDs dos itens filhos
      const carouselContainerParams = new URLSearchParams({
        media_type: "CAROUSEL",
        children: childrenContainerIds.join(","),
        caption: post.caption || "",
        access_token: cleanToken,
      });

      const carouselContainerRes = await fetch(
        `${graphHost}/${graphVersion}/${igUserId}/media?${carouselContainerParams.toString()}`,
        { method: "POST" }
      );
      const carouselContainerData = await carouselContainerRes.json();

      if (!carouselContainerRes.ok || !carouselContainerData?.id) {
        const metaErr = carouselContainerData?.error;
        throw new MetaApiError(
          metaErr?.message || "Falha ao criar container principal do carrossel.",
          metaErr?.code ? `META_${metaErr.code}` : "META_CAROUSEL_CONTAINER_FAILED",
          metaErr?.error_subcode,
          carouselContainerData
        );
      }

      const carouselContainerId = carouselContainerData.id as string;

      // Confirma a publicação do Carrossel
      const publishParams = new URLSearchParams({
        creation_id: carouselContainerId,
        access_token: cleanToken,
      });

      const publishRes = await fetch(
        `${graphHost}/${graphVersion}/${igUserId}/media_publish?${publishParams.toString()}`,
        { method: "POST" }
      );
      const publishData = await publishRes.json();

      if (!publishRes.ok || !publishData?.id) {
        const metaErr = publishData?.error;
        throw new MetaApiError(
          metaErr?.message || "Falha ao confirmar publicação do carrossel na Meta.",
          metaErr?.code ? `META_${metaErr.code}` : "META_CAROUSEL_PUBLISH_FAILED",
          metaErr?.error_subcode,
          publishData
        );
      }

      instagramMediaId = publishData.id as string;

      // Atualiza o status do carrossel na tabela public.carousels
      await supabaseAdmin
        .from("carousels")
        .update({ status: "published", updated_at: new Date().toISOString() })
        .eq("id", carouselId);

    } else {
      // 4B. PUBLICAÇÃO DE REEL (VÍDEO INDIVIDUAL)
      if (!post.media_id) {
        throw new Error("Agendamento de Reel sem identificador de mídia (media_id).");
      }

      // Localiza o arquivo de mídia e gera Signed URL privada (1h)
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

      // Meta Graph API - Passo 1: Criar Container de Reel
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

      // Meta Graph API - Passo 2: Polling do status de processamento do vídeo
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

      // Meta Graph API - Passo 3: Publicar o container processado
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

      instagramMediaId = publishData.id as string;
    }

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
      media_type: post.post_type === "carousel" ? "carousel" : "reel",
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

    // 11. Se vinculado a fila, verifica se a fila foi totalmente finalizada
    if (post.queue_id) {
      const { data: allQueueItems } = await supabaseAdmin
        .from("reel_queue_items")
        .select("id, status")
        .eq("queue_id", post.queue_id);

      if (allQueueItems && allQueueItems.length > 0) {
        const remainingNonFinal = allQueueItems.filter((it: any) =>
          ["pending", "scheduled", "processing"].includes(it.status)
        );

        if (remainingNonFinal.length === 0) {
          await supabaseAdmin
            .from("reel_queues")
            .update({
              status: "completed",
              updated_at: nowIso,
            })
            .eq("id", post.queue_id);
        }
      }
    }

    // 12. Atualização da retenção da mídia (exclusão programada para 7 dias após publicação)
    const deleteAfter = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    if (post.post_type === "carousel" && post.carousel_id) {
      const { data: cItems } = await supabaseAdmin
        .from("carousel_items")
        .select("media_id")
        .eq("carousel_id", post.carousel_id);
      const cMediaIds = (cItems || []).map((ci) => ci.media_id);
      if (cMediaIds.length > 0) {
        await supabaseAdmin
          .from("media")
          .update({
            published_at: nowIso,
            retention_status: "eligible_for_deletion",
            delete_after: deleteAfter,
            updated_at: nowIso,
          })
          .in("id", cMediaIds);
      }
    } else if (post.media_id) {
      await supabaseAdmin
        .from("media")
        .update({
          published_at: nowIso,
          retention_status: "eligible_for_deletion",
          delete_after: deleteAfter,
          updated_at: nowIso,
        })
        .eq("id", post.media_id);
    }

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
    const postTypeName = post.post_type === "carousel" ? "Carrossel" : "Reel";
    await supabaseAdmin.from("notifications").insert({
      user_id: post.user_id,
      instagram_account_id: post.instagram_account_id,
      type: "publish_success",
      title: `${postTypeName} Publicado com Sucesso!`,
      message: `${postTypeName} publicado oficialmente em @${account.username || "instagram"}.`,
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

    // Se vinculado a fila, verifica se a fila terminou mesmo com esta falha
    if (post.queue_id) {
      const { data: allQueueItems } = await supabaseAdmin
        .from("reel_queue_items")
        .select("id, status")
        .eq("queue_id", post.queue_id);

      if (allQueueItems && allQueueItems.length > 0) {
        const remainingNonFinal = allQueueItems.filter((it: any) =>
          ["pending", "scheduled", "processing"].includes(it.status)
        );

        if (remainingNonFinal.length === 0) {
          await supabaseAdmin
            .from("reel_queues")
            .update({
              status: "completed",
              updated_at: nowIso,
            })
            .eq("id", post.queue_id);
        }
      }
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

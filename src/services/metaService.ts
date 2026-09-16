/**
 * Camada de Serviço para a Meta Graph API (Instagram Content Publishing API)
 *
 * NOTA DE ARQUITETURA E SEGURANÇA:
 * Chamadas reais à Meta devem ser realizadas exclusivamente no servidor (Route Handlers / Server Actions)
 * utilizando tokens de longa duração protegidos por variáveis de ambiente.
 */

export interface MetaContainerResponse {
  id: string;
  status_code?: "EXPIRED" | "ERROR" | "FINISHED" | "IN_PROGRESS";
}

export interface MetaPublishResponse {
  id: string;
}

export class MetaService {
  /**
   * Passo 1 do fluxo oficial da Meta: Cria o container de mídia (Reel ou Carrossel)
   */
  static async createMediaContainer(params: {
    instagramAccountId: string;
    videoUrl?: string;
    imageUrl?: string;
    caption: string;
    mediaType: "REELS" | "CAROUSEL" | "IMAGE";
    children?: string[]; // IDs de containers filhos para carrosséis
  }): Promise<MetaContainerResponse> {
    // Chamada simulada
    console.log("[MetaService Mock] Criando container de mídia para:", params.instagramAccountId);
    return {
      id: `meta_container_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      status_code: "FINISHED",
    };
  }

  /**
   * Passo 2: Verifica o status de processamento do container
   */
  static async checkContainerStatus(containerId: string): Promise<"FINISHED" | "IN_PROGRESS" | "ERROR"> {
    console.log("[MetaService Mock] Verificando status do container:", containerId);
    return "FINISHED";
  }

  /**
   * Passo 3: Publica o container previamente processado
   */
  static async publishContainer(params: {
    instagramAccountId: string;
    creationId: string;
  }): Promise<MetaPublishResponse> {
    console.log("[MetaService Mock] Disparando publicação oficial do container:", params.creationId);
    return {
      id: `ig_media_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    };
  }

  /**
   * Testa a validade do Token de Acesso da Meta
   */
  static async validateToken(accessToken: string): Promise<{ valid: boolean; expiresAt?: string; scopes?: string[] }> {
    console.log("[MetaService Mock] Validando token de acesso (oculto)");
    return {
      valid: Boolean(accessToken),
      expiresAt: "2026-12-31T23:59:59Z",
      scopes: ["instagram_basic", "instagram_content_publish", "pages_show_list"],
    };
  }
}

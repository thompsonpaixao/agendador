/**
 * Camada de Serviço para Armazenamento de Mídia (Cloudflare R2 / Supabase Storage)
 */

export interface UploadResult {
  publicUrl: string;
  storageKey: string;
  sizeBytes: number;
}

export class StorageService {
  static async uploadMedia(file: File): Promise<UploadResult> {
    console.log("[StorageService Mock] Fazendo upload do arquivo:", file.name, file.size);
    // Em produção, isso gera uma Pre-signed URL para upload direto
    return {
      publicUrl: URL.createObjectURL(file),
      storageKey: `media/${Date.now()}_${file.name}`,
      sizeBytes: file.size,
    };
  }

  static async getStorageUsage(): Promise<{ usedBytes: number; totalFiles: number; provider: string }> {
    return {
      usedBytes: 42_949_672_960, // 40 GB
      totalFiles: 4850,
      provider: "Cloudflare R2 / Supabase Storage",
    };
  }
}

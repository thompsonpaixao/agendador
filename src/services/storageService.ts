/**
 * Camada de Serviço para Armazenamento de Mídia
 */

export interface UploadResult {
  publicUrl: string;
  storageKey: string;
  sizeBytes: number;
}

export class StorageService {
  static async uploadMedia(file: File): Promise<UploadResult> {
    return {
      publicUrl: URL.createObjectURL(file),
      storageKey: `media/${Date.now()}_${file.name}`,
      sizeBytes: file.size,
    };
  }

  static async getStorageUsage(): Promise<{ usedBytes: number; totalFiles: number; provider: string }> {
    return {
      usedBytes: 0,
      totalFiles: 0,
      provider: "Não configurado",
    };
  }
}

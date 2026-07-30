// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Phase 5 Integration 4: Storage Provider Adapter Interface (Adapter Pattern)
// ============================================================================

export interface StorageUploadParams {
  filename: string;
  folder: string;
  buffer: Buffer;
  mimeType: string;
}

export interface StorageUploadResult {
  success: boolean;
  providerName: string;
  storagePath: string;
  fileSizeBytes: number;
  publicUrl: string;
}

export interface IStorageProvider {
  readonly providerName: string;

  uploadFile(params: StorageUploadParams): Promise<StorageUploadResult>;
  generateExpiringUrl(storagePath: string, expirySeconds: number): Promise<string>;
  deleteFile(storagePath: string): Promise<boolean>;
}

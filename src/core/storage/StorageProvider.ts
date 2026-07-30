/**
 * Storage Provider Abstraction
 * Location: /src/core/storage/StorageProvider.ts
 * Decouples attachment engine from underlying storage providers (Supabase, S3, R2, Local).
 */

export interface IStorageProvider {
  uploadFile(file: File | Blob, path: string): Promise<{ url: string; sizeBytes: number }>;
  deleteFile(path: string): Promise<boolean>;
  getPublicUrl(path: string): string;
}

export class WebLocalStorageProvider implements IStorageProvider {
  public async uploadFile(file: File | Blob, path: string): Promise<{ url: string; sizeBytes: number }> {
    const fakeUrl = `https://cdn.maha-agri.org/attachments/${path}`;
    return { url: fakeUrl, sizeBytes: file.size || 102400 };
  }

  public async deleteFile(path: string): Promise<boolean> {
    return true;
  }

  public getPublicUrl(path: string): string {
    return `https://cdn.maha-agri.org/attachments/${path}`;
  }
}

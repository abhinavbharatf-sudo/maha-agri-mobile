// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Integration 4: Local Storage Provider Adapter Implementation
// ============================================================================

import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { IStorageProvider, StorageUploadParams, StorageUploadResult } from './storage.adapter.interface';

@Injectable()
export class LocalStorageProvider implements IStorageProvider {
  readonly providerName = 'LOCAL_STORAGE';
  private readonly logger = new Logger(LocalStorageProvider.name);
  private readonly uploadDir = path.join(process.cwd(), 'vault_storage');

  constructor() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async uploadFile(params: StorageUploadParams): Promise<StorageUploadResult> {
    const targetFolder = path.join(this.uploadDir, params.folder);
    if (!fs.existsSync(targetFolder)) {
      fs.mkdirSync(targetFolder, { recursive: true });
    }

    const filePath = path.join(targetFolder, params.filename);
    fs.writeFileSync(filePath, params.buffer);

    const relativePath = path.join(params.folder, params.filename).replace(/\\/g, '/');
    const publicUrl = `http://localhost:4000/vault/${relativePath}`;

    this.logger.log(`[${this.providerName}] File stored at ${filePath} (${params.buffer.length} bytes)`);

    return {
      success: true,
      providerName: this.providerName,
      storagePath: relativePath,
      fileSizeBytes: params.buffer.length,
      publicUrl,
    };
  }

  async generateExpiringUrl(storagePath: string, expirySeconds: number): Promise<string> {
    const token = `signed_token_${Date.now()}_expires_${Date.now() + expirySeconds * 1000}`;
    return `http://localhost:4000/vault/${storagePath}?token=${token}`;
  }

  async deleteFile(storagePath: string): Promise<boolean> {
    const fullPath = path.join(this.uploadDir, storagePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      return true;
    }
    return false;
  }
}

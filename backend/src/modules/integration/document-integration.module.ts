// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Integration 4: Document Integration Module Assembly
// ============================================================================

import { Module } from '@nestjs/common';
import { LocalStorageProvider } from './adapters/storage/local-storage.adapter';
import { DocumentEngineService } from './services/document-engine.service';
import { DocumentIntegrationController } from './controllers/document-integration.controller';

@Module({
  controllers: [DocumentIntegrationController],
  providers: [LocalStorageProvider, DocumentEngineService],
  exports: [DocumentEngineService],
})
export class DocumentIntegrationModule {}

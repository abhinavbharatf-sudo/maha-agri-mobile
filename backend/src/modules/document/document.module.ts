// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Module 12: Document Vault Module Assembly
// ============================================================================

import { Module } from '@nestjs/common';
import { DocumentController } from './document.controller';
import { DocumentVaultService } from './document.service';

@Module({
  controllers: [DocumentController],
  providers: [DocumentVaultService],
  exports: [DocumentVaultService],
})
export class DocumentModule {}

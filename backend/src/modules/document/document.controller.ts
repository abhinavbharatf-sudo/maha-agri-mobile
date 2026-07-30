// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Module 12: Document Vault Controller (/api/v1/documents)
// ============================================================================

import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { DocumentVaultService } from './document.service';

@Controller('api/v1/documents')
export class DocumentController {
  constructor(private readonly documentService: DocumentVaultService) {}

  @Get()
  async getDocuments() {
    return this.documentService.getDocuments();
  }

  @Get(':id')
  async getDocumentById(@Param('id') id: string) {
    return this.documentService.getDocumentById(id);
  }

  @Post('sign')
  async signDocument(@Body() body: { documentId: string; signerUserId: string }) {
    return this.documentService.signDocument(body);
  }
}

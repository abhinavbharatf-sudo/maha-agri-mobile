// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Integration 4: Document Controller (/api/v1/integration/documents)
// ============================================================================

import { Controller, Post, Get, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { DocumentEngineService, SupportedDocumentType } from '../services/document-engine.service';

export class GenerateDocumentDto {
  documentType!: SupportedDocumentType;
  entityId!: string;
  title!: string;
  payload!: Record<string, any>;
  requestedByUserId!: string;
}

@Controller('api/v1/integration/documents')
export class DocumentIntegrationController {
  constructor(private readonly documentEngineService: DocumentEngineService) {}

  @Post('generate')
  @HttpCode(HttpStatus.CREATED)
  async generateDocument(@Body() body: GenerateDocumentDto) {
    return this.documentEngineService.generateDocument(body);
  }

  @Get('verify/:qrCode')
  async verifyQrCode(@Param('qrCode') qrCode: string) {
    return this.documentEngineService.verifyQrCode(qrCode);
  }

  @Get('download-url/:id')
  async getExpiringDownloadUrl(@Param('id') id: string, @Query('expiry') expiry?: string) {
    const expirySeconds = expiry ? parseInt(expiry, 10) : 300;
    return this.documentEngineService.getExpiringDownloadUrl(id, expirySeconds);
  }
}

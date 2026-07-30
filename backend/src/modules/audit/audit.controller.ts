// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Module 13: Audit & Security Logging Controller (/api/v1/audit)
// ============================================================================

import { Controller, Get, Post, Body } from '@nestjs/common';
import { AuditService } from './audit.service';

@Controller('api/v1/audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('logs')
  async getAuditLogs() {
    return this.auditService.getAuditLogs();
  }

  @Post('logs')
  async recordAudit(@Body() body: any) {
    return this.auditService.recordAudit(body);
  }
}

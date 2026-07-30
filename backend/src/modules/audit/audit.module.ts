// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Module 13: Audit & Security Logging Module Assembly
// ============================================================================

import { Module } from '@nestjs/common';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';

@Module({
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}

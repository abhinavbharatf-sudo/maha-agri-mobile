// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Phase D Enterprise Security & Compliance Module Assembly
// ============================================================================

import { Module } from '@nestjs/common';
import { SecurityComplianceService } from './services/security-compliance.service';
import { SecurityReadinessService } from './services/security-readiness.service';
import { SecurityAssuranceController } from './controllers/security-assurance.controller';

@Module({
  controllers: [SecurityAssuranceController],
  providers: [SecurityComplianceService, SecurityReadinessService],
  exports: [SecurityComplianceService, SecurityReadinessService],
})
export class SecurityAssuranceModule {}

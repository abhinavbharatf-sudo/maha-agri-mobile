// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Phase D Enterprise Security & Compliance Controller (/api/v1/security)
// ============================================================================

import { Controller, Get, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { SecurityComplianceService } from '../services/security-compliance.service';
import { SecurityReadinessService } from '../services/security-readiness.service';

@Controller('api/v1/security')
export class SecurityAssuranceController {
  constructor(
    private readonly complianceService: SecurityComplianceService,
    private readonly readinessService: SecurityReadinessService,
  ) {}

  @Get('dashboard-metrics')
  async getSecurityDashboardMetrics() {
    return this.complianceService.getSecurityDashboardMetrics();
  }

  @Get('compliance-status')
  async getComplianceStatus() {
    return this.complianceService.getComplianceStatus();
  }

  @Post('statewide-certifications/generate')
  @HttpCode(HttpStatus.OK)
  async generateStatewideProductionCertification() {
    return this.readinessService.generateStatewideProductionCertification();
  }
}

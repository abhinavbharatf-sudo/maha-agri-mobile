// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Module 14: Operational Analytics Controller (/api/v1/analytics)
// ============================================================================

import { Controller, Get } from '@nestjs/common';
import { OperationalAnalyticsService } from './analytics.service';

@Controller('api/v1/analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: OperationalAnalyticsService) {}

  @Get('kpis')
  async getKpis() {
    return this.analyticsService.getKpis();
  }

  @Get('districts')
  async getDistrictPerformance() {
    return this.analyticsService.getDistrictPerformance();
  }
}

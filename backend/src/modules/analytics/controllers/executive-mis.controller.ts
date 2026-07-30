// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Executive MIS Controller (/api/v1/mis)
// Read-Only Statewide Command & Control REST Endpoints
// ============================================================================

import { Controller, Get, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ExecutiveMisService } from '../services/executive-mis.service';

@Controller('api/v1/mis')
export class ExecutiveMisController {
  constructor(private readonly misService: ExecutiveMisService) {}

  @Get('state-command-center')
  @HttpCode(HttpStatus.OK)
  async getStateCommandMetrics() {
    return this.misService.getStateCommandMetrics();
  }

  @Get('soil-intelligence')
  async getSoilIntelligenceMetrics() {
    return this.misService.getSoilIntelligenceMetrics();
  }

  @Get('drone-dashboard')
  async getDroneDashboardMetrics() {
    return this.misService.getDroneDashboardMetrics();
  }

  @Get('workforce-dashboard')
  async getWorkforceDashboardMetrics() {
    return this.misService.getWorkforceDashboardMetrics();
  }

  @Get('gis-command-center')
  async getGisCommandCenterMetrics() {
    return this.misService.getGisCommandCenterMetrics();
  }

  @Get('farmer-journey/:farmerCode')
  async getFarmerServiceJourneyAnalytics(@Param('farmerCode') farmerCode: string) {
    return this.misService.getFarmerServiceJourneyAnalytics(farmerCode);
  }

  @Get('alerts')
  async getSystemAlerts() {
    return this.misService.getSystemAlerts();
  }
}

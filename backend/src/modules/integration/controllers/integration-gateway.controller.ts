// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Phase E Enterprise Integration Controller (/api/v1/integration)
// ============================================================================

import { Controller, Get } from '@nestjs/common';
import { IntegrationGatewayService } from '../services/integration-gateway.service';
import { IntegrationEcosystemService } from '../services/integration-ecosystem.service';

@Controller('api/v1/integration')
export class IntegrationGatewayController {
  constructor(
    private readonly gatewayService: IntegrationGatewayService,
    private readonly ecosystemService: IntegrationEcosystemService,
  ) {}

  @Get('partners')
  async getRegisteredPartners() {
    return this.gatewayService.getRegisteredPartners();
  }

  @Get('gis-layers')
  async getGisMapLayers() {
    return this.gatewayService.getGisMapLayers();
  }

  @Get('ecosystem-analytics')
  async getEcosystemAnalytics() {
    return this.ecosystemService.getEcosystemAnalytics();
  }
}

// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Phase E Enterprise Integration Module Assembly
// ============================================================================

import { Module } from '@nestjs/common';
import { IntegrationGatewayService } from './services/integration-gateway.service';
import { IntegrationEcosystemService } from './services/integration-ecosystem.service';
import { IntegrationGatewayController } from './controllers/integration-gateway.controller';

@Module({
  controllers: [IntegrationGatewayController],
  providers: [IntegrationGatewayService, IntegrationEcosystemService],
  exports: [IntegrationGatewayService, IntegrationEcosystemService],
})
export class EnterpriseIntegrationModule {}

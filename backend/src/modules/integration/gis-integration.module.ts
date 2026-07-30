// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Integration 7: GIS Integration Module Assembly
// ============================================================================

import { Module } from '@nestjs/common';
import { OpenStreetMapProvider } from './adapters/gis/openstreetmap.adapter';
import { GisSpatialService } from './services/gis-spatial.service';
import { GisIntegrationController } from './controllers/gis-integration.controller';

@Module({
  controllers: [GisIntegrationController],
  providers: [OpenStreetMapProvider, GisSpatialService],
  exports: [GisSpatialService, OpenStreetMapProvider],
})
export class GisIntegrationModule {}

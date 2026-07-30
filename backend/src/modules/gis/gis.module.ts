// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Module 15: GIS & Spatial Module Assembly
// ============================================================================

import { Module } from '@nestjs/common';
import { GisSpatialController } from './gis.controller';
import { GisSpatialService } from './gis.service';

@Module({
  controllers: [GisSpatialController],
  providers: [GisSpatialService],
  exports: [GisSpatialService],
})
export class GisModule {}

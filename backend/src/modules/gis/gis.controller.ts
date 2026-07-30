// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Module 15: GIS & Spatial Services Controller (/api/v1/gis)
// ============================================================================

import { Controller, Get, Param } from '@nestjs/common';
import { GisSpatialService } from './gis.service';

@Controller('api/v1/gis')
export class GisSpatialController {
  constructor(private readonly gisService: GisSpatialService) {}

  @Get('parcels/:id')
  async getLandBoundary(@Param('id') id: string) {
    return this.gisService.getLandBoundary(id);
  }

  @Get('drone-paths/:missionId')
  async getDroneFlightPath(@Param('missionId') missionId: string) {
    return this.gisService.getDroneFlightPath(missionId);
  }
}

// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Integration 7: GIS Controller (/api/v1/integration/gis)
// ============================================================================

import { Controller, Post, Get, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { GisSpatialService } from '../services/gis-spatial.service';
import { GeoPoint, DroneRouteParams } from '../adapters/gis/map.adapter.interface';

export class ReverseGeocodeDto {
  latitude!: number;
  longitude!: number;
}

export class ValidatePolygonDto {
  polygonPoints!: GeoPoint[];
}

@Controller('api/v1/integration/gis')
export class GisIntegrationController {
  constructor(private readonly gisService: GisSpatialService) {}

  @Post('geocode/reverse')
  @HttpCode(HttpStatus.OK)
  async reverseGeocode(@Body() body: ReverseGeocodeDto) {
    return this.gisService.reverseGeocode(body.latitude, body.longitude);
  }

  @Post('polygon/validate')
  @HttpCode(HttpStatus.OK)
  async validatePolygon(@Body() body: ValidatePolygonDto) {
    return this.gisService.validatePolygon(body.polygonPoints);
  }

  @Post('drone/route')
  @HttpCode(HttpStatus.OK)
  async optimizeDroneRoute(@Body() body: DroneRouteParams) {
    return this.gisService.optimizeDroneRoute(body);
  }

  @Get('heatmaps/soil')
  async getSoilHealthHeatmap(@Query('districtId') districtId: string) {
    return this.gisService.getSoilHealthHeatmap(districtId || 'DIST-PUNE-001');
  }
}

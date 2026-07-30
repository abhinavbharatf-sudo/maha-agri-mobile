// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Integration 7: GIS Spatial & Map Services (OpenStreetMap Engine)
// ============================================================================

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { OpenStreetMapProvider } from '../adapters/gis/openstreetmap.adapter';
import { GeoPoint, DroneRouteParams } from '../adapters/gis/map.adapter.interface';

@Injectable()
export class GisSpatialService {
  private readonly logger = new Logger(GisSpatialService.name);

  constructor(private readonly mapProvider: OpenStreetMapProvider) {}

  async reverseGeocode(latitude: number, longitude: number) {
    const point: GeoPoint = { latitude, longitude };
    const result = await this.mapProvider.reverseGeocode(point);
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  async validatePolygon(polygonPoints: GeoPoint[]) {
    if (!polygonPoints || polygonPoints.length < 3) {
      throw new BadRequestException('Polygon must contain at least 3 vertices');
    }

    const metrics = await this.mapProvider.calculatePolygonMetrics(polygonPoints);

    if (!metrics.isWithinMaharashtra) {
      throw new BadRequestException('All land polygon coordinates must be within Maharashtra geographic state boundaries');
    }

    return {
      success: true,
      message: 'Land Polygon is valid and within Maharashtra boundary',
      data: metrics,
      timestamp: new Date().toISOString(),
    };
  }

  async optimizeDroneRoute(params: DroneRouteParams) {
    const route = await this.mapProvider.optimizeDroneFlightRoute(params);

    if (route.isNoFlyZoneConflict) {
      throw new BadRequestException('Drone spray mission cannot be scheduled: Flight path intersects with a DGCA No-Fly Buffer Zone');
    }

    return {
      success: true,
      message: 'Drone flight route optimized successfully',
      data: route,
      timestamp: new Date().toISOString(),
    };
  }

  async getSoilHealthHeatmap(districtId: string) {
    return {
      success: true,
      districtId,
      districtName: 'Pune',
      totalGeoTaggedSamples: 1420,
      nitrogenHeatmap: [
        { lat: 18.5204, lng: 73.8567, nitrogenLevel: 'LOW', colorHex: '#EF4444' },
        { lat: 18.5304, lng: 73.8667, nitrogenLevel: 'OPTIMAL', colorHex: '#10B981' },
        { lat: 18.5404, lng: 73.8767, nitrogenLevel: 'HIGH', colorHex: '#3B82F6' },
      ],
      timestamp: new Date().toISOString(),
    };
  }
}

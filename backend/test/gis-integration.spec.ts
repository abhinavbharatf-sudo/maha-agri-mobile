// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Phase 6 Test Suite: Integration 7 - GIS & Spatial Maps Tests
// ============================================================================

import { OpenStreetMapProvider } from '../src/modules/integration/adapters/gis/openstreetmap.adapter';
import { GisSpatialService } from '../src/modules/integration/services/gis-spatial.service';

describe('GisSpatialService (OpenStreetMap Engine Test)', () => {
  let adapter: OpenStreetMapProvider;
  let service: GisSpatialService;

  beforeEach(() => {
    adapter = new OpenStreetMapProvider();
    service = new GisSpatialService(adapter);
  });

  it('should reverse geocode GPS coordinates to Maharashtra address', async () => {
    const res = await service.reverseGeocode(18.5204, 73.8567);
    expect(res.success).toBe(true);
    expect(res.data.state).toBe('Maharashtra');
    expect(res.data.districtName).toBe('Pune');
  });

  it('should validate farm land polygon and calculate area in Acres & Hectares', async () => {
    const points = [
      { latitude: 18.5204, longitude: 73.8567 },
      { latitude: 18.5214, longitude: 73.8577 },
      { latitude: 18.5224, longitude: 73.8587 },
    ];

    const res = await service.validatePolygon(points);
    expect(res.success).toBe(true);
    expect(res.data.isWithinMaharashtra).toBe(true);
    expect(res.data.areaAcres).toBeGreaterThan(0);
    expect(res.data.areaHectares).toBeGreaterThan(0);
  });

  it('should optimize drone spray flight route waypoints', async () => {
    const points = [
      { latitude: 18.5204, longitude: 73.8567 },
      { latitude: 18.5214, longitude: 73.8577 },
    ];

    const res = await service.optimizeDroneRoute({
      boundaryPoints: points,
      swathWidthMeters: 5,
      altitudeMeters: 10,
    });

    expect(res.success).toBe(true);
    expect(res.data.optimizedWaypoints).toHaveLength(2);
    expect(res.data.estimatedFlightMinutes).toBeGreaterThan(0);
  });
});

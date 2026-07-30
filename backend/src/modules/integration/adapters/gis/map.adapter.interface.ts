// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Phase 5 Integration 7: Map Provider Adapter Interface (Adapter Pattern)
// ============================================================================

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  formattedAddress: string;
  villageName?: string;
  talukaName?: string;
  districtName?: string;
  state: string;
  pincode?: string;
}

export interface PolygonValidationResult {
  isValidPolygon: boolean;
  isWithinMaharashtra: boolean;
  areaAcres: number;
  areaHectares: number;
  perimeterMeters: number;
  centroid: GeoPoint;
}

export interface DroneRouteParams {
  boundaryPoints: GeoPoint[];
  swathWidthMeters: number;
  altitudeMeters: number;
}

export interface DroneRouteResult {
  success: boolean;
  optimizedWaypoints: GeoPoint[];
  totalFlightDistanceMeters: number;
  estimatedFlightMinutes: number;
  isNoFlyZoneConflict: boolean;
}

export interface IMapProvider {
  readonly providerName: string;

  reverseGeocode(point: GeoPoint): Promise<GeocodeResult>;
  forwardGeocode(address: string): Promise<GeocodeResult>;
  calculatePolygonMetrics(polygonPoints: GeoPoint[]): Promise<PolygonValidationResult>;
  optimizeDroneFlightRoute(params: DroneRouteParams): Promise<DroneRouteResult>;
}

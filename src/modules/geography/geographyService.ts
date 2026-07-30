/**
 * MAHA-AGRIDOOT Geographic Administration Service (Phase 3)
 * Governs 36 Districts, 358 Talukas, and LGD-synced Villages across Maharashtra.
 */

export interface District {
  district_id: string;
  district_name: string;
  census_code: string;
}

export interface Taluka {
  taluka_id: string;
  district_id: string;
  taluka_name: string;
  census_code: string;
}

export interface Village {
  village_id: string;
  taluka_id: string;
  village_name: string;
  lgd_code: string;
}

// Master baseline data for Maharashtra's key agricultural districts
export const MAHARASHTRA_DISTRICTS: District[] = [
  { district_id: 'DIST_WARDHA', district_name: 'Wardha', census_code: '27504' },
  { district_id: 'DIST_NAGPUR', district_name: 'Nagpur', census_code: '27505' },
  { district_id: 'DIST_AMRAVATI', district_name: 'Amravati', census_code: '27503' },
  { district_id: 'DIST_NASHIK', district_name: 'Nashik', census_code: '27515' },
  { district_id: 'DIST_PUNE', district_name: 'Pune', census_code: '27521' },
  { district_id: 'DIST_AURANGABAD', district_name: 'Chhatrapati Sambhajinagar', census_code: '27514' },
  { district_id: 'DIST_KOLHAPUR', district_name: 'Kolhapur', census_code: '27530' },
  { district_id: 'DIST_SOLAPUR', district_name: 'Solapur', census_code: '27524' }
];

export const MAHARASHTRA_TALUKAS: Taluka[] = [
  { taluka_id: 'TAL_WARDHA', district_id: 'DIST_WARDHA', taluka_name: 'Wardha', census_code: '2750401' },
  { taluka_id: 'TAL_HINGANGHAT', district_id: 'DIST_WARDHA', taluka_name: 'Hinganghat', census_code: '2750402' },
  { taluka_id: 'TAL_ARVI', district_id: 'DIST_WARDHA', taluka_name: 'Arvi', census_code: '2750403' },
  { taluka_id: 'TAL_SELOO', district_id: 'DIST_WARDHA', taluka_name: 'Seloo', census_code: '2750404' },
  { taluka_id: 'TAL_NAGPUR_RURAL', district_id: 'DIST_NAGPUR', taluka_name: 'Nagpur Rural', census_code: '2750501' },
  { taluka_id: 'TAL_AMRAVATI', district_id: 'DIST_AMRAVATI', taluka_name: 'Amravati', census_code: '2750301' }
];

export const MAHARASHTRA_VILLAGES: Village[] = [
  { village_id: 'VIL_SEVAGRAM', taluka_id: 'TAL_WARDHA', village_name: 'Sevagram', lgd_code: '534101' },
  { village_id: 'VIL_PAUNAR', taluka_id: 'TAL_WARDHA', village_name: 'Paunar', lgd_code: '534102' },
  { village_id: 'VIL_WADNER', taluka_id: 'TAL_HINGANGHAT', village_name: 'Wadner', lgd_code: '534103' },
  { village_id: 'VIL_ROHNA', taluka_id: 'TAL_ARVI', village_name: 'Rohna', lgd_code: '534104' }
];

export function getDistricts(): District[] {
  return MAHARASHTRA_DISTRICTS;
}

export function getTalukasByDistrict(districtId: string): Taluka[] {
  return MAHARASHTRA_TALUKAS.filter(t => t.district_id === districtId);
}

export function getVillagesByTaluka(talukaId: string): Village[] {
  return MAHARASHTRA_VILLAGES.filter(v => v.taluka_id === talukaId);
}

/**
 * Validates GPS Haversine distance in meters to enforce <= 15m geofencing.
 */
export function calculateGeofenceDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export function isGeofenceValid(
  userLat: number,
  userLng: number,
  targetLat: number,
  targetLng: number,
  maxRadiusMeters: number = 15.0
): boolean {
  const distance = calculateGeofenceDistanceMeters(userLat, userLng, targetLat, targetLng);
  return distance <= maxRadiusMeters;
}

/**
 * MAHA-AGRIDOOT Soil Testing & Health Card (SHC) Service (Phase 8)
 * Manages Geotagged Soil Sampling (<= 15m), Laboratory NPK Diagnostics & Soil Health Cards.
 */

import { isGeofenceValid } from '../geography/geographyService';

export interface SoilSample {
  sample_id: string;
  sample_code: string;
  farmer_id: string;
  parcel_id: string;
  collector_officer_id: string;
  collection_latitude: number;
  collection_longitude: number;
  collection_date: string;
  status: 'COLLECTED' | 'IN_LAB' | 'ANALYZED' | 'COMPLETED';
}

export interface SoilHealthCard {
  shc_id: string;
  sample_id: string;
  ph_level: number;
  nitrogen_kg_ha: number;
  phosphorus_kg_ha: number;
  potassium_kg_ha: number;
  organic_carbon_percent: number;
  recommendation_text: string;
  issued_at: string;
}

/**
 * Log Geotagged Soil Sample Collection
 */
export function collectSoilSample(
  farmerId: string,
  parcelId: string,
  officerId: string,
  userLat: number,
  userLng: number,
  parcelLat: number,
  parcelLng: number
): SoilSample {
  const isGeofenceOK = isGeofenceValid(userLat, userLng, parcelLat, parcelLng, 15.0);
  if (!isGeofenceOK) {
    throw new Error('Soil Collection Failed: Officer location is outside parcel boundary (<= 15m).');
  }

  return {
    sample_id: `SMP_${Date.now()}`,
    sample_code: `SOIL-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    farmer_id: farmerId,
    parcel_id: parcelId,
    collector_officer_id: officerId,
    collection_latitude: userLat,
    collection_longitude: userLng,
    collection_date: new Date().toISOString().split('T')[0],
    status: 'COLLECTED'
  };
}

/**
 * Auto-generate Soil Health Card (SHC) with Dosage Recommendations
 */
export function generateSoilHealthCard(
  sampleId: string,
  ph: number,
  nitrogen: number,
  phosphorus: number,
  potassium: number,
  organicCarbon: number
): SoilHealthCard {
  let rec = 'Soil N-P-K levels are optimal for Cotton & Soybean crops.';
  if (nitrogen < 250) {
    rec = 'Low Nitrogen detected. Apply 120 kg/ha Urea split into 3 doses.';
  } else if (phosphorus < 15) {
    rec = 'Phosphorus deficiency detected. Apply 60 kg/ha Single Super Phosphate (SSP).';
  }

  return {
    shc_id: `SHC_${Date.now()}`,
    sample_id: sampleId,
    ph_level: ph,
    nitrogen_kg_ha: nitrogen,
    phosphorus_kg_ha: phosphorus,
    potassium_kg_ha: potassium,
    organic_carbon_percent: organicCarbon,
    recommendation_text: rec,
    issued_at: new Date().toISOString()
  };
}

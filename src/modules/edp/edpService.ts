/**
 * MAHA-AGRIDOOT EDP Entrepreneur Operating System (Phase 5)
 * Manages 17-Stage Candidate Lifecycle, Cohort Batches, 8-Stage Asset Engine & AI Risk Scoring.
 */

import { isGeofenceValid } from '../geography/geographyService';

export type EntrepreneurStage =
  | 'REGISTRATION'
  | 'APPLICATION'
  | 'DOC_UPLOAD'
  | 'ELIGIBILITY_VERIFIED'
  | 'BACKGROUND_CHECK'
  | 'INTERVIEW'
  | 'PROVISIONAL_SELECTION'
  | 'TRAINING_ENROLLED'
  | 'CLASSROOM_MODULES'
  | 'FIELD_PRACTICAL'
  | 'EXAMINATION'
  | 'CERTIFICATION'
  | 'SUBSIDY_SANCTION'
  | 'ASSET_PROCUREMENT'
  | 'ACTIVATION'
  | 'ACTIVE_OPERATIONS'
  | 'PERFORMANCE_AUDIT';

export type AssetStage =
  | 'SANCTIONED'
  | 'PURCHASED'
  | 'INSPECTED'
  | 'COMMISSIONED'
  | 'ACTIVE_OPERATION'
  | 'AMC_MAINTENANCE'
  | 'REPLACEMENT'
  | 'DISPOSED';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface EdpApplicant {
  applicant_id: string;
  application_number: string;
  full_name: string;
  mobile_number: string;
  assigned_district_id: string;
  assigned_taluka_id: string;
  entrepreneur_type: 'AGRI_GENERAL' | 'DRONE_SPECIALIST';
  current_stage: EntrepreneurStage;
  risk_score_level: RiskLevel;
}

export interface EdpAsset {
  asset_id: string;
  applicant_id: string;
  serial_number: string;
  asset_type: string;
  stage: AssetStage;
  inspection_latitude?: number;
  inspection_longitude?: number;
}

/**
 * Execute Geotagged Machinery Inspection & Transition Asset to COMMISSIONED
 */
export function inspectAndCommissionAsset(
  asset: EdpAsset,
  userLat: number,
  userLng: number,
  targetLat: number,
  targetLng: number
): EdpAsset {
  const isLocationValid = isGeofenceValid(userLat, userLng, targetLat, targetLng, 15.0);

  if (!isLocationValid) {
    throw new Error('Inspection Failed: Physical GPS location is outside the 15m geotag boundary.');
  }

  return {
    ...asset,
    inspection_latitude: userLat,
    inspection_longitude: userLng,
    stage: 'COMMISSIONED'
  };
}

/**
 * Calculate AI Entrepreneur Risk Score Level
 */
export function calculateEntrepreneurRiskScore(
  monthlyRevenue: number,
  daysIdle: number,
  customerRating: number,
  hasInsurance: boolean
): RiskLevel {
  if (daysIdle >= 30 || !hasInsurance) {
    return 'CRITICAL';
  }
  if (monthlyRevenue < 15000 || customerRating < 3.0) {
    return 'HIGH';
  }
  if (monthlyRevenue < 30000 || customerRating < 4.0) {
    return 'MEDIUM';
  }
  return 'LOW';
}

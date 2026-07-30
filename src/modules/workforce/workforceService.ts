/**
 * MAHA-AGRIDOOT Workforce Operations Engine (Phase 4)
 * Manages 10,000 Field Officers, GPS Attendance (<= 15m), Daily Diaries & Incentive Calculations.
 */

import { isGeofenceValid } from '../geography/geographyService';

export interface WorkforceOfficer {
  officer_id: string;
  employee_code: string;
  full_name: string;
  role: 'STATE_ADMIN' | 'DISTRICT_COORDINATOR' | 'TALUKA_COORDINATOR' | 'MAHA_AGRIDOOT';
  assigned_district_id: string;
  assigned_taluka_id: string;
  status: 'ACTIVE' | 'ON_LEAVE' | 'SUSPENDED' | 'TERMINATED';
  created_at: string;
}

export interface AttendanceRecord {
  attendance_id: string;
  officer_id: string;
  check_in_timestamp: string;
  latitude: number;
  longitude: number;
  is_geofence_verified: boolean;
}

export interface DailyDiaryRecord {
  diary_id: string;
  officer_id: string;
  diary_date: string;
  summary_notes: string;
  farmers_visited: number;
  photo_evidence_url?: string;
}

export interface IncentiveRecord {
  incentive_id: string;
  officer_id: string;
  period_month: string;
  base_target_count: number;
  achieved_count: number;
  incentive_amount: number;
  status: 'CALCULATED' | 'APPROVED' | 'DISBURSED';
}

export interface WorkforceCapacity {
  sanctioned_strength: number;
  active_strength: number;
  vacancy_count: number;
  reserve_workforce: number;
}

export const DEFAULT_WORKFORCE_CAPACITY: WorkforceCapacity = {
  sanctioned_strength: 10000,
  active_strength: 8850,
  vacancy_count: 1150,
  reserve_workforce: 500
};

/**
 * Log Officer Check-in with 15m Geofence Verification
 */
export function recordCheckIn(
  officerId: string,
  userLat: number,
  userLng: number,
  officeLat: number,
  officeLng: number
): AttendanceRecord {
  const geofencePassed = isGeofenceValid(userLat, userLng, officeLat, officeLng, 15.0);
  
  return {
    attendance_id: `ATT_${Date.now()}`,
    officer_id: officerId,
    check_in_timestamp: new Date().toISOString(),
    latitude: userLat,
    longitude: userLng,
    is_geofence_verified: geofencePassed
  };
}

/**
 * Calculate Monthly Incentive Amount
 */
export function calculateMonthlyIncentive(
  officerId: string,
  periodMonth: string,
  targetCount: number,
  achievedCount: number
): IncentiveRecord {
  const bonusPerUnit = 250; // INR per excess farmer service
  const excess = Math.max(0, achievedCount - targetCount);
  const totalIncentive = excess * bonusPerUnit;

  return {
    incentive_id: `INC_${Date.now()}`,
    officer_id: officerId,
    period_month: periodMonth,
    base_target_count: targetCount,
    achieved_count: achievedCount,
    incentive_amount: totalIncentive,
    status: 'CALCULATED'
  };
}

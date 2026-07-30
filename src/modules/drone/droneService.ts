/**
 * MAHA-AGRIDOOT Drone Fleet Operations & Telemetry Service (Phase 6)
 * Manages DGCA UIN Registration, 1-Hz IoT Telemetry, Airspace Geofencing & 50h AMC Lock.
 */

export interface DroneUnit {
  drone_id: string;
  entrepreneur_id: string;
  uin_number: string;
  drone_model: string;
  payload_capacity_liters: number;
  total_flight_hours: number;
  status: 'AVAILABLE' | 'IN_FLIGHT' | 'MAINTENANCE_DUE' | 'DECOMMISSIONED';
}

export interface FlightTelemetryPayload {
  drone_id: string;
  pilot_rpl_number: string;
  latitude: number;
  longitude: number;
  altitude_meters: number;
  speed_ms: number;
  battery_soc_percent: number;
  spray_rate_liters_acre: number;
}

export interface FlightMissionResult {
  flight_id: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'AUTO_RTH_TRIGGERED' | 'REJECTED_RED_ZONE';
  acres_sprayed: number;
  message: string;
}

/**
 * Validate Digital Sky No-Fly Red Zones (e.g. Airport Radius)
 */
export function checkAirspaceGeofence(lat: number, lng: number): boolean {
  // Mock prohibited red zone coordinates (e.g. Nagpur Airport radius)
  const RED_ZONE_LAT = 21.0922;
  const RED_ZONE_LNG = 79.0472;
  const latDiff = Math.abs(lat - RED_ZONE_LAT);
  const lngDiff = Math.abs(lng - RED_ZONE_LNG);

  // If within ~10km radius of airport red zone
  if (latDiff < 0.08 && lngDiff < 0.08) {
    return false; // Prohibited airspace
  }
  return true; // Approved Green Zone
}

/**
 * Process Real-Time 1-Hz IoT Telemetry Stream
 */
export function processFlightTelemetry(payload: FlightTelemetryPayload): FlightMissionResult {
  // Check Airspace Geofence
  const isGreenZone = checkAirspaceGeofence(payload.latitude, payload.longitude);
  if (!isGreenZone) {
    return {
      flight_id: `FLT_${Date.now()}`,
      status: 'REJECTED_RED_ZONE',
      acres_sprayed: 0,
      message: 'Violation: Flight path entered DGCA Prohibited Red Zone airspace!'
    };
  }

  // Check Battery Safety Threshold (< 20% SoC triggers Auto Return-to-Home)
  if (payload.battery_soc_percent < 20.0) {
    return {
      flight_id: `FLT_${Date.now()}`,
      status: 'AUTO_RTH_TRIGGERED',
      acres_sprayed: 2.5,
      message: 'Battery charge below 20%. Triggered automated Return-To-Home (RTH) command.'
    };
  }

  return {
    flight_id: `FLT_${Date.now()}`,
    status: 'IN_PROGRESS',
    acres_sprayed: 5.0,
    message: 'Telemetry nominal. Mission spraying proceeding in Green Zone.'
  };
}

/**
 * Enforce 50-Hour AMC Maintenance Lock
 */
export function checkMaintenanceStatus(drone: DroneUnit): DroneUnit {
  if (drone.total_flight_hours >= 50.0 && drone.status === 'AVAILABLE') {
    return {
      ...drone,
      status: 'MAINTENANCE_DUE'
    };
  }
  return drone;
}

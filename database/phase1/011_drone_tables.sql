-- ============================================================================
-- MAHA-AGRI Government Digital Operations Platform
-- Phase 1 Database Script: 011_drone_tables.sql
-- 
-- Purpose: Drone Fleet, Pilots, Missions, Flight Logs, Maintenance & Spray Operations Tables.
-- Execution Order: 011 / 030
-- Dependencies: 001_extensions.sql, 002_schemas.sql, 003_master_tables.sql, 004_identity_tables.sql, 007_farmer_tables.sql
-- Rollback Notes: DROP TABLE IF EXISTS drone.<table_name> CASCADE;
-- ============================================================================

-- 1. Drones Fleet Master
CREATE TABLE drone.drones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uin_number VARCHAR(50) NOT NULL UNIQUE, -- Unique Identification Number (DGCA)
  model_name VARCHAR(100) NOT NULL,
  manufacturer VARCHAR(100) NOT NULL,
  payload_capacity_liters NUMERIC(5,2) NOT NULL DEFAULT 10.0,
  status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'IN_MISSION', 'MAINTENANCE', 'DECOMMISSIONED')),
  
  -- Mandatory Audit Envelope
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE NULL,
  deleted_by UUID NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  record_version INTEGER NOT NULL DEFAULT 1
);

-- 2. Certified Drone Pilots
CREATE TABLE drone.drone_pilots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES identity.users(id),
  dgca_license_number VARCHAR(50) NOT NULL UNIQUE,
  license_expiry_date DATE NOT NULL,
  flight_experience_hours NUMERIC(8,2) NOT NULL DEFAULT 0.0,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'EXPIRED')),
  
  -- Mandatory Audit Envelope
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE NULL,
  deleted_by UUID NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  record_version INTEGER NOT NULL DEFAULT 1
);

-- 3. Drone Batteries
CREATE TABLE drone.drone_batteries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drone_id UUID NULL REFERENCES drone.drones(id),
  serial_number VARCHAR(50) NOT NULL UNIQUE,
  charge_cycles INTEGER NOT NULL DEFAULT 0,
  health_percentage NUMERIC(5,2) NOT NULL DEFAULT 100.0,
  status VARCHAR(20) NOT NULL DEFAULT 'READY',
  
  -- Mandatory Audit Envelope
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE NULL,
  deleted_by UUID NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  record_version INTEGER NOT NULL DEFAULT 1
);

-- 4. Drone Missions
CREATE TABLE drone.drone_missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_code VARCHAR(50) NOT NULL UNIQUE,
  drone_id UUID NOT NULL REFERENCES drone.drones(id),
  pilot_id UUID NOT NULL REFERENCES drone.drone_pilots(id),
  farmer_id UUID NOT NULL REFERENCES farmer.farmers(id),
  land_parcel_id UUID NOT NULL REFERENCES farmer.farmer_land_parcels(id),
  target_crop_id UUID NULL REFERENCES master.crops(id),
  target_area_acres NUMERIC(8,2) NOT NULL,
  scheduled_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
  
  -- Mandatory Audit Envelope
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE NULL,
  deleted_by UUID NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  record_version INTEGER NOT NULL DEFAULT 1
);

-- 5. Mission Waypoints
CREATE TABLE drone.mission_waypoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES drone.drone_missions(id),
  sequence_order INTEGER NOT NULL,
  latitude NUMERIC(10,8) NOT NULL,
  longitude NUMERIC(11,8) NOT NULL,
  altitude_meters NUMERIC(6,2) NOT NULL DEFAULT 3.0,
  
  -- Mandatory Audit Envelope
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE NULL,
  deleted_by UUID NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  record_version INTEGER NOT NULL DEFAULT 1
);

-- 6. Spray Operations
CREATE TABLE drone.spray_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES drone.drone_missions(id),
  chemical_name VARCHAR(150) NOT NULL,
  dosage_per_acre VARCHAR(50) NOT NULL,
  water_volume_liters NUMERIC(8,2) NOT NULL,
  acres_sprayed NUMERIC(8,2) NOT NULL,
  spray_quality_rating VARCHAR(20) NOT NULL DEFAULT 'OPTIMAL',
  
  -- Mandatory Audit Envelope
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE NULL,
  deleted_by UUID NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  record_version INTEGER NOT NULL DEFAULT 1
);

-- 7. Flight Logs
CREATE TABLE drone.flight_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES drone.drone_missions(id),
  takeoff_time TIMESTAMP WITH TIME ZONE NOT NULL,
  landing_time TIMESTAMP WITH TIME ZONE NOT NULL,
  flight_duration_minutes NUMERIC(6,2) NOT NULL,
  max_altitude_meters NUMERIC(6,2) NOT NULL,
  battery_used_percentage NUMERIC(5,2) NOT NULL,
  telemetry_log_url VARCHAR(500) NULL,
  
  -- Mandatory Audit Envelope
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE NULL,
  deleted_by UUID NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  record_version INTEGER NOT NULL DEFAULT 1
);

-- 8. Maintenance Logs
CREATE TABLE drone.maintenance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drone_id UUID NOT NULL REFERENCES drone.drones(id),
  maintenance_type VARCHAR(50) NOT NULL, -- ROUTINE, REPAIR, PROPELLER_REPLACEMENT
  performed_by VARCHAR(100) NOT NULL,
  maintenance_date DATE NOT NULL,
  cost NUMERIC(10,2) NOT NULL DEFAULT 0.0,
  remarks VARCHAR(250) NULL,
  
  -- Mandatory Audit Envelope
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE NULL,
  deleted_by UUID NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  record_version INTEGER NOT NULL DEFAULT 1
);

-- =============================================================================
-- MODULE 05: MISSION EXECUTION ENGINE (MEE) DDL SCHEMA
-- Mission Engine + Task Engine + GPS Geofencing + Media Evidence + Offline Sync Queue
-- =============================================================================

-- 1. Missions Table
CREATE TABLE IF NOT EXISTS mee_missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_code VARCHAR(32) UNIQUE NOT NULL, -- MSN-2026-00048
  request_code VARCHAR(32) NOT NULL, -- Link to MA-REQ-000155
  case_code VARCHAR(32) NOT NULL, -- Link to CASE-2026-0048
  applicant_upp_id VARCHAR(32) NOT NULL, -- Link to UPP-000000125
  
  service_name VARCHAR(150) NOT NULL,
  assigned_staff_id UUID NOT NULL,
  assigned_staff_name VARCHAR(150) NOT NULL,

  -- State Progression Lifecycle
  status VARCHAR(40) NOT NULL DEFAULT 'SCHEDULED', -- SCHEDULED, IN_PROGRESS, OFFLINE_RECORDED, EVIDENCE_CAPTURED, VERIFIED, COMPLETED
  
  -- Location & Route
  district VARCHAR(50) NOT NULL,
  taluka VARCHAR(50) NOT NULL,
  village VARCHAR(50),
  target_address TEXT,
  gps_latitude NUMERIC(10, 7),
  gps_longitude NUMERIC(10, 7),

  scheduled_date TIMESTAMPTZ NOT NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Sub-Tasks Table
CREATE TABLE IF NOT EXISTS mee_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES mee_missions(id) ON DELETE CASCADE,
  task_name VARCHAR(200) NOT NULL,
  task_sequence INTEGER NOT NULL DEFAULT 1,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  notes TEXT
);

-- 3. Evidence Engine Table
CREATE TABLE IF NOT EXISTS mee_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES mee_missions(id) ON DELETE CASCADE,
  gps_latitude NUMERIC(10, 7) NOT NULL,
  gps_longitude NUMERIC(10, 7) NOT NULL,
  gps_accuracy_meters NUMERIC(5, 2) NOT NULL DEFAULT 3.5,
  
  photo_url TEXT NOT NULL,
  qr_code_data VARCHAR(255),
  digital_signature_url TEXT,
  
  is_verified BOOLEAN NOT NULL DEFAULT TRUE,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Offline Sync Queue Table
CREATE TABLE IF NOT EXISTS mee_offline_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_code VARCHAR(32) NOT NULL,
  payload_json JSONB NOT NULL,
  sync_status VARCHAR(30) NOT NULL DEFAULT 'PENDING', -- PENDING, SYNCED, CONFLICT, FAILED
  retry_count INTEGER NOT NULL DEFAULT 0,
  queued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mee_code ON mee_missions(mission_code);
CREATE INDEX IF NOT EXISTS idx_mee_status ON mee_missions(status);
CREATE INDEX IF NOT EXISTS idx_mee_offline ON mee_offline_queue(sync_status);

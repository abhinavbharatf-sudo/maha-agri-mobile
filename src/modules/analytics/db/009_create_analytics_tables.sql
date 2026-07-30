-- =============================================================================
-- MODULE 09: OPERATIONAL INTELLIGENCE & ANALYTICS PLATFORM (OIAP) DDL SCHEMA
-- Decoupled Event Stream + Configurable KPI Engine + Report Builder + Export Queue
-- =============================================================================

-- 1. Decoupled Event Aggregation Stream Table
CREATE TABLE IF NOT EXISTS oiap_event_stream (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_code VARCHAR(50) NOT NULL, -- EVENT-2026-09012
  event_type VARCHAR(50) NOT NULL, -- core.request_created, core.mission_completed, etc.
  module_source VARCHAR(30) NOT NULL, -- REQUESTS, MISSION, FORMS, WORKFLOW, PAYMENTS
  entity_id VARCHAR(100) NOT NULL,
  payload_json JSONB NOT NULL,
  
  district VARCHAR(50),
  taluka VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Configurable Scheme KPI Definitions Table
CREATE TABLE IF NOT EXISTS oiap_kpi_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_code VARCHAR(30) UNIQUE NOT NULL, -- KPI-SOIL-TURNAROUND, KPI-DRONE-ACRES
  scheme_code VARCHAR(30) NOT NULL,
  kpi_name VARCHAR(150) NOT NULL,
  unit VARCHAR(20) NOT NULL DEFAULT 'COUNT',
  target_threshold NUMERIC(12, 2) NOT NULL DEFAULT 100.00,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Self-Service Custom Report Templates Table
CREATE TABLE IF NOT EXISTS oiap_report_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_code VARCHAR(50) UNIQUE NOT NULL, -- RPT-DISTRICT-WEEKLY
  title VARCHAR(200) NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'OPERATIONAL', -- OPERATIONAL, FINANCIAL, AUDIT, COMPLIANCE
  query_config_json JSONB NOT NULL,
  created_by_name VARCHAR(150) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Background Export Jobs Table
CREATE TABLE IF NOT EXISTS oiap_export_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_code VARCHAR(50) UNIQUE NOT NULL, -- EXP-2026-00412
  report_title VARCHAR(200) NOT NULL,
  export_format VARCHAR(10) NOT NULL DEFAULT 'PDF', -- PDF, EXCEL, CSV
  status VARCHAR(30) NOT NULL DEFAULT 'COMPLETED', -- PENDING, PROCESSING, COMPLETED, FAILED
  file_url TEXT,
  requested_by_name VARCHAR(150) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Automated Scheduled Reports Table
CREATE TABLE IF NOT EXISTS oiap_scheduled_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_code VARCHAR(50) UNIQUE NOT NULL, -- SCHED-DAILY-PUNE
  report_code VARCHAR(50) NOT NULL REFERENCES oiap_report_templates(report_code),
  frequency VARCHAR(20) NOT NULL DEFAULT 'DAILY', -- DAILY, WEEKLY, MONTHLY, QUARTERLY
  recipient_role VARCHAR(50) NOT NULL,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ NOT NULL
);

-- Seed Initial KPIs
INSERT INTO oiap_kpi_definitions (kpi_code, scheme_code, kpi_name, unit, target_threshold)
VALUES
  ('KPI-SOIL-SAMPLES', 'MAHA-AGRI', 'Soil Samples Collected & Tested', 'SAMPLES', 5000.00),
  ('KPI-DRONE-ACRES', 'DRONE_SPRAY', 'Acreage Covered by Drone Spraying', 'ACRES', 2500.00),
  ('KPI-DBT-DISBURSED', 'GOVT_SUBSIDY', 'Total DBT Subsidy Amount Disbursed', 'RUPEES', 10000000.00)
ON CONFLICT (kpi_code) DO NOTHING;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_oiap_evt_type ON oiap_event_stream(event_type);
CREATE INDEX IF NOT EXISTS idx_oiap_evt_src ON oiap_event_stream(module_source);
CREATE INDEX IF NOT EXISTS idx_oiap_exp_status ON oiap_export_jobs(status);

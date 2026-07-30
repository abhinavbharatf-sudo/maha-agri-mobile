-- =============================================================================
-- MODULE 04: UNIVERSAL SERVICE REQUEST ENGINE DDL SCHEMA
-- Standard Service Catalog (SRV001, SRV002, SRV003, SRV004) + Request Processing
-- =============================================================================

-- 1. Standard Service Catalog
CREATE TABLE IF NOT EXISTS service_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_code VARCHAR(30) UNIQUE NOT NULL, -- SRV001, SRV002, SRV003, SRV004
  service_name VARCHAR(150) NOT NULL,
  category VARCHAR(50) NOT NULL, -- AGRICULTURAL_LAB, TECH_INNOVATION, CAPACITY_BUILDING, GOVT_SUBSIDY
  sla_hours INTEGER NOT NULL DEFAULT 48,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed Standard Service Catalog
INSERT INTO service_catalog (service_code, service_name, category, sla_hours)
VALUES 
  ('SRV001', 'Soil Testing Service', 'AGRICULTURAL_LAB', 48),
  ('SRV002', 'Drone Spraying Drive', 'TECH_INNOVATION', 24),
  ('SRV003', 'EDP Skill Registration', 'CAPACITY_BUILDING', 72),
  ('SRV004', 'PMEGP Subsidy Support', 'GOVT_SUBSIDY', 120)
ON CONFLICT (service_code) DO NOTHING;

-- 2. Service Requests Engine
CREATE TABLE IF NOT EXISTS service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_code VARCHAR(32) UNIQUE NOT NULL, -- MA-REQ-000155
  service_code VARCHAR(30) NOT NULL REFERENCES service_catalog(service_code),
  applicant_upp_id VARCHAR(32) NOT NULL, -- Link to Applicant Permanent UPP ID
  
  -- Request State Lifecycle
  status VARCHAR(40) NOT NULL DEFAULT 'SUBMITTED', -- SUBMITTED, ASSIGNED, FIELD_VISIT, LAB_VERIFICATION, APPROVED, COMPLETED, REJECTED
  priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH, CRITICAL
  
  -- Geo Scope & Location
  district VARCHAR(50) NOT NULL,
  taluka VARCHAR(50) NOT NULL,
  village VARCHAR(50),
  
  -- SLA & Escalation Tracking
  sla_deadline TIMESTAMPTZ NOT NULL,
  is_overdue BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Assignment
  assigned_to_user_id UUID,
  assigned_to_name VARCHAR(150),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Status Transition Logs
CREATE TABLE IF NOT EXISTS service_request_status_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  from_status VARCHAR(40) NOT NULL,
  to_status VARCHAR(40) NOT NULL,
  remarks TEXT,
  changed_by UUID,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_req_code ON service_requests(request_code);
CREATE INDEX IF NOT EXISTS idx_req_status ON service_requests(status);
CREATE INDEX IF NOT EXISTS idx_req_upp_id ON service_requests(applicant_upp_id);
CREATE INDEX IF NOT EXISTS idx_req_geo ON service_requests(district, taluka);

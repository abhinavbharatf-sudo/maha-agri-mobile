-- =============================================================================
-- MODULE 06: DYNAMIC FORM PLATFORM (DFP) DDL SCHEMA
-- Forms + Versioning (v1, v2) + 12 Question Types + Submissions & Analytics
-- =============================================================================

-- 1. Form Definitions Table
CREATE TABLE IF NOT EXISTS dfp_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_code VARCHAR(50) NOT NULL, -- FORM-SOIL-01, FORM-INSPECTION-02
  version VARCHAR(20) NOT NULL DEFAULT 'v1.0', -- v1.0, v2.0 (Immutable versioning)
  title VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL DEFAULT 'SURVEY', -- SURVEY, INSPECTION, AUDIT, VERIFICATION, CHECKLIST, FEEDBACK
  
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (form_code, version)
);

-- 2. Form Sections Table
CREATE TABLE IF NOT EXISTS dfp_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES dfp_forms(id) ON DELETE CASCADE,
  section_title VARCHAR(150) NOT NULL,
  section_order INTEGER NOT NULL DEFAULT 1
);

-- 3. Form Questions Table (12 Question Types Supported)
CREATE TABLE IF NOT EXISTS dfp_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES dfp_sections(id) ON DELETE CASCADE,
  question_code VARCHAR(50) NOT NULL,
  question_text TEXT NOT NULL,
  
  -- Question Type (TEXT, NUMBER, DATE, GPS, PHOTO, SIGNATURE, QR_CODE, BARCODE, DROPDOWN, MULTI_SELECT, MATRIX, RATING)
  question_type VARCHAR(30) NOT NULL,
  
  is_required BOOLEAN NOT NULL DEFAULT FALSE,
  options_json JSONB, -- Array of dropdown/multi-select options
  validation_rules_json JSONB, -- Min/max, regex, geofence rules
  conditional_logic_json JSONB, -- Show/hide branching rules
  question_order INTEGER NOT NULL DEFAULT 1
);

-- 4. Form Submissions Table (Historical Version Lock)
CREATE TABLE IF NOT EXISTS dfp_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_code VARCHAR(50) UNIQUE NOT NULL, -- SUB-2026-00890
  form_code VARCHAR(50) NOT NULL,
  form_version VARCHAR(20) NOT NULL, -- Linked to exact version at submission time
  
  applicant_upp_id VARCHAR(32) NOT NULL, -- Link to UPP Permanent ID
  mission_code VARCHAR(32), -- Optional link to Mission Execution
  case_code VARCHAR(32), -- Optional link to Case Layer
  
  answers_json JSONB NOT NULL, -- Immutable JSON map of question_code -> answer
  
  submitted_by_name VARCHAR(150) NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  gps_latitude NUMERIC(10, 7),
  gps_longitude NUMERIC(10, 7)
);

-- Seed Default Form Definitions
INSERT INTO dfp_forms (form_code, version, title, description, category)
VALUES
  ('FORM-SOIL-01', 'v1.0', 'Comprehensive Soil Health & Crop Inspection Form', 'Standard agricultural soil testing and land health assessment survey', 'SURVEY'),
  ('FORM-DRONE-01', 'v1.0', 'Drone Spraying Pre & Post Mission Audit', 'Safety checklist, acreage measurement, and chemical dilution verification', 'AUDIT')
ON CONFLICT (form_code, version) DO NOTHING;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_dfp_code_ver ON dfp_forms(form_code, version);
CREATE INDEX IF NOT EXISTS idx_dfp_sub_code ON dfp_submissions(submission_code);
CREATE INDEX IF NOT EXISTS idx_dfp_sub_upp ON dfp_submissions(applicant_upp_id);

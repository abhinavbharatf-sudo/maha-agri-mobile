-- ============================================================================
-- MAHA-AGRI Government Digital Operations Platform
-- Phase 1 Database Script: 012_edp_tables.sql
-- 
-- Purpose: Entrepreneurship Development Programme (EDP) Tables (Courses, Candidates, Batches, Certificates, Placements).
-- Execution Order: 012 / 030
-- Dependencies: 001_extensions.sql, 002_schemas.sql, 003_master_tables.sql, 004_identity_tables.sql
-- Rollback Notes: DROP TABLE IF EXISTS edp.<table_name> CASCADE;
-- ============================================================================

-- 1. Course Catalog Master
CREATE TABLE edp.course_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_code VARCHAR(30) NOT NULL UNIQUE,
  title_en VARCHAR(150) NOT NULL,
  title_mr VARCHAR(150) NOT NULL,
  duration_days INTEGER NOT NULL,
  syllabus_description VARCHAR(500) NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  
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

-- 2. Trainers Master
CREATE TABLE edp.trainers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES identity.users(id),
  trainer_code VARCHAR(30) NOT NULL UNIQUE,
  specialization VARCHAR(100) NOT NULL,
  qualification VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  
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

-- 3. Training Batches
CREATE TABLE edp.training_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_code VARCHAR(50) NOT NULL UNIQUE,
  course_id UUID NOT NULL REFERENCES edp.course_catalog(id),
  trainer_id UUID NOT NULL REFERENCES edp.trainers(id),
  district_id UUID NOT NULL REFERENCES master.districts(id),
  taluka_id UUID NOT NULL REFERENCES master.talukas(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  max_capacity INTEGER NOT NULL DEFAULT 30,
  current_enrolled INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'UPCOMING' CHECK (status IN ('UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED')),
  
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

-- 4. Candidates Master
CREATE TABLE edp.candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_code VARCHAR(30) NOT NULL UNIQUE,
  user_id UUID NULL REFERENCES identity.users(id),
  full_name_en VARCHAR(150) NOT NULL,
  full_name_mr VARCHAR(150) NULL,
  mobile_number VARCHAR(15) NOT NULL,
  email VARCHAR(100) NULL,
  qualification VARCHAR(100) NOT NULL,
  district_id UUID NOT NULL REFERENCES master.districts(id),
  status VARCHAR(20) NOT NULL DEFAULT 'REGISTERED' CHECK (status IN ('REGISTERED', 'ENROLLED', 'CERTIFIED', 'PLACED')),
  
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

-- 5. Batch Enrollments
CREATE TABLE edp.batch_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES edp.training_batches(id),
  candidate_id UUID NOT NULL REFERENCES edp.candidates(id),
  enrollment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'ENROLLED' CHECK (status IN ('ENROLLED', 'COMPLETED', 'DROPPED')),
  
  -- Mandatory Audit Envelope
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE NULL,
  deleted_by UUID NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  record_version INTEGER NOT NULL DEFAULT 1,
  
  CONSTRAINT uq_batch_candidate UNIQUE (batch_id, candidate_id)
);

-- 6. Certificates
CREATE TABLE edp.certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_number VARCHAR(50) NOT NULL UNIQUE,
  candidate_id UUID NOT NULL REFERENCES edp.candidates(id),
  batch_id UUID NOT NULL REFERENCES edp.training_batches(id),
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  certificate_url VARCHAR(500) NOT NULL,
  qr_code VARCHAR(100) NOT NULL,
  
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

-- 7. Placements / Business Setup
CREATE TABLE edp.placements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES edp.candidates(id),
  placement_type VARCHAR(50) NOT NULL, -- SELF_EMPLOYED_ENTREPRENEUR, AGRI_ENTERPRISE_JOB, DRONE_PILOT
  organization_name VARCHAR(150) NULL,
  designation VARCHAR(100) NULL,
  monthly_income NUMERIC(10,2) NULL,
  placement_date DATE NOT NULL,
  
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

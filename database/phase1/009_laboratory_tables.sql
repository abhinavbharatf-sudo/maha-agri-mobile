-- ============================================================================
-- MAHA-AGRI Government Digital Operations Platform
-- Phase 1 Database Script: 009_laboratory_tables.sql
-- 
-- Purpose: Laboratory Management Domain Tables (Lab Staff, Equipment, Batches, Approval Workflows, Quality Control Logs).
-- Execution Order: 009 / 030
-- Dependencies: 001_extensions.sql, 002_schemas.sql, 003_master_tables.sql, 004_identity_tables.sql, 008_soil_tables.sql
-- Rollback Notes: DROP TABLE IF EXISTS laboratory.<table_name> CASCADE;
-- ============================================================================

-- 1. Laboratory Users
CREATE TABLE laboratory.laboratory_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratory_id UUID NOT NULL REFERENCES master.laboratories(id),
  user_id UUID NOT NULL REFERENCES identity.users(id),
  lab_role VARCHAR(50) NOT NULL, -- LAB_ADMIN, LAB_MANAGER, LAB_TECHNICIAN, QUALITY_OFFICER, REPORT_APPROVER
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  
  -- Mandatory Audit Envelope
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE NULL,
  deleted_by UUID NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  record_version INTEGER NOT NULL DEFAULT 1,
  
  CONSTRAINT uq_lab_user UNIQUE (laboratory_id, user_id)
);

-- 2. Laboratory Equipment
CREATE TABLE laboratory.laboratory_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratory_id UUID NOT NULL REFERENCES master.laboratories(id),
  equipment_code VARCHAR(50) NOT NULL UNIQUE,
  equipment_name VARCHAR(100) NOT NULL,
  model_number VARCHAR(100) NULL,
  serial_number VARCHAR(100) NULL,
  last_calibration_date DATE NULL,
  next_calibration_due DATE NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'OPERATIONAL' CHECK (status IN ('OPERATIONAL', 'UNDER_MAINTENANCE', 'OUT_OF_SERVICE')),
  
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

-- 3. Laboratory Inventory
CREATE TABLE laboratory.laboratory_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratory_id UUID NOT NULL REFERENCES master.laboratories(id),
  chemical_reagent_name VARCHAR(150) NOT NULL,
  batch_number VARCHAR(50) NOT NULL,
  quantity_available NUMERIC(10,2) NOT NULL,
  unit VARCHAR(20) NOT NULL,
  reorder_level NUMERIC(10,2) NOT NULL DEFAULT 10.0,
  expiry_date DATE NULL,
  
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

-- 4. Laboratory Test Batches
CREATE TABLE laboratory.laboratory_test_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratory_id UUID NOT NULL REFERENCES master.laboratories(id),
  batch_code VARCHAR(50) NOT NULL UNIQUE,
  assigned_technician_id UUID NOT NULL REFERENCES identity.users(id),
  sample_count INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS' CHECK (status IN ('CREATED', 'IN_PROGRESS', 'COMPLETED', 'VERIFIED')),
  
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

-- 5. Report Approvals
CREATE TABLE laboratory.report_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_id UUID NOT NULL REFERENCES soil.soil_samples(id),
  approver_id UUID NOT NULL REFERENCES identity.users(id),
  approval_status VARCHAR(20) NOT NULL CHECK (approval_status IN ('APPROVED', 'REJECTED')),
  remarks VARCHAR(250) NULL,
  approval_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
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

-- 6. Quality Control Logs
CREATE TABLE laboratory.quality_control_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratory_id UUID NOT NULL REFERENCES master.laboratories(id),
  equipment_id UUID NULL REFERENCES laboratory.laboratory_equipment(id),
  qc_check_type VARCHAR(50) NOT NULL, -- BLANK_SAMPLE, DUPLICATE_TEST, CALIBRATION_CHECK
  result_status VARCHAR(20) NOT NULL CHECK (result_status IN ('PASS', 'FAIL')),
  performed_by UUID NOT NULL REFERENCES identity.users(id),
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

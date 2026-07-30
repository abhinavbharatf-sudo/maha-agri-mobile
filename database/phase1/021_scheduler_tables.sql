-- ============================================================================
-- MAHA-AGRI Government Digital Operations Platform
-- Phase 1 Database Script: 021_scheduler_tables.sql
-- 
-- Purpose: Scheduled Cron Jobs and Execution Logs Tables.
-- Execution Order: 021 / 030
-- Dependencies: 001_extensions.sql, 002_schemas.sql
-- Rollback Notes: DROP TABLE IF EXISTS scheduler.<table_name> CASCADE;
-- ============================================================================

-- 1. Cron Jobs Table
CREATE TABLE scheduler.cron_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name VARCHAR(100) NOT NULL UNIQUE,
  cron_expression VARCHAR(50) NOT NULL, -- e.g. '0 0 * * *' for daily midnight
  job_handler VARCHAR(250) NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  last_run_at TIMESTAMP WITH TIME ZONE NULL,
  next_run_at TIMESTAMP WITH TIME ZONE NULL,
  
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

-- 2. Job Execution Logs
CREATE TABLE scheduler.job_execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cron_job_id UUID NOT NULL REFERENCES scheduler.cron_jobs(id),
  execution_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  execution_end TIMESTAMP WITH TIME ZONE NULL,
  duration_ms INTEGER NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('RUNNING', 'SUCCESS', 'FAILED')),
  error_log TEXT NULL,
  
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

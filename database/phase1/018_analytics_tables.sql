-- ============================================================================
-- MAHA-AGRI Government Digital Operations Platform
-- Phase 1 Database Script: 018_analytics_tables.sql
-- 
-- Purpose: Operational Intelligence & Dashboard KPIs, Snapshots, and Analytics Report Definitions.
-- Execution Order: 018 / 030
-- Dependencies: 001_extensions.sql, 002_schemas.sql
-- Rollback Notes: DROP TABLE IF EXISTS analytics.<table_name> CASCADE;
-- ============================================================================

-- 1. Dashboard KPIs Table
CREATE TABLE analytics.dashboard_kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_code VARCHAR(50) NOT NULL UNIQUE,
  kpi_name VARCHAR(150) NOT NULL,
  module VARCHAR(50) NOT NULL,
  metric_value NUMERIC(14,4) NOT NULL,
  metric_unit VARCHAR(20) NULL,
  last_computed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
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

-- 2. Dashboard Snapshots Table
CREATE TABLE analytics.dashboard_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL,
  module VARCHAR(50) NOT NULL,
  metrics_json JSONB NOT NULL,
  
  -- Mandatory Audit Envelope
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE NULL,
  deleted_by UUID NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  record_version INTEGER NOT NULL DEFAULT 1,
  
  CONSTRAINT uq_snapshot_module UNIQUE (snapshot_date, module)
);

-- 3. Report Definitions Table
CREATE TABLE analytics.report_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_code VARCHAR(50) NOT NULL UNIQUE,
  report_name VARCHAR(150) NOT NULL,
  query_definition TEXT NOT NULL,
  allowed_role_keys VARCHAR(250) NOT NULL,
  
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

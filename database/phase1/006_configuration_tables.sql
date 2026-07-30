-- ============================================================================
-- MAHA-AGRI Government Digital Operations Platform
-- Phase 1 Database Script: 006_configuration_tables.sql
-- 
-- Purpose: System settings and feature flags tables.
-- Execution Order: 006 / 030
-- Dependencies: 001_extensions.sql, 002_schemas.sql
-- Rollback Notes: DROP TABLE IF EXISTS configuration.<table_name> CASCADE;
-- ============================================================================

-- 1. System Settings Table
CREATE TABLE configuration.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) NOT NULL UNIQUE,
  value VARCHAR(500) NOT NULL,
  data_type VARCHAR(20) NOT NULL DEFAULT 'STRING' CHECK (data_type IN ('STRING', 'INTEGER', 'BOOLEAN', 'JSON')),
  category VARCHAR(50) NOT NULL DEFAULT 'GENERAL',
  description VARCHAR(250) NULL,
  
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

-- 2. Feature Flags Table
CREATE TABLE configuration.feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  description VARCHAR(250) NULL,
  
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

-- ============================================================================
-- MAHA-AGRI Government Digital Operations Platform
-- Phase 1 Database Script: 019_ai_tables.sql
-- 
-- Purpose: AI Models, Requests, Responses, and Farmer Advisory Feedback.
-- Execution Order: 019 / 030
-- Dependencies: 001_extensions.sql, 002_schemas.sql, 004_identity_tables.sql
-- Rollback Notes: DROP TABLE IF EXISTS ai.<table_name> CASCADE;
-- ============================================================================

-- 1. AI Models Master
CREATE TABLE ai.ai_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_code VARCHAR(50) NOT NULL UNIQUE,
  model_name VARCHAR(150) NOT NULL,
  version VARCHAR(20) NOT NULL,
  model_type VARCHAR(50) NOT NULL, -- SOIL_RECOMMENDATION, CROP_RECOMMENDATION, DEMAND_FORECAST
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

-- 2. AI Requests Table
CREATE TABLE ai.ai_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID NOT NULL REFERENCES ai.ai_models(id),
  requested_by UUID NOT NULL REFERENCES identity.users(id),
  input_payload JSONB NOT NULL,
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
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

-- 3. AI Responses Table
CREATE TABLE ai.ai_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES ai.ai_requests(id),
  output_payload JSONB NOT NULL,
  confidence_score NUMERIC(5,4) NOT NULL DEFAULT 0.9500,
  latency_ms INTEGER NOT NULL,
  
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

-- 4. AI Feedback Table
CREATE TABLE ai.ai_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id UUID NOT NULL REFERENCES ai.ai_responses(id),
  farmer_id UUID NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comments TEXT NULL,
  
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

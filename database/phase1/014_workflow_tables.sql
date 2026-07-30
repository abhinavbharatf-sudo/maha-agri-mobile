-- ============================================================================
-- MAHA-AGRI Government Digital Operations Platform
-- Phase 1 Database Script: 014_workflow_tables.sql
-- 
-- Purpose: Configurable Workflow Engine, Tasks, SLA Tracking, and Domain Event Log Tables.
-- Execution Order: 014 / 030
-- Dependencies: 001_extensions.sql, 002_schemas.sql, 004_identity_tables.sql
-- Rollback Notes: DROP TABLE IF EXISTS workflow.<table_name> CASCADE;
-- ============================================================================

-- 1. Workflow Definitions
CREATE TABLE workflow.workflow_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(50) NOT NULL UNIQUE, -- e.g. SOIL_TEST_APPROVAL, DRONE_SPRAY_APPROVAL
  name VARCHAR(150) NOT NULL,
  module VARCHAR(50) NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'DRAFT')),
  
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

-- 2. Workflow Steps
CREATE TABLE workflow.workflow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_definition_id UUID NOT NULL REFERENCES workflow.workflow_definitions(id),
  step_sequence INTEGER NOT NULL,
  step_name VARCHAR(100) NOT NULL,
  assigned_role_key VARCHAR(50) NOT NULL,
  sla_hours INTEGER NOT NULL DEFAULT 48,
  auto_escalate_on_sla_breach BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Mandatory Audit Envelope
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE NULL,
  deleted_by UUID NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  record_version INTEGER NOT NULL DEFAULT 1,
  
  CONSTRAINT uq_workflow_sequence UNIQUE (workflow_definition_id, step_sequence)
);

-- 3. Workflow Instances
CREATE TABLE workflow.workflow_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_definition_id UUID NOT NULL REFERENCES workflow.workflow_definitions(id),
  entity_type VARCHAR(50) NOT NULL, -- e.g. SOIL_SAMPLE, DRONE_MISSION, SERVICE_REQUEST
  entity_id UUID NOT NULL,
  current_step_id UUID NULL REFERENCES workflow.workflow_steps(id),
  status VARCHAR(30) NOT NULL DEFAULT 'IN_PROGRESS' CHECK (status IN ('IN_PROGRESS', 'COMPLETED', 'REJECTED', 'CANCELLED')),
  
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

-- 4. Tasks Table
CREATE TABLE workflow.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_instance_id UUID NOT NULL REFERENCES workflow.workflow_instances(id),
  step_id UUID NOT NULL REFERENCES workflow.workflow_steps(id),
  assigned_user_id UUID NULL REFERENCES identity.users(id),
  assigned_role_key VARCHAR(50) NOT NULL,
  task_title VARCHAR(150) NOT NULL,
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'ESCALATED', 'REJECTED')),
  
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

-- 5. Workflow History
CREATE TABLE workflow.workflow_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_instance_id UUID NOT NULL REFERENCES workflow.workflow_instances(id),
  step_id UUID NOT NULL REFERENCES workflow.workflow_steps(id),
  action_by UUID NOT NULL REFERENCES identity.users(id),
  action VARCHAR(30) NOT NULL, -- APPROVED, REJECTED, ESCALATED, DELEGATED
  remarks VARCHAR(500) NULL,
  action_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
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

-- 6. Event Log Table (Event-Driven Architecture)
CREATE TABLE workflow.event_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name VARCHAR(100) NOT NULL, -- e.g. SampleRegistered, PaymentReceived, MissionCompleted
  publisher_module VARCHAR(50) NOT NULL,
  payload JSONB NOT NULL,
  published_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(20) NOT NULL DEFAULT 'PUBLISHED' CHECK (status IN ('PUBLISHED', 'PROCESSED', 'FAILED')),
  
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

-- 7. Event Subscriptions
CREATE TABLE workflow.event_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name VARCHAR(100) NOT NULL,
  subscriber_module VARCHAR(50) NOT NULL,
  handler_endpoint VARCHAR(250) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  
  -- Mandatory Audit Envelope
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE NULL,
  deleted_by UUID NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  record_version INTEGER NOT NULL DEFAULT 1,
  
  CONSTRAINT uq_event_subscriber UNIQUE (event_name, subscriber_module)
);

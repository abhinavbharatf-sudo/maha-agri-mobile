-- =============================================================================
-- MODULE 07: WORKFLOW & APPROVAL ENGINE DDL SCHEMA
-- Process Workflow Engine + Decision Approval Engine + Delegation + Escalation Matrix
-- =============================================================================

-- 1. Workflow Definitions Table (Immutable Versioning v1.0, v2.0)
CREATE TABLE IF NOT EXISTS wf_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_code VARCHAR(50) NOT NULL, -- WF-SUBSIDY-01, WF-SOIL-01
  version VARCHAR(20) NOT NULL DEFAULT 'v1.0',
  title VARCHAR(200) NOT NULL,
  description TEXT,
  
  is_parallel BOOLEAN NOT NULL DEFAULT FALSE,
  is_conditional BOOLEAN NOT NULL DEFAULT TRUE,
  amount_threshold_rupees NUMERIC(12, 2) DEFAULT 50000.00,
  
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workflow_code, version)
);

-- 2. Workflow Instances Table
CREATE TABLE IF NOT EXISTS wf_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_code VARCHAR(50) UNIQUE NOT NULL, -- WFI-2026-00412
  workflow_code VARCHAR(50) NOT NULL,
  workflow_version VARCHAR(20) NOT NULL,
  
  request_code VARCHAR(32) NOT NULL,
  case_code VARCHAR(32) NOT NULL,
  applicant_upp_id VARCHAR(32) NOT NULL,
  
  current_state VARCHAR(50) NOT NULL DEFAULT 'SUBMITTED',
  financial_amount NUMERIC(12, 2) DEFAULT 0.00,
  
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Approval Tasks Table (Human / System Decision Tasks)
CREATE TABLE IF NOT EXISTS wf_approval_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_code VARCHAR(50) UNIQUE NOT NULL, -- APT-2026-00910
  instance_id UUID NOT NULL REFERENCES wf_instances(id) ON DELETE CASCADE,
  
  step_name VARCHAR(100) NOT NULL,
  approver_role VARCHAR(50) NOT NULL, -- DISTRICT_COORDINATOR, REGIONAL_MANAGER, STATE_ADMIN
  assigned_user_id UUID,
  assigned_user_name VARCHAR(150),
  
  -- Decision State (PENDING, APPROVED, REJECTED, RETURNED, ESCALATED, DELEGATED)
  decision VARCHAR(30) NOT NULL DEFAULT 'PENDING',
  decision_reason TEXT,
  
  -- Cryptographic Digital Signature Audit
  digital_signature_url TEXT,
  ip_address VARCHAR(45),
  device_info VARCHAR(150),
  decided_at TIMESTAMPTZ,
  
  -- Delegation & Escalation Metadata
  is_delegated BOOLEAN NOT NULL DEFAULT FALSE,
  delegated_from_user_id UUID,
  sla_deadline TIMESTAMPTZ NOT NULL,
  is_escalated BOOLEAN NOT NULL DEFAULT FALSE,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Delegations Table (Officer Absence Proxy Routing)
CREATE TABLE IF NOT EXISTS wf_delegations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delegator_user_id UUID NOT NULL,
  delegator_name VARCHAR(150) NOT NULL,
  delegatee_user_id UUID NOT NULL,
  delegatee_name VARCHAR(150) NOT NULL,
  
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Configurable SLA Escalation Matrix Table
CREATE TABLE IF NOT EXISTS wf_escalation_matrix (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sla_hours INTEGER NOT NULL, -- 24, 48, 72, 96
  action_type VARCHAR(30) NOT NULL, -- REMINDER, ESCALATE_DISTRICT, ESCALATE_REGIONAL, ESCALATE_STATE
  target_role VARCHAR(50) NOT NULL
);

-- Seed Escalation Matrix Rules
INSERT INTO wf_escalation_matrix (sla_hours, action_type, target_role)
VALUES
  (24, 'REMINDER', 'DISTRICT_COORDINATOR'),
  (48, 'ESCALATE_DISTRICT', 'DISTRICT_COORDINATOR'),
  (72, 'ESCALATE_REGIONAL', 'REGIONAL_MANAGER'),
  (96, 'ESCALATE_STATE', 'STATE_ADMIN')
ON CONFLICT DO NOTHING;

-- Seed Default Workflow Definition
INSERT INTO wf_definitions (workflow_code, version, title, description, amount_threshold_rupees)
VALUES
  ('WF-SUBSIDY-01', 'v1.0', 'Agricultural Subsidy & Benefit Transfer Workflow', 'Multi-tier conditional approval workflow for government subsidy disburser', 50000.00)
ON CONFLICT (workflow_code, version) DO NOTHING;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wf_inst_code ON wf_instances(instance_code);
CREATE INDEX IF NOT EXISTS idx_wf_task_code ON wf_approval_tasks(task_code);
CREATE INDEX IF NOT EXISTS idx_wf_task_dec ON wf_approval_tasks(decision);
CREATE INDEX IF NOT EXISTS idx_wf_deleg_active ON wf_delegations(is_active);

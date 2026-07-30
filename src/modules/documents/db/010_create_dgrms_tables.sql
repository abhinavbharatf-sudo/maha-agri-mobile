-- =============================================================================
-- MODULE 10: DOCUMENT GENERATION & RECORDS MANAGEMENT SYSTEM (DGRMS) DDL SCHEMA
-- 8 Core Engines: Templates, Merge, Versioning, Digital Seal & QR, Records, Lifecycle, Bulk, Verification Registry
-- =============================================================================

-- 1. Document Templates Table (Immutable Template Versioning v1.0, v2.0)
CREATE TABLE IF NOT EXISTS dgrms_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_code VARCHAR(50) UNIQUE NOT NULL, -- TPL-SOIL-REPORT, TPL-SANCTION-ORDER
  version VARCHAR(20) NOT NULL DEFAULT 'v1.0',
  title VARCHAR(200) NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'CERTIFICATE', -- CERTIFICATE, SANCTION_ORDER, APPOINTMENT, ID_CARD, RECEIPT
  content_template TEXT NOT NULL,
  placeholders_json JSONB NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Generated Documents Records Table
CREATE TABLE IF NOT EXISTS dgrms_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_code VARCHAR(50) UNIQUE NOT NULL, -- DOC-2026-00912
  template_code VARCHAR(50) NOT NULL REFERENCES dgrms_templates(template_code),
  document_version VARCHAR(20) NOT NULL DEFAULT 'v1.0',
  
  owner_upp_id VARCHAR(32) NOT NULL,
  owner_name VARCHAR(150) NOT NULL,
  origin_module VARCHAR(30) NOT NULL, -- REQUESTS, MISSION, WORKFLOW, PAYMENTS
  origin_entity_id VARCHAR(50) NOT NULL,
  
  -- Lifecycle State: DRAFT, GENERATED, APPROVED, ISSUED, ARCHIVED
  lifecycle_status VARCHAR(30) NOT NULL DEFAULT 'ISSUED',
  retention_years INTEGER NOT NULL DEFAULT 10,
  
  merged_payload_json JSONB NOT NULL,
  issued_by_name VARCHAR(150) NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Public Verification Registry Table
CREATE TABLE IF NOT EXISTS dgrms_verification_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_code VARCHAR(50) UNIQUE NOT NULL REFERENCES dgrms_documents(document_code),
  integrity_hash VARCHAR(128) NOT NULL,
  verification_url TEXT NOT NULL,
  verification_status VARCHAR(30) NOT NULL DEFAULT 'VALID', -- VALID, SUSPENDED, REVOKED
  revocation_reason TEXT,
  verified_count INTEGER NOT NULL DEFAULT 0,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Bulk Generation Queue Table
CREATE TABLE IF NOT EXISTS dgrms_bulk_queues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_code VARCHAR(50) UNIQUE NOT NULL, -- QUEUE-2026-0081
  batch_name VARCHAR(200) NOT NULL,
  template_code VARCHAR(50) NOT NULL,
  total_documents INTEGER NOT NULL DEFAULT 0,
  completed_documents INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(30) NOT NULL DEFAULT 'COMPLETED', -- PENDING, PROCESSING, COMPLETED, FAILED
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed Default Templates
INSERT INTO dgrms_templates (template_code, version, title, category, content_template, placeholders_json)
VALUES
  ('TPL-SOIL-REPORT', 'v1.0', 'Soil Sample Testing Technical Report Certificate', 'CERTIFICATE', 'Soil Test Report for {{UPP_NAME}} in {{DISTRICT}} District. Status: Passed.', '["UPP_NAME", "DISTRICT", "DATE", "MISSION_CODE"]'),
  ('TPL-SANCTION-ORDER', 'v1.0', 'Government Subsidy Sanction & Payment Order', 'SANCTION_ORDER', 'Sanction Order for ₹{{AMOUNT}} issued to {{UPP_NAME}} for scheme {{SCHEME}}.', '["UPP_NAME", "AMOUNT", "SCHEME", "REQUEST_CODE"]')
ON CONFLICT (template_code) DO NOTHING;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_doc_code ON dgrms_documents(document_code);
CREATE INDEX IF NOT EXISTS idx_doc_owner ON dgrms_documents(owner_upp_id);
CREATE INDEX IF NOT EXISTS idx_verif_status ON dgrms_verification_registry(verification_status);

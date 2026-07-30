-- ============================================================================
-- MAHA-AGRI Government Digital Operations Platform
-- Phase 1 Database Script: 016_document_tables.sql
-- 
-- Purpose: Document Vault, Version Control, and Digital Signatures / QR Seals.
-- Execution Order: 016 / 030
-- Dependencies: 001_extensions.sql, 002_schemas.sql, 004_identity_tables.sql
-- Rollback Notes: DROP TABLE IF EXISTS document.<table_name> CASCADE;
-- ============================================================================

-- 1. Documents Vault
CREATE TABLE document.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_code VARCHAR(50) NOT NULL UNIQUE,
  title VARCHAR(150) NOT NULL,
  category VARCHAR(50) NOT NULL, -- SOIL_REPORT, EDP_CERTIFICATE, INVOICE, FARMER_712
  owner_user_id UUID NOT NULL REFERENCES identity.users(id),
  file_extension VARCHAR(10) NOT NULL,
  mime_type VARCHAR(50) NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  storage_path VARCHAR(500) NOT NULL,
  current_version INTEGER NOT NULL DEFAULT 1,
  
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

-- 2. Document Versions
CREATE TABLE document.document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES document.documents(id),
  version_number INTEGER NOT NULL,
  file_hash_sha256 VARCHAR(64) NOT NULL,
  storage_path VARCHAR(500) NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES identity.users(id),
  
  -- Mandatory Audit Envelope
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE NULL,
  deleted_by UUID NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  record_version INTEGER NOT NULL DEFAULT 1,
  
  CONSTRAINT uq_document_version UNIQUE (document_id, version_number)
);

-- 3. Digital Signatures & QR Seals
CREATE TABLE document.digital_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES document.documents(id),
  signer_user_id UUID NOT NULL REFERENCES identity.users(id),
  signature_algorithm VARCHAR(50) NOT NULL DEFAULT 'RSA-SHA256',
  digital_signature_hash TEXT NOT NULL,
  qr_verification_code VARCHAR(100) NOT NULL UNIQUE,
  signed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
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

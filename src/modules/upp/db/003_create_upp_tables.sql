-- =============================================================================
-- MODULE 03: UNIVERSAL PROFILE PLATFORM (UPP) DDL SCHEMA (ENHANCED ENTERPRISE)
-- Universal Permanent ID + Contacts + Identity Docs + Consents + Merge + Sticky Notes
-- =============================================================================

CREATE TABLE IF NOT EXISTS upp_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  permanent_upp_id VARCHAR(32) UNIQUE NOT NULL, -- Permanent Universal ID (UPP-000000123)
  primary_business_code VARCHAR(32) UNIQUE NOT NULL, -- Business Code (CAN-000456 / FAR-000123)
  
  -- Personal Identity
  full_name VARCHAR(150) NOT NULL,
  gender VARCHAR(20),
  date_of_birth DATE,
  avatar_url TEXT,

  -- Primary Active Role & Lifecycle State
  current_primary_role VARCHAR(50) NOT NULL DEFAULT 'CANDIDATE',
  lifecycle_stage VARCHAR(50) NOT NULL DEFAULT 'REGISTERED',
  
  -- Soft Delete Status Lifecycle (ACTIVE, INACTIVE, MERGED, ARCHIVED)
  status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
  merged_into_upp_id VARCHAR(32), -- Target UPP ID if status = MERGED

  -- Intelligence Metrics
  health_score INTEGER NOT NULL DEFAULT 50, -- 0 to 100%
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  is_flagged_duplicate BOOLEAN NOT NULL DEFAULT FALSE,

  -- Geo Access Scope
  state VARCHAR(50) NOT NULL DEFAULT 'Maharashtra',
  district VARCHAR(50) NOT NULL,
  taluka VARCHAR(50) NOT NULL,
  village VARCHAR(50),
  pincode VARCHAR(10),

  -- Universal Sticky Notes
  sticky_note TEXT,

  -- Metadata
  organization_id UUID,
  assigned_coordinator_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1. Contact Points Engine (upp_contacts)
CREATE TABLE IF NOT EXISTS upp_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upp_profile_id UUID NOT NULL REFERENCES upp_profiles(id) ON DELETE CASCADE,
  contact_type VARCHAR(30) NOT NULL, -- PRIMARY_MOBILE, WHATSAPP, ALTERNATE_MOBILE, EMAIL, WORK_EMAIL
  contact_value VARCHAR(150) NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Identity Documents Engine (upp_identity_documents)
CREATE TABLE IF NOT EXISTS upp_identity_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upp_profile_id UUID NOT NULL REFERENCES upp_profiles(id) ON DELETE CASCADE,
  document_type VARCHAR(50) NOT NULL, -- AADHAAR, PAN, VOTER_ID, RATION_CARD, LAND_RECORD_712
  document_number VARCHAR(100) NOT NULL,
  document_file_url TEXT,
  verification_status VARCHAR(30) NOT NULL DEFAULT 'PENDING', -- PENDING, VERIFIED, REJECTED
  verified_by UUID,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Consent Engine (upp_consents)
CREATE TABLE IF NOT EXISTS upp_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upp_profile_id UUID NOT NULL REFERENCES upp_profiles(id) ON DELETE CASCADE,
  consent_type VARCHAR(50) NOT NULL, -- PRIVACY_POLICY, WHATSAPP_COMMUNICATION, SMS_ALERTS, DATA_PROCESSING
  is_granted BOOLEAN NOT NULL DEFAULT TRUE,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address VARCHAR(45),
  consent_text_version VARCHAR(20) NOT NULL DEFAULT 'v1.0'
);

-- 4. Role Lifecycle Transition Logs
CREATE TABLE IF NOT EXISTS upp_profile_role_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upp_profile_id UUID NOT NULL REFERENCES upp_profiles(id) ON DELETE CASCADE,
  from_role VARCHAR(50) NOT NULL,
  to_role VARCHAR(50) NOT NULL,
  from_lifecycle_stage VARCHAR(50),
  to_lifecycle_stage VARCHAR(50),
  reason TEXT,
  transitioned_by UUID,
  transitioned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Profile Merge History Logs
CREATE TABLE IF NOT EXISTS upp_profile_merges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_upp_id VARCHAR(32) NOT NULL,
  target_upp_id VARCHAR(32) NOT NULL,
  reason TEXT NOT NULL,
  merged_by UUID,
  merged_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_upp_permanent_id ON upp_profiles(permanent_upp_id);
CREATE INDEX IF NOT EXISTS idx_upp_status ON upp_profiles(status);
CREATE INDEX IF NOT EXISTS idx_upp_contacts ON upp_contacts(contact_value);
CREATE INDEX IF NOT EXISTS idx_upp_docs ON upp_identity_documents(document_type, document_number);

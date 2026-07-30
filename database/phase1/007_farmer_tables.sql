-- ============================================================================
-- MAHA-AGRI Government Digital Operations Platform
-- Phase 1 Database Script: 007_farmer_tables.sql
-- 
-- Purpose: Farmer Domain Tables (Farmers, Land Parcels, Addresses, Documents, Bank Accounts, Crops, etc.).
-- Execution Order: 007 / 030
-- Dependencies: 001_extensions.sql, 002_schemas.sql, 003_master_tables.sql, 004_identity_tables.sql
-- Rollback Notes: DROP TABLE IF EXISTS farmer.<table_name> CASCADE;
-- ============================================================================

-- 1. Farmers Master Table
CREATE TABLE farmer.farmers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_code VARCHAR(30) NOT NULL UNIQUE,
  user_id UUID NULL REFERENCES identity.users(id),
  aadhaar_number_hash VARCHAR(255) NULL UNIQUE,
  mobile_number VARCHAR(15) NOT NULL,
  first_name_en VARCHAR(100) NOT NULL,
  middle_name_en VARCHAR(100) NULL,
  last_name_en VARCHAR(100) NOT NULL,
  first_name_mr VARCHAR(100) NULL,
  middle_name_mr VARCHAR(100) NULL,
  last_name_mr VARCHAR(100) NULL,
  gender VARCHAR(10) NOT NULL CHECK (gender IN ('MALE', 'FEMALE', 'OTHER')),
  dob DATE NULL,
  category VARCHAR(30) NOT NULL DEFAULT 'GENERAL', -- GENERAL, SC, ST, OBC
  farmer_type VARCHAR(30) NOT NULL DEFAULT 'SMALL', -- SMALL, MARGINAL, LARGE
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'ARCHIVED')),
  
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

-- 2. Farmer Addresses
CREATE TABLE farmer.farmer_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID NOT NULL REFERENCES farmer.farmers(id),
  address_line1 VARCHAR(250) NOT NULL,
  address_line2 VARCHAR(250) NULL,
  division_id UUID NOT NULL REFERENCES master.divisions(id),
  district_id UUID NOT NULL REFERENCES master.districts(id),
  taluka_id UUID NOT NULL REFERENCES master.talukas(id),
  village_id UUID NOT NULL REFERENCES master.villages(id),
  pin_code VARCHAR(10) NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT TRUE,
  
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

-- 3. Farmer Land Parcels
CREATE TABLE farmer.farmer_land_parcels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID NOT NULL REFERENCES farmer.farmers(id),
  district_id UUID NOT NULL REFERENCES master.districts(id),
  taluka_id UUID NOT NULL REFERENCES master.talukas(id),
  village_id UUID NOT NULL REFERENCES master.villages(id),
  survey_gat_number VARCHAR(50) NOT NULL,
  khata_number VARCHAR(50) NULL,
  total_area_acres NUMERIC(10,4) NOT NULL,
  cultivable_area_acres NUMERIC(10,4) NOT NULL,
  soil_type VARCHAR(50) NULL,
  ownership_type VARCHAR(30) NOT NULL DEFAULT 'OWNED', -- OWNED, LEASED, JOINT
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  
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

-- 4. Irrigation Sources
CREATE TABLE farmer.irrigation_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  land_parcel_id UUID NOT NULL REFERENCES farmer.farmer_land_parcels(id),
  source_type VARCHAR(50) NOT NULL, -- WELL, BOREWELL, CANAL, DRIP, SPRINKLER, RAINFED
  capacity_description VARCHAR(150) NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  
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

-- 5. Farmer Documents
CREATE TABLE farmer.farmer_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID NOT NULL REFERENCES farmer.farmers(id),
  document_type VARCHAR(50) NOT NULL, -- AADHAAR, 7_12, 8A, PASSBOOK, PHOTO
  document_number VARCHAR(100) NULL,
  file_url VARCHAR(500) NOT NULL,
  verification_status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (verification_status IN ('PENDING', 'VERIFIED', 'REJECTED')),
  
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

-- 6. Farmer Bank Accounts
CREATE TABLE farmer.farmer_bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID NOT NULL REFERENCES farmer.farmers(id),
  account_number VARCHAR(50) NOT NULL,
  account_holder_name VARCHAR(150) NOT NULL,
  bank_name VARCHAR(100) NOT NULL,
  branch_name VARCHAR(100) NOT NULL,
  ifsc_code VARCHAR(20) NOT NULL,
  is_dbt_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  
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

-- 7. Family Members
CREATE TABLE farmer.family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID NOT NULL REFERENCES farmer.farmers(id),
  full_name VARCHAR(150) NOT NULL,
  relationship VARCHAR(50) NOT NULL,
  gender VARCHAR(10) NOT NULL,
  dob DATE NULL,
  
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

-- 8. Crop History
CREATE TABLE farmer.crop_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  land_parcel_id UUID NOT NULL REFERENCES farmer.farmer_land_parcels(id),
  crop_id UUID NOT NULL REFERENCES master.crops(id),
  variety_id UUID NULL REFERENCES master.crop_varieties(id),
  season VARCHAR(20) NOT NULL, -- KHARIF, RABI, SUMMER
  year INTEGER NOT NULL,
  area_acres NUMERIC(10,4) NOT NULL,
  yield_quintals NUMERIC(10,2) NULL,
  
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

-- 9. Equipment
CREATE TABLE farmer.equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID NOT NULL REFERENCES farmer.farmers(id),
  equipment_name VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL,
  registration_number VARCHAR(50) NULL,
  
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

-- 10. Service Subscriptions
CREATE TABLE farmer.service_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID NOT NULL REFERENCES farmer.farmers(id),
  service_name VARCHAR(100) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
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

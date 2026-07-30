-- ============================================================================
-- MAHA-AGRI Government Digital Operations Platform
-- Phase 1 Database Script: 008_soil_tables.sql
-- 
-- Purpose: Soil Testing System Domain Tables (Samples, Collection, Tracking, Lab Results, Recommendations).
-- Execution Order: 008 / 030
-- Dependencies: 001_extensions.sql, 002_schemas.sql, 003_master_tables.sql, 007_farmer_tables.sql
-- Rollback Notes: DROP TABLE IF EXISTS soil.<table_name> CASCADE;
-- ============================================================================

-- 1. Soil Samples Table
CREATE TABLE soil.soil_samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_code VARCHAR(30) NOT NULL UNIQUE,
  qr_code VARCHAR(100) NOT NULL UNIQUE,
  farmer_id UUID NOT NULL REFERENCES farmer.farmers(id),
  land_parcel_id UUID NOT NULL REFERENCES farmer.farmer_land_parcels(id),
  laboratory_id UUID NULL REFERENCES master.laboratories(id),
  status VARCHAR(30) NOT NULL DEFAULT 'REGISTERED' CHECK (status IN (
    'REGISTERED', 'COLLECTED', 'DISPATCHED', 'RECEIVED_AT_LAB', 'TESTING_IN_PROGRESS', 
    'RESULTS_ENTERED', 'VERIFIED', 'APPROVED', 'REPORT_GENERATED', 'DELIVERED', 'REJECTED'
  )),
  
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

-- 2. Sample Collection Details
CREATE TABLE soil.sample_collection (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_id UUID NOT NULL REFERENCES soil.soil_samples(id),
  collector_id UUID NOT NULL REFERENCES identity.users(id),
  collection_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  gps_latitude NUMERIC(10,8) NOT NULL,
  gps_longitude NUMERIC(11,8) NOT NULL,
  farmer_signature_url VARCHAR(500) NULL,
  sample_photo_url VARCHAR(500) NULL,
  depth_cm NUMERIC(5,2) NULL DEFAULT 15.0,
  
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

-- 3. Sample Tracking Log
CREATE TABLE soil.sample_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_id UUID NOT NULL REFERENCES soil.soil_samples(id),
  stage VARCHAR(50) NOT NULL,
  status VARCHAR(30) NOT NULL,
  location_name VARCHAR(150) NULL,
  handled_by UUID NOT NULL REFERENCES identity.users(id),
  remarks VARCHAR(250) NULL,
  
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

-- 4. Laboratory Receipts Table
CREATE TABLE soil.laboratory_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_id UUID NOT NULL REFERENCES soil.soil_samples(id),
  laboratory_id UUID NOT NULL REFERENCES master.laboratories(id),
  received_by UUID NOT NULL REFERENCES identity.users(id),
  received_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  condition VARCHAR(50) NOT NULL DEFAULT 'GOOD', -- GOOD, DAMAGED, MOIST
  verification_status VARCHAR(20) NOT NULL DEFAULT 'ACCEPTED' CHECK (verification_status IN ('ACCEPTED', 'REJECTED')),
  rejection_reason VARCHAR(250) NULL,
  
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

-- 5. Soil Test Results Master
CREATE TABLE soil.soil_test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_id UUID NOT NULL REFERENCES soil.soil_samples(id),
  laboratory_id UUID NOT NULL REFERENCES master.laboratories(id),
  tested_by UUID NOT NULL REFERENCES identity.users(id),
  test_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  overall_status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (overall_status IN ('PENDING', 'VERIFIED', 'APPROVED', 'REJECTED')),
  approved_by UUID NULL REFERENCES identity.users(id),
  approval_timestamp TIMESTAMP WITH TIME ZONE NULL,
  
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

-- 6. Soil Parameter Results Details
CREATE TABLE soil.soil_parameter_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_result_id UUID NOT NULL REFERENCES soil.soil_test_results(id),
  parameter_code VARCHAR(30) NOT NULL, -- pH, EC, OC, N, P, K, S, Zn, Fe, Cu, Mn, B
  parameter_name VARCHAR(50) NOT NULL,
  measured_value NUMERIC(10,4) NOT NULL,
  unit VARCHAR(20) NOT NULL,
  rating VARCHAR(30) NOT NULL, -- LOW, MEDIUM, HIGH, OPTIMAL, ACIDIC, ALKALINE
  reference_range VARCHAR(50) NULL,
  
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

-- 7. Soil Recommendations (AI / Scientific Advisory)
CREATE TABLE soil.soil_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_result_id UUID NOT NULL REFERENCES soil.soil_test_results(id),
  crop_id UUID NOT NULL REFERENCES master.crops(id),
  fertilizer_id UUID NULL REFERENCES master.fertilizers(id),
  recommended_dosage_kg_per_acre NUMERIC(10,2) NOT NULL,
  application_stage VARCHAR(50) NULL, -- BASAL, FIRST_SPLIT, SECOND_SPLIT
  advisory_text VARCHAR(500) NULL,
  
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

-- 8. Soil Health Index
CREATE TABLE soil.soil_health_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_result_id UUID NOT NULL REFERENCES soil.soil_test_results(id),
  overall_score NUMERIC(5,2) NOT NULL, -- 0 to 100
  health_category VARCHAR(30) NOT NULL, -- POOR, MODERATE, GOOD, EXCELLENT
  fertility_index NUMERIC(5,2) NOT NULL,
  
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

-- 9. Soil Report History
CREATE TABLE soil.soil_report_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_id UUID NOT NULL REFERENCES soil.soil_samples(id),
  pdf_report_url VARCHAR(500) NOT NULL,
  qr_digital_seal_url VARCHAR(500) NOT NULL,
  delivered_via VARCHAR(30) NOT NULL DEFAULT 'WHATSAPP', -- WHATSAPP, SMS, PORTAL, IN_PERSON
  delivery_timestamp TIMESTAMP WITH TIME ZONE NULL,
  
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

-- 10. Sample Payment
CREATE TABLE soil.sample_payment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_id UUID NOT NULL REFERENCES soil.soil_samples(id),
  amount NUMERIC(10,2) NOT NULL,
  payment_status VARCHAR(20) NOT NULL DEFAULT 'PAID' CHECK (payment_status IN ('PENDING', 'PAID', 'REFUNDED')),
  transaction_ref VARCHAR(100) NULL,
  
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

-- 11. Sample Labels
CREATE TABLE soil.sample_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_id UUID NOT NULL REFERENCES soil.soil_samples(id),
  qr_code VARCHAR(100) NOT NULL,
  printed_by UUID NOT NULL REFERENCES identity.users(id),
  printed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
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

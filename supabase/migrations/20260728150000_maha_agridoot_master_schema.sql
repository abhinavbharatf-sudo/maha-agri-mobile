-- MAHA-AGRIDOOT Master Database Migration (Phase 1)
-- Enterprise Schema Definition v3.0.0
-- Covers Geographic Admin, Workforce, EDP, Drone Fleet, Farmer Registry, Soil, Payments, IoT, AI, Subsidies & System Audits

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 1. GEOGRAPHIC ADMINISTRATION
CREATE TABLE IF NOT EXISTS maha_districts (
    district_id VARCHAR(50) PRIMARY KEY,
    district_name VARCHAR(100) NOT NULL,
    census_code VARCHAR(20) UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS maha_talukas (
    taluka_id VARCHAR(50) PRIMARY KEY,
    district_id VARCHAR(50) NOT NULL REFERENCES maha_districts(district_id) ON DELETE CASCADE,
    taluka_name VARCHAR(100) NOT NULL,
    census_code VARCHAR(20) UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS maha_villages (
    village_id VARCHAR(50) PRIMARY KEY,
    taluka_id VARCHAR(50) NOT NULL REFERENCES maha_talukas(taluka_id) ON DELETE CASCADE,
    village_name VARCHAR(100) NOT NULL,
    lgd_code VARCHAR(20) UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 2. WORKFORCE MANAGEMENT
CREATE TABLE IF NOT EXISTS maha_workforce_officers (
    officer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_code VARCHAR(30) UNIQUE NOT NULL,
    user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(30) NOT NULL CHECK (role IN ('ROOT_SUPER_ADMIN', 'STATE_ADMIN', 'DISTRICT_COORDINATOR', 'TALUKA_COORDINATOR', 'MAHA_AGRIDOOT')),
    assigned_district_id VARCHAR(50) NOT NULL REFERENCES maha_districts(district_id),
    assigned_taluka_id VARCHAR(50) NOT NULL REFERENCES maha_talukas(taluka_id),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS maha_workforce_attendance (
    attendance_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    officer_id UUID NOT NULL REFERENCES maha_workforce_officers(officer_id) ON DELETE CASCADE,
    check_in_timestamp TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    check_out_timestamp TIMESTAMPTZ,
    latitude NUMERIC(10, 6) NOT NULL,
    longitude NUMERIC(10, 6) NOT NULL,
    is_geofence_verified BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS maha_workforce_daily_diary (
    diary_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    officer_id UUID NOT NULL REFERENCES maha_workforce_officers(officer_id) ON DELETE CASCADE,
    diary_date DATE NOT NULL DEFAULT CURRENT_DATE,
    summary_notes TEXT NOT NULL,
    farmers_visited INTEGER NOT NULL DEFAULT 0,
    photo_evidence_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS maha_workforce_incentives (
    incentive_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    officer_id UUID NOT NULL REFERENCES maha_workforce_officers(officer_id) ON DELETE CASCADE,
    period_month VARCHAR(7) NOT NULL, -- YYYY-MM
    base_target_count INTEGER NOT NULL DEFAULT 0,
    achieved_count INTEGER NOT NULL DEFAULT 0,
    incentive_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(20) NOT NULL DEFAULT 'CALCULATED' CHECK (status IN ('CALCULATED', 'APPROVED', 'DISBURSED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 3. EDP ENTREPRENEUR OPERATING SYSTEM
CREATE TABLE IF NOT EXISTS maha_edp_applicants (
    applicant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_number VARCHAR(30) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    mobile_number VARCHAR(10) NOT NULL,
    assigned_district_id VARCHAR(50) NOT NULL REFERENCES maha_districts(district_id),
    assigned_taluka_id VARCHAR(50) NOT NULL REFERENCES maha_talukas(taluka_id),
    entrepreneur_type VARCHAR(30) NOT NULL CHECK (entrepreneur_type IN ('AGRI_GENERAL', 'DRONE_SPECIALIST')),
    current_stage VARCHAR(30) NOT NULL DEFAULT 'REGISTRATION',
    risk_score_level VARCHAR(20) NOT NULL DEFAULT 'LOW' CHECK (risk_score_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS maha_edp_cohorts (
    cohort_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cohort_code VARCHAR(50) UNIQUE NOT NULL,
    training_center_name VARCHAR(100) NOT NULL,
    batch_capacity INTEGER NOT NULL DEFAULT 30,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS maha_edp_assets (
    asset_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    applicant_id UUID NOT NULL REFERENCES maha_edp_applicants(applicant_id) ON DELETE CASCADE,
    serial_number VARCHAR(50) UNIQUE NOT NULL,
    asset_type VARCHAR(50) NOT NULL,
    stage VARCHAR(30) NOT NULL DEFAULT 'SANCTIONED' CHECK (stage IN ('SANCTIONED', 'PURCHASED', 'INSPECTED', 'COMMISSIONED', 'ACTIVE_OPERATION', 'AMC_MAINTENANCE', 'REPLACEMENT', 'DISPOSED')),
    inspection_latitude NUMERIC(10, 6),
    inspection_longitude NUMERIC(10, 6),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS maha_edp_performance (
    performance_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    applicant_id UUID NOT NULL REFERENCES maha_edp_applicants(applicant_id) ON DELETE CASCADE,
    monthly_revenue NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    farmers_served INTEGER NOT NULL DEFAULT 0,
    acres_covered NUMERIC(8, 2) NOT NULL DEFAULT 0.00,
    customer_rating NUMERIC(3, 2) NOT NULL DEFAULT 5.00 CHECK (customer_rating BETWEEN 1.00 AND 5.00),
    recorded_month VARCHAR(7) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 4. DRONE FLEET ENGINE
CREATE TABLE IF NOT EXISTS maha_drone_fleet (
    drone_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entrepreneur_id UUID NOT NULL REFERENCES maha_edp_applicants(applicant_id) ON DELETE CASCADE,
    uin_number VARCHAR(50) UNIQUE NOT NULL,
    drone_model VARCHAR(100) NOT NULL,
    payload_capacity_liters NUMERIC(5, 2) NOT NULL DEFAULT 10.00,
    total_flight_hours NUMERIC(8, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'IN_FLIGHT', 'MAINTENANCE_DUE', 'DECOMMISSIONED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS maha_drone_flights (
    flight_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    drone_id UUID NOT NULL REFERENCES maha_drone_fleet(drone_id) ON DELETE CASCADE,
    pilot_rpl_number VARCHAR(50) NOT NULL,
    start_timestamp TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    end_timestamp TIMESTAMPTZ,
    acres_sprayed NUMERIC(8, 2) NOT NULL DEFAULT 0.00,
    telemetry_geojson JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('IN_PROGRESS', 'COMPLETED', 'ABORTED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS maha_drone_maintenance (
    maintenance_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    drone_id UUID NOT NULL REFERENCES maha_drone_fleet(drone_id) ON DELETE CASCADE,
    service_date DATE NOT NULL DEFAULT CURRENT_DATE,
    flight_hours_at_service NUMERIC(8, 2) NOT NULL,
    serviced_by VARCHAR(100) NOT NULL,
    parts_replaced TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 5. FARMER MASTER REGISTRY
CREATE TABLE IF NOT EXISTS maha_farmer_registry (
    farmer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agri_id VARCHAR(20) UNIQUE NOT NULL,
    user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
    full_name VARCHAR(100) NOT NULL,
    mobile_number VARCHAR(10) UNIQUE NOT NULL,
    aadhaar_hash VARCHAR(64) UNIQUE NOT NULL,
    gender VARCHAR(10) CHECK (gender IN ('MALE', 'FEMALE', 'OTHER')),
    category VARCHAR(20) DEFAULT 'GENERAL' CHECK (category IN ('GENERAL', 'OBC', 'SC', 'ST')),
    assigned_district_id VARCHAR(50) NOT NULL REFERENCES maha_districts(district_id),
    assigned_taluka_id VARCHAR(50) NOT NULL REFERENCES maha_talukas(taluka_id),
    assigned_village_id VARCHAR(50) NOT NULL REFERENCES maha_villages(village_id),
    bank_account_number VARCHAR(30),
    ifsc_code VARCHAR(11),
    npci_seeded BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS maha_farmer_landholdings (
    land_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmer_id UUID NOT NULL REFERENCES maha_farmer_registry(farmer_id) ON DELETE CASCADE,
    survey_number VARCHAR(50) NOT NULL,
    khata_number VARCHAR(50) NOT NULL,
    total_area_acres NUMERIC(8, 2) NOT NULL,
    irrigated_area_acres NUMERIC(8, 2) NOT NULL DEFAULT 0.00,
    primary_crop VARCHAR(50),
    is_712_verified BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS maha_farmer_kyc_audit (
    kyc_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmer_id UUID NOT NULL REFERENCES maha_farmer_registry(farmer_id) ON DELETE CASCADE,
    verification_method VARCHAR(30) NOT NULL CHECK (verification_method IN ('AADHAAR_QR', 'BIOMETRIC', 'MANUAL_OFFICER')),
    verified_by_officer_id UUID,
    verified_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 6. LAND & CROP HEALTH
CREATE TABLE IF NOT EXISTS maha_land_parcels (
    parcel_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmer_id UUID NOT NULL REFERENCES maha_farmer_registry(farmer_id) ON DELETE CASCADE,
    survey_number VARCHAR(50) NOT NULL,
    khata_number VARCHAR(50) NOT NULL,
    area_acres NUMERIC(8, 2) NOT NULL,
    boundary_geojson JSONB NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS maha_crop_advisories (
    advisory_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmer_id UUID NOT NULL REFERENCES maha_farmer_registry(farmer_id) ON DELETE CASCADE,
    parcel_id UUID NOT NULL REFERENCES maha_land_parcels(parcel_id),
    crop_name VARCHAR(50) NOT NULL,
    advisory_type VARCHAR(30) CHECK (advisory_type IN ('FERTILIZER', 'PEST_CONTROL', 'IRRIGATION', 'HARVEST')),
    advisory_text TEXT NOT NULL,
    issued_date DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE TABLE IF NOT EXISTS maha_soil_samples (
    sample_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sample_code VARCHAR(30) UNIQUE NOT NULL,
    farmer_id UUID NOT NULL REFERENCES maha_farmer_registry(farmer_id) ON DELETE CASCADE,
    parcel_id UUID NOT NULL REFERENCES maha_land_parcels(parcel_id),
    collector_officer_id UUID NOT NULL REFERENCES maha_workforce_officers(officer_id),
    collection_latitude NUMERIC(10, 6) NOT NULL,
    collection_longitude NUMERIC(10, 6) NOT NULL,
    collection_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'COLLECTED' CHECK (status IN ('COLLECTED', 'IN_LAB', 'ANALYZED', 'COMPLETED'))
);

CREATE TABLE IF NOT EXISTS maha_soil_health_cards (
    shc_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sample_id UUID UNIQUE NOT NULL REFERENCES maha_soil_samples(sample_id) ON DELETE CASCADE,
    ph_level NUMERIC(4, 2) NOT NULL,
    nitrogen_kg_ha NUMERIC(6, 2) NOT NULL,
    phosphorus_kg_ha NUMERIC(6, 2) NOT NULL,
    potassium_kg_ha NUMERIC(6, 2) NOT NULL,
    organic_carbon_percent NUMERIC(4, 2) NOT NULL,
    recommendation_text TEXT NOT NULL,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 7. PAYMENTS & FINANCIAL LEDGER
CREATE TABLE IF NOT EXISTS maha_payment_wallets (
    wallet_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_type VARCHAR(30) NOT NULL CHECK (account_type IN ('FARMER', 'ENTREPRENEUR', 'OFFICER')),
    current_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (current_balance >= 0),
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS maha_payment_transactions (
    transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    txn_reference VARCHAR(50) UNIQUE NOT NULL,
    from_wallet_id UUID REFERENCES maha_payment_wallets(wallet_id),
    to_wallet_id UUID REFERENCES maha_payment_wallets(wallet_id),
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    txn_type VARCHAR(30) NOT NULL CHECK (txn_type IN ('SUBSIDY_DBT', 'SERVICE_PAYMENT', 'INCENTIVE_CREDIT', 'REFUND')),
    status VARCHAR(20) NOT NULL DEFAULT 'SUCCESS' CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED', 'REVERSED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 8. SYSTEM AUDIT & SUPPORT TICKETS
CREATE TABLE IF NOT EXISTS maha_system_audit_logs (
    audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id UUID NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    payload_before JSONB,
    payload_after JSONB,
    client_ip VARCHAR(45) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS maha_support_tickets (
    ticket_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number VARCHAR(30) UNIQUE NOT NULL,
    raised_by_user_id UUID NOT NULL,
    category VARCHAR(50) NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- INDEXES FOR HIGH-FREQUENCY QUERIES
CREATE INDEX IF NOT EXISTS idx_farmer_agri_id ON maha_farmer_registry (agri_id);
CREATE INDEX IF NOT EXISTS idx_farmer_mobile ON maha_farmer_registry (mobile_number);
CREATE INDEX IF NOT EXISTS idx_drone_uin ON maha_drone_fleet (uin_number);
CREATE INDEX IF NOT EXISTS idx_workforce_district ON maha_workforce_officers (assigned_district_id, assigned_taluka_id);
CREATE INDEX IF NOT EXISTS idx_edp_applicant_stage ON maha_edp_applicants (current_stage, risk_score_level);

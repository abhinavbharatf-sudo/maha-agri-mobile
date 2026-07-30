-- ============================================================================
-- MAHA-AGRI Government Digital Operations Platform
-- Phase 1 Database Script: 026_seed_data.sql
-- 
-- Purpose: Initial Seed Data for System Admin, 11 Core Roles, Maharashtra Geography, Crops, and System Settings.
-- Execution Order: 026 / 030
-- Dependencies: 001_extensions.sql to 025_views.sql
-- Rollback Notes: DELETE FROM <schema_name>.<table_name>;
-- ============================================================================

-- 1. System System Account (UUID Zero Base)
INSERT INTO identity.users (
  id, employee_code, mobile_number, email, password_hash, full_name_en, full_name_mr, status, first_login, created_by, updated_by
) VALUES (
  '00000000-0000-0000-0000-000000000001', 'MA-SUP-0001', '9876543210', 'admin@abhinavbharat.org', 
  crypt('Admin@123', gen_salt('bf')), 'Super Admin Officer', 'सुपर ॲडमिन अधिकारी', 'ACTIVE', FALSE,
  '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (mobile_number) DO NOTHING;

-- 2. Register 11 Core Roles
INSERT INTO identity.roles (id, key, name_en, name_mr, hierarchy_level, description, created_by, updated_by) VALUES
('role-00000000-0000-0000-0000-000000000001', 'SUPER_ADMIN', 'Super Admin', 'सुपर ॲडमिन', 1, 'Full platform system access', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
('role-00000000-0000-0000-0000-000000000002', 'STATE_ADMIN', 'State Administrator', 'राज्य प्रशासक', 2, 'Statewide operational management', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
('role-00000000-0000-0000-0000-000000000003', 'DISTRICT_COORDINATOR', 'District Coordinator', 'जिल्हा समन्वयक', 3, 'District operations coordinator', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
('role-00000000-0000-0000-0000-000000000004', 'TALUKA_COORDINATOR', 'Taluka Coordinator', 'तालुका समन्वयक', 4, 'Taluka operations coordinator', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
('role-00000000-0000-0000-0000-000000000005', 'MAHA_AGRIDOOT', 'MAHA-AGRIDOOT', 'महा-कृषीदूत', 5, 'Field service and sample collector', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
('role-00000000-0000-0000-0000-000000000006', 'LAB_ADMIN', 'Laboratory Administrator', 'प्रयोगशाळा प्रशासक', 4, 'Laboratory operations manager', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
('role-00000000-0000-0000-0000-000000000007', 'LAB_TECHNICIAN', 'Laboratory Technician', 'प्रयोगशाळा तंत्रज्ञ', 5, 'Soil parameter analyst', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
('role-00000000-0000-0000-0000-000000000008', 'ENTREPRENEUR', 'Entrepreneur', 'कृषी उद्योजक', 5, 'Agri input & service center operator', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
('role-00000000-0000-0000-0000-000000000009', 'DRONE_PILOT', 'Drone Pilot', 'ड्रोन पायलट', 5, 'Certified spray drone operator', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
('role-00000000-0000-0000-0000-000000000010', 'FINANCE_OFFICER', 'Finance Officer', 'वित्त अधिकारी', 3, 'Accounting & payout manager', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
('role-00000000-0000-0000-0000-000000000011', 'FARMER', 'Farmer', 'शेतकरी', 6, 'Beneficiary farmer citizen', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (key) DO NOTHING;

-- Assign Super Admin Role to System User
INSERT INTO identity.user_roles (user_id, role_id, is_primary, created_by, updated_by) VALUES (
  '00000000-0000-0000-0000-000000000001', 'role-00000000-0000-0000-0000-000000000001', TRUE,
  '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'
) ON CONFLICT DO NOTHING;

-- 3. Maharashtra Divisions Seed
INSERT INTO master.divisions (id, code, name_en, name_mr, created_by, updated_by) VALUES
('div-0001', 'NAGPUR', 'Nagpur Division', 'नागपूर विभाग', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
('div-0002', 'AMRAVATI', 'Amravati Division', 'अमरावती विभाग', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
('div-0003', 'PUNE', 'Pune Division', 'पुणे विभाग', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (code) DO NOTHING;

-- 4. Wardha District & Nagpur District Seed
INSERT INTO master.districts (id, division_id, code, name_en, name_mr, census_code, created_by, updated_by) VALUES
('dist-0001', 'div-0001', 'WARDHA', 'Wardha', 'वर्धा', '504', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
('dist-0002', 'div-0001', 'NAGPUR', 'Nagpur', 'नागपूर', '505', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (code) DO NOTHING;

-- 5. Wardha District 8 Talukas Seed
INSERT INTO master.talukas (id, district_id, code, name_en, name_mr, created_by, updated_by) VALUES
('tal-0001', 'dist-0001', 'WARDHA_T', 'Wardha', 'वर्धा', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
('tal-0002', 'dist-0001', 'ARVI', 'Arvi', 'आर्वी', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
('tal-0003', 'dist-0001', 'ASHTI', 'Ashti', 'आष्टी', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
('tal-0004', 'dist-0001', 'DEOLI', 'Deoli', 'देवळी', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
('tal-0005', 'dist-0001', 'HINGANGHAT', 'Hinganghat', 'हिंगणघाट', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
('tal-0006', 'dist-0001', 'KARANJA', 'Karanja', 'कारंजा', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
('tal-0007', 'dist-0001', 'SAMUDRAPUR', 'Samudrapur', 'समुद्रपूर', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
('tal-0008', 'dist-0001', 'SELOO', 'Seloo', 'सेलू', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (code) DO NOTHING;

-- 6. Major Crops Seed
INSERT INTO master.crops (id, code, name_en, name_mr, category, created_by, updated_by) VALUES
('crop-0001', 'COTTON', 'Cotton', 'कापूस', 'Kharif', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
('crop-0002', 'SOYBEAN', 'Soybean', 'सोयाबीन', 'Kharif', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
('crop-0003', 'TUR', 'Pigeon Pea (Tur)', 'तूर', 'Kharif', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
('crop-0004', 'WHEAT', 'Wheat', 'गहू', 'Rabi', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
('crop-0005', 'GRAM', 'Bengal Gram (Harbara)', 'हरभरा', 'Rabi', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (code) DO NOTHING;

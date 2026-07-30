-- ============================================================================
-- MAHA-AGRI Government Digital Operations Platform
-- Phase 1 Database Script: 027_permissions.sql
-- 
-- Purpose: Grant Schema Usage, Table Access, and Function Execution Roles.
-- Execution Order: 027 / 030
-- Dependencies: 001_extensions.sql to 026_seed_data.sql
-- Rollback Notes: REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA <schema_name> FROM <role_name>;
-- ============================================================================

-- Grant Usage on 20 Schemas to Public Execution Roles
GRANT USAGE ON SCHEMA identity, master, farmer, soil, laboratory, entrepreneur, drone, edp, finance, workflow, notification, document, audit, analytics, ai, gis, security, configuration, integration, scheduler TO PUBLIC;

-- Seed Default 10 Operational Permission Keys into identity.permissions
INSERT INTO identity.permissions (id, key, module, action, description, created_by, updated_by) VALUES
('perm-0001', 'farmer:view', 'FARMER', 'VIEW', 'View farmer profiles and land parcels', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
('perm-0002', 'farmer:create', 'FARMER', 'CREATE', 'Register new farmers and land parcels', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
('perm-0003', 'soil:sample:register', 'SOIL', 'CREATE', 'Register soil sample collection', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
('perm-0004', 'soil:test:results:enter', 'SOIL', 'UPDATE', 'Enter laboratory soil parameters', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
('perm-0005', 'soil:report:approve', 'SOIL', 'APPROVE', 'Approve soil test reports', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
('perm-0006', 'drone:mission:book', 'DRONE', 'CREATE', 'Book drone spray missions', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
('perm-0007', 'edp:candidate:register', 'EDP', 'CREATE', 'Register EDP candidates', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
('perm-0008', 'finance:invoice:create', 'FINANCE', 'CREATE', 'Generate financial invoices', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
('perm-0009', 'finance:payout:settle', 'FINANCE', 'APPROVE', 'Settle wallet payouts', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
('perm-0010', 'audit:logs:view', 'AUDIT', 'AUDIT', 'View system security audit logs', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (key) DO NOTHING;

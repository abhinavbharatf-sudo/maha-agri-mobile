-- ============================================================================
-- MAHA-AGRI Government Digital Operations Platform
-- Phase 1 Database Script: 028_validation_queries.sql
-- 
-- Purpose: Diagnostic Validation Queries to verify Database Completeness & Integrity.
-- Execution Order: 028 / 030
-- Dependencies: 001_extensions.sql to 027_permissions.sql
-- Rollback Notes: Read-only SELECT queries; no rollback required.
-- ============================================================================

-- 1. Verify 20 Schemas
SELECT schema_name 
FROM information_schema.schemata 
WHERE schema_name IN (
  'identity', 'master', 'farmer', 'soil', 'laboratory', 'entrepreneur', 
  'drone', 'edp', 'finance', 'workflow', 'notification', 'document', 
  'audit', 'analytics', 'ai', 'gis', 'security', 'configuration', 
  'integration', 'scheduler'
)
ORDER BY schema_name;

-- 2. Verify Table Count per Schema
SELECT table_schema, COUNT(table_name) AS table_count
FROM information_schema.tables
WHERE table_schema IN (
  'identity', 'master', 'farmer', 'soil', 'laboratory', 'entrepreneur', 
  'drone', 'edp', 'finance', 'workflow', 'notification', 'document', 
  'audit', 'analytics', 'ai', 'gis', 'security', 'configuration', 
  'integration', 'scheduler'
)
GROUP BY table_schema
ORDER BY table_schema;

-- 3. Verify Mandatory 9 Audit Columns Baseline Across All Tables
SELECT 
  table_schema, 
  table_name, 
  COUNT(column_name) AS audit_column_count
FROM information_schema.columns
WHERE column_name IN ('id', 'created_at', 'created_by', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', 'is_deleted', 'record_version')
  AND table_schema NOT IN ('information_schema', 'pg_catalog', 'public')
GROUP BY table_schema, table_name
HAVING COUNT(column_name) = 9
ORDER BY table_schema, table_name;

-- 4. Verify Super Admin User & Roles Seed
SELECT u.employee_code, u.mobile_number, u.email, r.key AS role_key
FROM identity.users u
JOIN identity.user_roles ur ON ur.user_id = u.id
JOIN identity.roles r ON ur.role_id = r.id;

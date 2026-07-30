-- ============================================================================
-- MAHA-AGRI Government Digital Operations Platform
-- Phase 1 Database Script: 029_database_health_checks.sql
-- 
-- Purpose: Production Database Health Checks, Index Usage & Lock Monitoring.
-- Execution Order: 029 / 030
-- Dependencies: 001_extensions.sql to 028_validation_queries.sql
-- Rollback Notes: Read-only SELECT queries; no rollback required.
-- ============================================================================

-- 1. Database Size & Table Sizes Report
SELECT 
  table_schema,
  table_name,
  pg_size_pretty(pg_total_relation_size(quote_ident(table_schema) || '.' || quote_ident(table_name))) AS total_size
FROM information_schema.tables
WHERE table_schema NOT IN ('information_schema', 'pg_catalog', 'public')
ORDER BY pg_total_relation_size(quote_ident(table_schema) || '.' || quote_ident(table_name)) DESC;

-- 2. Active Connections & Current Queries State
SELECT pid, usename, client_addr, state, query, age(clock_timestamp(), query_start) AS duration
FROM pg_stat_activity
WHERE state != 'idle' AND pid != pg_backend_pid()
ORDER BY duration DESC;

-- 3. Unused Index Diagnostics
SELECT 
  schemaname, 
  relname AS table_name, 
  indexrelname AS index_name, 
  idx_scan
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC, relname;

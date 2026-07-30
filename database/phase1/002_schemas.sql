-- ============================================================================
-- MAHA-AGRI Government Digital Operations Platform
-- Phase 1 Database Script: 002_schemas.sql
-- 
-- Purpose: Create all 20 enterprise schemas for modular domain separation.
-- Execution Order: 002 / 030
-- Dependencies: 001_extensions.sql
-- Rollback Notes: DROP SCHEMA IF EXISTS <schema_name> CASCADE;
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS identity;
CREATE SCHEMA IF NOT EXISTS master;
CREATE SCHEMA IF NOT EXISTS farmer;
CREATE SCHEMA IF NOT EXISTS soil;
CREATE SCHEMA IF NOT EXISTS laboratory;
CREATE SCHEMA IF NOT EXISTS entrepreneur;
CREATE SCHEMA IF NOT EXISTS drone;
CREATE SCHEMA IF NOT EXISTS edp;
CREATE SCHEMA IF NOT EXISTS finance;
CREATE SCHEMA IF NOT EXISTS workflow;
CREATE SCHEMA IF NOT EXISTS notification;
CREATE SCHEMA IF NOT EXISTS document;
CREATE SCHEMA IF NOT EXISTS audit;
CREATE SCHEMA IF NOT EXISTS analytics;
CREATE SCHEMA IF NOT EXISTS ai;
CREATE SCHEMA IF NOT EXISTS gis;
CREATE SCHEMA IF NOT EXISTS security;
CREATE SCHEMA IF NOT EXISTS configuration;
CREATE SCHEMA IF NOT EXISTS integration;
CREATE SCHEMA IF NOT EXISTS scheduler;

-- Comments on Schemas
COMMENT ON SCHEMA identity IS 'User accounts, RBAC roles, sessions, and auth logs';
COMMENT ON SCHEMA master IS 'Maharashtra geography, crops, fertilizers, lab masters';
COMMENT ON SCHEMA farmer IS 'Farmer profiles, 360 view, land parcels, bank accounts, documents';
COMMENT ON SCHEMA soil IS 'Soil testing lifecycle, QR codes, health index, recommendations';
COMMENT ON SCHEMA laboratory IS 'Lab management, equipment, testing batches, QC logs';
COMMENT ON SCHEMA entrepreneur IS 'Agri-entrepreneur ERP, product catalog, inventory, sales, wallet';
COMMENT ON SCHEMA drone IS 'Drone fleet, certified pilots, spray missions, flight logs';
COMMENT ON SCHEMA edp IS 'Entrepreneurship Development Programme, courses, batches, placements';
COMMENT ON SCHEMA finance IS 'Enterprise double-entry ledger, invoices, payments, settlements, GST';
COMMENT ON SCHEMA workflow IS 'Configurable state machine workflows, tasks, SLA tracking';
COMMENT ON SCHEMA notification IS 'Multi-channel notifications (SMS, WhatsApp, Email, Push)';
COMMENT ON SCHEMA document IS 'Vault for documents, versioning, and digital signatures';
COMMENT ON SCHEMA audit IS 'Immutable system, activity, and security audit logs';
COMMENT ON SCHEMA analytics IS 'Dashboard KPIs, snapshots, and analytical reports';
COMMENT ON SCHEMA ai IS 'AI recommendation models, requests, and feedback';
COMMENT ON SCHEMA gis IS 'Geographic land, village boundaries, and drone flight paths';
COMMENT ON SCHEMA security IS 'Infrastructure and application security policy matrices';
COMMENT ON SCHEMA configuration IS 'Global system parameters and feature flags';
COMMENT ON SCHEMA integration IS 'External system webhooks and gateway state connectors';
COMMENT ON SCHEMA scheduler IS 'Cron jobs and background scheduled tasks';

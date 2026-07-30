-- ============================================================================
-- MAHA-AGRI Government Digital Operations Platform
-- Phase 1 Database Script: 025_views.sql
-- 
-- Purpose: Analytical & Operational Views (Farmer 360, Soil Testing Pipeline, Lab TAT Performance).
-- Execution Order: 025 / 030
-- Dependencies: 001_extensions.sql to 024_triggers.sql
-- Rollback Notes: DROP VIEW IF EXISTS analytics.<view_name>;
-- ============================================================================

-- 1. Farmer 360 Consolidated Operational View
CREATE OR REPLACE VIEW analytics.v_farmer_360_overview AS
SELECT 
  f.id AS farmer_id,
  f.farmer_code,
  f.first_name_en || ' ' || f.last_name_en AS farmer_name_en,
  f.mobile_number,
  f.category,
  f.farmer_type,
  f.status AS farmer_status,
  d.name_en AS district_name,
  t.name_en AS taluka_name,
  v.name_en AS village_name,
  COUNT(DISTINCT lp.id) AS total_land_parcels,
  COALESCE(SUM(lp.total_area_acres), 0.0) AS total_land_acres,
  COUNT(DISTINCT ss.id) AS total_soil_samples_submitted
FROM farmer.farmers f
LEFT JOIN farmer.farmer_addresses fa ON fa.farmer_id = f.id AND fa.is_primary = TRUE AND fa.is_deleted = FALSE
LEFT JOIN master.districts d ON fa.district_id = d.id
LEFT JOIN master.talukas t ON fa.taluka_id = t.id
LEFT JOIN master.villages v ON fa.village_id = v.id
LEFT JOIN farmer.farmer_land_parcels lp ON lp.farmer_id = f.id AND lp.is_deleted = FALSE
LEFT JOIN soil.soil_samples ss ON ss.farmer_id = f.id AND ss.is_deleted = FALSE
WHERE f.is_deleted = FALSE
GROUP BY f.id, f.farmer_code, f.first_name_en, f.last_name_en, f.mobile_number, f.category, f.farmer_type, f.status, d.name_en, t.name_en, v.name_en;

-- 2. Soil Testing Pipeline Tracker View
CREATE OR REPLACE VIEW analytics.v_soil_testing_pipeline AS
SELECT 
  ss.id AS sample_id,
  ss.sample_code,
  ss.qr_code,
  ss.status AS sample_status,
  f.farmer_code,
  f.first_name_en || ' ' || f.last_name_en AS farmer_name,
  l.name_en AS lab_name,
  ss.created_at AS registered_at,
  lr.received_timestamp AS lab_received_at,
  str.approval_timestamp AS approved_at
FROM soil.soil_samples ss
JOIN farmer.farmers f ON ss.farmer_id = f.id
LEFT JOIN master.laboratories l ON ss.laboratory_id = l.id
LEFT JOIN soil.laboratory_receipts lr ON lr.sample_id = ss.id AND lr.is_deleted = FALSE
LEFT JOIN soil.soil_test_results str ON str.sample_id = ss.id AND str.is_deleted = FALSE
WHERE ss.is_deleted = FALSE;

-- 3. Laboratory Turnaround Time (TAT) Performance View
CREATE OR REPLACE VIEW analytics.v_lab_tat_performance AS
SELECT 
  l.id AS lab_id,
  l.name_en AS lab_name,
  COUNT(ss.id) AS total_samples_processed,
  AVG(EXTRACT(EPOCH FROM (str.approval_timestamp - lr.received_timestamp))/3600)::NUMERIC(10,2) AS avg_tat_hours
FROM master.laboratories l
JOIN soil.laboratory_receipts lr ON lr.laboratory_id = l.id AND lr.is_deleted = FALSE
JOIN soil.soil_test_results str ON str.sample_id = lr.sample_id AND str.overall_status = 'APPROVED' AND str.is_deleted = FALSE
JOIN soil.soil_samples ss ON str.sample_id = ss.id AND ss.is_deleted = FALSE
WHERE l.is_deleted = FALSE
GROUP BY l.id, l.name_en;

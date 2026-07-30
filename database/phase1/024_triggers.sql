-- ============================================================================
-- MAHA-AGRI Government Digital Operations Platform
-- Phase 1 Database Script: 024_triggers.sql
-- 
-- Purpose: Attach Audit Triggers (BEFORE UPDATE) across all domain tables.
-- Execution Order: 024 / 030
-- Dependencies: 001_extensions.sql to 023_functions.sql
-- Rollback Notes: DROP TRIGGER IF EXISTS <trigger_name> ON <schema_name>.<table_name>;
-- ============================================================================

-- Master Data Triggers
CREATE TRIGGER trg_divisions_audit BEFORE UPDATE ON master.divisions FOR EACH ROW EXECUTE FUNCTION tf_update_audit_columns();
CREATE TRIGGER trg_districts_audit BEFORE UPDATE ON master.districts FOR EACH ROW EXECUTE FUNCTION tf_update_audit_columns();
CREATE TRIGGER trg_talukas_audit BEFORE UPDATE ON master.talukas FOR EACH ROW EXECUTE FUNCTION tf_update_audit_columns();
CREATE TRIGGER trg_villages_audit BEFORE UPDATE ON master.villages FOR EACH ROW EXECUTE FUNCTION tf_update_audit_columns();

-- Identity Triggers
CREATE TRIGGER trg_users_audit BEFORE UPDATE ON identity.users FOR EACH ROW EXECUTE FUNCTION tf_update_audit_columns();
CREATE TRIGGER trg_roles_audit BEFORE UPDATE ON identity.roles FOR EACH ROW EXECUTE FUNCTION tf_update_audit_columns();
CREATE TRIGGER trg_permissions_audit BEFORE UPDATE ON identity.permissions FOR EACH ROW EXECUTE FUNCTION tf_update_audit_columns();

-- Farmer Triggers
CREATE TRIGGER trg_farmers_audit BEFORE UPDATE ON farmer.farmers FOR EACH ROW EXECUTE FUNCTION tf_update_audit_columns();
CREATE TRIGGER trg_farmer_addresses_audit BEFORE UPDATE ON farmer.farmer_addresses FOR EACH ROW EXECUTE FUNCTION tf_update_audit_columns();
CREATE TRIGGER trg_farmer_land_parcels_audit BEFORE UPDATE ON farmer.farmer_land_parcels FOR EACH ROW EXECUTE FUNCTION tf_update_audit_columns();

-- Soil Triggers
CREATE TRIGGER trg_soil_samples_audit BEFORE UPDATE ON soil.soil_samples FOR EACH ROW EXECUTE FUNCTION tf_update_audit_columns();
CREATE TRIGGER trg_soil_test_results_audit BEFORE UPDATE ON soil.soil_test_results FOR EACH ROW EXECUTE FUNCTION tf_update_audit_columns();

-- Laboratory Triggers
CREATE TRIGGER trg_lab_users_audit BEFORE UPDATE ON laboratory.laboratory_users FOR EACH ROW EXECUTE FUNCTION tf_update_audit_columns();
CREATE TRIGGER trg_lab_equipment_audit BEFORE UPDATE ON laboratory.laboratory_equipment FOR EACH ROW EXECUTE FUNCTION tf_update_audit_columns();

-- Entrepreneur Triggers
CREATE TRIGGER trg_entrepreneurs_audit BEFORE UPDATE ON entrepreneur.entrepreneurs FOR EACH ROW EXECUTE FUNCTION tf_update_audit_columns();
CREATE TRIGGER trg_products_audit BEFORE UPDATE ON entrepreneur.products FOR EACH ROW EXECUTE FUNCTION tf_update_audit_columns();
CREATE TRIGGER trg_inventory_audit BEFORE UPDATE ON entrepreneur.inventory FOR EACH ROW EXECUTE FUNCTION tf_update_audit_columns();

-- Drone Triggers
CREATE TRIGGER trg_drones_audit BEFORE UPDATE ON drone.drones FOR EACH ROW EXECUTE FUNCTION tf_update_audit_columns();
CREATE TRIGGER trg_drone_missions_audit BEFORE UPDATE ON drone.drone_missions FOR EACH ROW EXECUTE FUNCTION tf_update_audit_columns();

-- EDP Triggers
CREATE TRIGGER trg_candidates_audit BEFORE UPDATE ON edp.candidates FOR EACH ROW EXECUTE FUNCTION tf_update_audit_columns();
CREATE TRIGGER trg_training_batches_audit BEFORE UPDATE ON edp.training_batches FOR EACH ROW EXECUTE FUNCTION tf_update_audit_columns();

-- Finance Triggers
CREATE TRIGGER trg_chart_of_accounts_audit BEFORE UPDATE ON finance.chart_of_accounts FOR EACH ROW EXECUTE FUNCTION tf_update_audit_columns();
CREATE TRIGGER trg_invoices_audit BEFORE UPDATE ON finance.invoices FOR EACH ROW EXECUTE FUNCTION tf_update_audit_columns();
CREATE TRIGGER trg_wallet_accounts_audit BEFORE UPDATE ON finance.wallet_accounts FOR EACH ROW EXECUTE FUNCTION tf_update_audit_columns();

-- Workflow & Document Triggers
CREATE TRIGGER trg_workflow_instances_audit BEFORE UPDATE ON workflow.workflow_instances FOR EACH ROW EXECUTE FUNCTION tf_update_audit_columns();
CREATE TRIGGER trg_tasks_audit BEFORE UPDATE ON workflow.tasks FOR EACH ROW EXECUTE FUNCTION tf_update_audit_columns();
CREATE TRIGGER trg_documents_audit BEFORE UPDATE ON document.documents FOR EACH ROW EXECUTE FUNCTION tf_update_audit_columns();

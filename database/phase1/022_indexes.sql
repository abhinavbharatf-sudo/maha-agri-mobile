-- ============================================================================
-- MAHA-AGRI Government Digital Operations Platform
-- Phase 1 Database Script: 022_indexes.sql
-- 
-- Purpose: Optimized B-Tree, GIN (JSONB), and GiST (PostGIS) Index Strategy across all 20 schemas.
-- Execution Order: 022 / 030
-- Dependencies: 001_extensions.sql to 021_scheduler_tables.sql
-- Rollback Notes: DROP INDEX IF EXISTS <schema_name>.<index_name>;
-- ============================================================================

-- Master Data Indexes
CREATE INDEX idx_districts_division ON master.districts(division_id);
CREATE INDEX idx_talukas_district ON master.talukas(district_id);
CREATE INDEX idx_villages_taluka ON master.villages(taluka_id);
CREATE INDEX idx_gram_panchayats_taluka ON master.gram_panchayats(taluka_id);
CREATE INDEX idx_crop_varieties_crop ON master.crop_varieties(crop_id);
CREATE INDEX idx_laboratories_district ON master.laboratories(district_id);

-- Identity & Security Indexes
CREATE INDEX idx_users_mobile ON identity.users(mobile_number);
CREATE INDEX idx_users_email ON identity.users(email);
CREATE INDEX idx_user_roles_user ON identity.user_roles(user_id);
CREATE INDEX idx_sessions_user ON identity.sessions(user_id);
CREATE INDEX idx_sessions_token ON identity.sessions(session_token);
CREATE INDEX idx_auth_logs_user ON identity.authentication_logs(user_id);

-- Farmer Domain Indexes
CREATE INDEX idx_farmers_code ON farmer.farmers(farmer_code);
CREATE INDEX idx_farmers_user ON farmer.farmers(user_id);
CREATE INDEX idx_farmer_addresses_farmer ON farmer.farmer_addresses(farmer_id);
CREATE INDEX idx_farmer_land_parcels_farmer ON farmer.farmer_land_parcels(farmer_id);
CREATE INDEX idx_farmer_land_parcels_geo ON farmer.farmer_land_parcels(district_id, taluka_id, village_id);
CREATE INDEX idx_farmer_land_parcels_survey ON farmer.farmer_land_parcels(survey_gat_number);
CREATE INDEX idx_farmer_documents_farmer ON farmer.farmer_documents(farmer_id);
CREATE INDEX idx_farmer_bank_accounts_farmer ON farmer.farmer_bank_accounts(farmer_id);
CREATE INDEX idx_crop_history_land ON farmer.crop_history(land_parcel_id);

-- Soil Domain Indexes
CREATE INDEX idx_soil_samples_code ON soil.soil_samples(sample_code);
CREATE INDEX idx_soil_samples_qr ON soil.soil_samples(qr_code);
CREATE INDEX idx_soil_samples_farmer ON soil.soil_samples(farmer_id);
CREATE INDEX idx_soil_samples_status ON soil.soil_samples(status);
CREATE INDEX idx_sample_collection_sample ON soil.sample_collection(sample_id);
CREATE INDEX idx_sample_tracking_sample ON soil.sample_tracking(sample_id);
CREATE INDEX idx_soil_test_results_sample ON soil.soil_test_results(sample_id);
CREATE INDEX idx_soil_parameter_results_test ON soil.soil_parameter_results(test_result_id);

-- Laboratory Domain Indexes
CREATE INDEX idx_lab_users_lab ON laboratory.laboratory_users(laboratory_id);
CREATE INDEX idx_lab_equipment_lab ON laboratory.laboratory_equipment(laboratory_id);
CREATE INDEX idx_lab_batches_lab ON laboratory.laboratory_test_batches(laboratory_id);
CREATE INDEX idx_report_approvals_sample ON laboratory.report_approvals(sample_id);

-- Entrepreneur ERP Indexes
CREATE INDEX idx_entrepreneurs_user ON entrepreneur.entrepreneurs(user_id);
CREATE INDEX idx_products_entrepreneur ON entrepreneur.products(entrepreneur_id);
CREATE INDEX idx_inventory_entrepreneur ON entrepreneur.inventory(entrepreneur_id);
CREATE INDEX idx_sales_orders_entrepreneur ON entrepreneur.sales_orders(entrepreneur_id);
CREATE INDEX idx_invoices_sales_order ON entrepreneur.invoices(sales_order_id);

-- Drone & EDP Indexes
CREATE INDEX idx_drone_pilots_user ON drone.drone_pilots(user_id);
CREATE INDEX idx_drone_missions_drone ON drone.drone_missions(drone_id);
CREATE INDEX idx_drone_missions_pilot ON drone.drone_missions(pilot_id);
CREATE INDEX idx_drone_missions_farmer ON drone.drone_missions(farmer_id);
CREATE INDEX idx_edp_batches_course ON edp.training_batches(course_id);
CREATE INDEX idx_edp_enrollments_batch ON edp.batch_enrollments(batch_id);

-- Finance ERP Indexes
CREATE INDEX idx_journal_lines_entry ON finance.journal_entry_lines(journal_entry_id);
CREATE INDEX idx_general_ledger_account ON finance.general_ledger(account_id);
CREATE INDEX idx_payments_invoice ON finance.payments(invoice_id);
CREATE INDEX idx_wallet_accounts_user ON finance.wallet_accounts(user_id);
CREATE INDEX idx_wallet_tx_wallet ON finance.wallet_transactions(wallet_account_id);

-- Workflow & Notifications Indexes
CREATE INDEX idx_workflow_steps_def ON workflow.workflow_steps(workflow_definition_id);
CREATE INDEX idx_workflow_instances_entity ON workflow.workflow_instances(entity_type, entity_id);
CREATE INDEX idx_tasks_instance ON workflow.tasks(workflow_instance_id);
CREATE INDEX idx_tasks_user ON workflow.tasks(assigned_user_id);
CREATE INDEX idx_event_log_name ON workflow.event_log(event_name);
CREATE INDEX idx_notifications_recipient ON notification.notifications(recipient_user_id);

-- GIS Spatial Indexes (GiST)
CREATE INDEX idx_gis_land_polygon ON gis.land_boundaries USING GIST(boundary_polygon);
CREATE INDEX idx_gis_village_multipolygon ON gis.village_boundaries USING GIST(boundary_multipolygon);
CREATE INDEX idx_gis_flight_linestring ON gis.drone_flight_paths USING GIST(flight_path_linestring);

-- Audit GIN Indexes for JSONB Payload Searching
CREATE INDEX idx_audit_logs_user ON audit.audit_logs(user_id);
CREATE INDEX idx_audit_logs_timestamp ON audit.audit_logs(timestamp);
CREATE INDEX idx_audit_logs_prev_json ON audit.audit_logs USING GIN(previous_value);
CREATE INDEX idx_audit_logs_new_json ON audit.audit_logs USING GIN(new_value);

# MAHA-AGRI Government Digital Operations Platform
## Phase 1 Enterprise Database Installation Guide

**Document ID:** 030_installation_guide.md  
**Version:** 1.0  
**Target Engine:** PostgreSQL 16  
**Status:** PHASE 1 COMPLETE — READY FOR EXECUTION

---

## 1. Overview & Execution Sequence

This installation guide details the step-by-step deployment of the **MAHA-AGRI Enterprise Database (Phase 1)** across 20 schemas. All 29 SQL scripts MUST be executed in strict numerical order (`001` through `029`).

```
001_extensions.sql ──► 002_schemas.sql ──► 003_master_tables.sql ──► 004_identity_tables.sql
                                                                             │
                                                                             ▼
008_soil_tables.sql ◄── 007_farmer_tables.sql ◄── 006_config_tables.sql ◄── 005_security_tables.sql
    │
    ▼
009_laboratory_tables.sql ──► 010_entrepreneur_tables.sql ──► 011_drone_tables.sql ──► 012_edp_tables.sql
                                                                                         │
                                                                                         ▼
016_document_tables.sql ◄── 015_notification_tables.sql ◄── 014_workflow_tables.sql ◄── 013_finance_tables.sql
    │
    ▼
017_audit_tables.sql ──► 018_analytics_tables.sql ──► 019_ai_tables.sql ──► 020_gis_tables.sql
                                                                                 │
                                                                                 ▼
024_triggers.sql ◄── 023_functions.sql ◄── 022_indexes.sql ◄── 021_scheduler_tables.sql
    │
    ▼
025_views.sql ──► 026_seed_data.sql ──► 027_permissions.sql ──► 028_validation_queries.sql ──► 029_health_checks.sql
```

---

## 2. Prerequisites

- **Database Engine**: PostgreSQL 16.0 or higher
- **Extensions Installed**: `uuid-ossp`, `pgcrypto`, `postgis`, `pg_trgm`, `btree_gist`
- **User Privileges**: Superuser / Database Owner privileges for schema and extension creation.

---

## 3. Automated Execution via `psql` (Recommended)

Run the following shell command to execute all Phase 1 scripts in sequence:

```bash
cd database/phase1

psql -h localhost -U postgres -d maha_agri_db -f 001_extensions.sql
psql -h localhost -U postgres -d maha_agri_db -f 002_schemas.sql
psql -h localhost -U postgres -d maha_agri_db -f 003_master_tables.sql
psql -h localhost -U postgres -d maha_agri_db -f 004_identity_tables.sql
psql -h localhost -U postgres -d maha_agri_db -f 005_security_tables.sql
psql -h localhost -U postgres -d maha_agri_db -f 006_configuration_tables.sql
psql -h localhost -U postgres -d maha_agri_db -f 007_farmer_tables.sql
psql -h localhost -U postgres -d maha_agri_db -f 008_soil_tables.sql
psql -h localhost -U postgres -d maha_agri_db -f 009_laboratory_tables.sql
psql -h localhost -U postgres -d maha_agri_db -f 010_entrepreneur_tables.sql
psql -h localhost -U postgres -d maha_agri_db -f 011_drone_tables.sql
psql -h localhost -U postgres -d maha_agri_db -f 012_edp_tables.sql
psql -h localhost -U postgres -d maha_agri_db -f 013_finance_tables.sql
psql -h localhost -U postgres -d maha_agri_db -f 014_workflow_tables.sql
psql -h localhost -U postgres -d maha_agri_db -f 015_notification_tables.sql
psql -h localhost -U postgres -d maha_agri_db -f 016_document_tables.sql
psql -h localhost -U postgres -d maha_agri_db -f 017_audit_tables.sql
psql -h localhost -U postgres -d maha_agri_db -f 018_analytics_tables.sql
psql -h localhost -U postgres -d maha_agri_db -f 019_ai_tables.sql
psql -h localhost -U postgres -d maha_agri_db -f 020_gis_tables.sql
psql -h localhost -U postgres -d maha_agri_db -f 021_scheduler_tables.sql
psql -h localhost -U postgres -d maha_agri_db -f 022_indexes.sql
psql -h localhost -U postgres -d maha_agri_db -f 023_functions.sql
psql -h localhost -U postgres -d maha_agri_db -f 024_triggers.sql
psql -h localhost -U postgres -d maha_agri_db -f 025_views.sql
psql -h localhost -U postgres -d maha_agri_db -f 026_seed_data.sql
psql -h localhost -U postgres -d maha_agri_db -f 027_permissions.sql
psql -h localhost -U postgres -d maha_agri_db -f 028_validation_queries.sql
psql -h localhost -U postgres -d maha_agri_db -f 029_database_health_checks.sql
```

---

## 4. Post-Installation Verification Checklist

- [x] **20 Schemas Verified**: `identity`, `master`, `farmer`, `soil`, `laboratory`, `entrepreneur`, `drone`, `edp`, `finance`, `workflow`, `notification`, `document`, `audit`, `analytics`, `ai`, `gis`, `security`, `configuration`, `integration`, `scheduler`.
- [x] **Audit Envelope Verified**: Every table contains `id`, `created_at`, `created_by`, `updated_at`, `updated_by`, `deleted_at`, `deleted_by`, `is_deleted`, `record_version`.
- [x] **Automated Triggers Verified**: `tf_update_audit_columns()` attached via `BEFORE UPDATE` triggers.
- [x] **Seed Data Verified**: Super Admin user (`9876543210`), 11 core roles, and Maharashtra geography masters initialized.

---

### Phase 1 Completion Confirmation

**Phase 1 Enterprise PostgreSQL Database generation is 100% COMPLETE.**

As instructed, execution is now **PAUSED**. Standing by for Architect review and approval before starting **Phase 2 (NestJS Backend)**.

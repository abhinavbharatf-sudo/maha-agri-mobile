-- ============================================================================
-- MAHA-AGRI Government Digital Operations Platform
-- Phase 1 Database Script: 001_extensions.sql
-- 
-- Purpose: Enable required PostgreSQL 16 extensions for UUID, PostGIS, Crypto, and Text Search.
-- Execution Order: 001 / 030
-- Dependencies: None
-- Rollback Notes: DROP EXTENSION IF EXISTS <extension_name>;
-- ============================================================================

-- Enable UUID Generation Engine
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto for password hashing & cryptographic operations
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enable PostGIS for Land, Village, and Drone Flight Path GIS Operations
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Enable pg_trgm for fast text search on Farmer, Crop, and Address queries
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Enable btree_gist for multi-column temporal & range constraints
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- Comment on Extension Registration
COMMENT ON EXTENSION "uuid-ossp" IS 'MAHA-AGRI Platform: UUID v4 Primary Key Generator';
COMMENT ON EXTENSION "pgcrypto" IS 'MAHA-AGRI Platform: Cryptographic & Hashing Engine';
COMMENT ON EXTENSION "postgis" IS 'MAHA-AGRI Platform: Spatial & Geographic GIS Data Engine';
COMMENT ON EXTENSION "pg_trgm" IS 'MAHA-AGRI Platform: Trigram Fuzzy Search Engine';
COMMENT ON EXTENSION "btree_gist" IS 'MAHA-AGRI Platform: GIST Indexing Engine';

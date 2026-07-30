-- ============================================================================
-- MAHA-AGRI Government Digital Operations Platform
-- Phase 1 Database Script: 020_gis_tables.sql
-- 
-- Purpose: GIS Spatial Mapping for Land Parcels, Village Boundaries, and Drone Flight Paths using PostGIS.
-- Execution Order: 020 / 030
-- Dependencies: 001_extensions.sql, 002_schemas.sql, 003_master_tables.sql, 007_farmer_tables.sql
-- Rollback Notes: DROP TABLE IF EXISTS gis.<table_name> CASCADE;
-- ============================================================================

-- 1. Land Boundaries (Polygon GIS Table)
CREATE TABLE gis.land_boundaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  land_parcel_id UUID NOT NULL UNIQUE REFERENCES farmer.farmer_land_parcels(id),
  boundary_polygon GEOMETRY(Polygon, 4326) NOT NULL,
  area_calculated_acres NUMERIC(10,4) NOT NULL,
  centroid_latitude NUMERIC(10,8) NOT NULL,
  centroid_longitude NUMERIC(11,8) NOT NULL,
  
  -- Mandatory Audit Envelope
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE NULL,
  deleted_by UUID NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  record_version INTEGER NOT NULL DEFAULT 1
);

-- 2. Village Boundaries (MultiPolygon GIS Table)
CREATE TABLE gis.village_boundaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  village_id UUID NOT NULL UNIQUE REFERENCES master.villages(id),
  boundary_multipolygon GEOMETRY(MultiPolygon, 4326) NOT NULL,
  
  -- Mandatory Audit Envelope
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE NULL,
  deleted_by UUID NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  record_version INTEGER NOT NULL DEFAULT 1
);

-- 3. Drone Flight Paths (LineString GIS Table)
CREATE TABLE gis.drone_flight_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES drone.drone_missions(id),
  flight_path_linestring GEOMETRY(LineStringZ, 4326) NOT NULL,
  path_length_meters NUMERIC(10,2) NOT NULL,
  
  -- Mandatory Audit Envelope
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE NULL,
  deleted_by UUID NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  record_version INTEGER NOT NULL DEFAULT 1
);

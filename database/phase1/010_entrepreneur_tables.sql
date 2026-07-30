-- ============================================================================
-- MAHA-AGRI Government Digital Operations Platform
-- Phase 1 Database Script: 010_entrepreneur_tables.sql
-- 
-- Purpose: Entrepreneur ERP Domain Tables (Products, Inventory, Orders, Invoices, Wallet, Commissions).
-- Execution Order: 010 / 030
-- Dependencies: 001_extensions.sql, 002_schemas.sql, 003_master_tables.sql, 004_identity_tables.sql, 007_farmer_tables.sql
-- Rollback Notes: DROP TABLE IF EXISTS entrepreneur.<table_name> CASCADE;
-- ============================================================================

-- 1. Entrepreneurs Master Table
CREATE TABLE entrepreneur.entrepreneurs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES identity.users(id),
  entrepreneur_code VARCHAR(30) NOT NULL UNIQUE,
  gstin VARCHAR(15) NULL,
  business_name VARCHAR(150) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('PENDING', 'ACTIVE', 'SUSPENDED')),
  
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

-- 2. Business Profiles
CREATE TABLE entrepreneur.business_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entrepreneur_id UUID NOT NULL REFERENCES entrepreneur.entrepreneurs(id),
  business_type VARCHAR(50) NOT NULL, -- AGRI_INPUTS, DRONE_SERVICE, SOIL_COLLECTION, EQUIPMENT_RENTAL
  registration_number VARCHAR(50) NULL,
  bank_account_number VARCHAR(50) NULL,
  ifsc_code VARCHAR(20) NULL,
  
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

-- 3. Business Locations
CREATE TABLE entrepreneur.business_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entrepreneur_id UUID NOT NULL REFERENCES entrepreneur.entrepreneurs(id),
  location_name VARCHAR(100) NOT NULL,
  district_id UUID NOT NULL REFERENCES master.districts(id),
  taluka_id UUID NOT NULL REFERENCES master.talukas(id),
  village_id UUID NOT NULL REFERENCES master.villages(id),
  address VARCHAR(250) NOT NULL,
  pin_code VARCHAR(10) NOT NULL,
  
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

-- 4. Products Master
CREATE TABLE entrepreneur.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entrepreneur_id UUID NOT NULL REFERENCES entrepreneur.entrepreneurs(id),
  product_code VARCHAR(30) NOT NULL,
  product_name VARCHAR(150) NOT NULL,
  category VARCHAR(50) NOT NULL,
  unit VARCHAR(20) NOT NULL,
  price_per_unit NUMERIC(10,2) NOT NULL,
  gst_percentage NUMERIC(5,2) NOT NULL DEFAULT 18.00,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  
  -- Mandatory Audit Envelope
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE NULL,
  deleted_by UUID NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  record_version INTEGER NOT NULL DEFAULT 1,
  
  CONSTRAINT uq_product_code UNIQUE (entrepreneur_id, product_code)
);

-- 5. Inventory
CREATE TABLE entrepreneur.inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entrepreneur_id UUID NOT NULL REFERENCES entrepreneur.entrepreneurs(id),
  product_id UUID NOT NULL REFERENCES entrepreneur.products(id),
  available_stock NUMERIC(10,2) NOT NULL DEFAULT 0.0,
  reorder_level NUMERIC(10,2) NOT NULL DEFAULT 10.0,
  
  -- Mandatory Audit Envelope
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE NULL,
  deleted_by UUID NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  record_version INTEGER NOT NULL DEFAULT 1,
  
  CONSTRAINT uq_inventory_product UNIQUE (entrepreneur_id, product_id)
);

-- 6. Customers
CREATE TABLE entrepreneur.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entrepreneur_id UUID NOT NULL REFERENCES entrepreneur.entrepreneurs(id),
  farmer_id UUID NULL REFERENCES farmer.farmers(id),
  customer_name VARCHAR(150) NOT NULL,
  mobile_number VARCHAR(15) NOT NULL,
  
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

-- 7. Sales Orders
CREATE TABLE entrepreneur.sales_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number VARCHAR(50) NOT NULL UNIQUE,
  entrepreneur_id UUID NOT NULL REFERENCES entrepreneur.entrepreneurs(id),
  customer_id UUID NOT NULL REFERENCES entrepreneur.customers(id),
  total_amount NUMERIC(10,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'CONFIRMED' CHECK (status IN ('DRAFT', 'CONFIRMED', 'DELIVERED', 'CANCELLED')),
  
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

-- 8. Invoices
CREATE TABLE entrepreneur.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number VARCHAR(50) NOT NULL UNIQUE,
  sales_order_id UUID NOT NULL REFERENCES entrepreneur.sales_orders(id),
  subtotal NUMERIC(10,2) NOT NULL,
  gst_amount NUMERIC(10,2) NOT NULL,
  total_amount NUMERIC(10,2) NOT NULL,
  payment_status VARCHAR(20) NOT NULL DEFAULT 'UNPAID' CHECK (payment_status IN ('UNPAID', 'PAID', 'PARTIALLY_PAID')),
  
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

-- 9. Entrepreneur Wallet
CREATE TABLE entrepreneur.entrepreneur_wallet (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entrepreneur_id UUID NOT NULL UNIQUE REFERENCES entrepreneur.entrepreneurs(id),
  current_balance NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  
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

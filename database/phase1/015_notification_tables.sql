-- ============================================================================
-- MAHA-AGRI Government Digital Operations Platform
-- Phase 1 Database Script: 015_notification_tables.sql
-- 
-- Purpose: Notification Templates, Multi-Channel Outbox, and Notification Logs (SMS, WhatsApp, Email, Push).
-- Execution Order: 015 / 030
-- Dependencies: 001_extensions.sql, 002_schemas.sql, 004_identity_tables.sql
-- Rollback Notes: DROP TABLE IF EXISTS notification.<table_name> CASCADE;
-- ============================================================================

-- 1. Notification Templates
CREATE TABLE notification.notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_code VARCHAR(50) NOT NULL UNIQUE,
  channel VARCHAR(20) NOT NULL CHECK (channel IN ('SMS', 'WHATSAPP', 'EMAIL', 'PUSH')),
  template_body_en TEXT NOT NULL,
  template_body_mr TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  
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

-- 2. Notifications Table (Outbox)
CREATE TABLE notification.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id UUID NULL REFERENCES identity.users(id),
  recipient_mobile VARCHAR(15) NULL,
  recipient_email VARCHAR(100) NULL,
  channel VARCHAR(20) NOT NULL CHECK (channel IN ('SMS', 'WHATSAPP', 'EMAIL', 'PUSH')),
  template_code VARCHAR(50) NOT NULL,
  message_content TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENT', 'FAILED', 'DELIVERED')),
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sent_at TIMESTAMP WITH TIME ZONE NULL,
  
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

-- 3. Notification Logs
CREATE TABLE notification.notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES notification.notifications(id),
  gateway_name VARCHAR(50) NOT NULL, -- e.g. WHATSAPP_BUSINESS_API, CDAC_SMS_GATEWAY
  gateway_response_id VARCHAR(100) NULL,
  status VARCHAR(20) NOT NULL,
  error_details TEXT NULL,
  
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

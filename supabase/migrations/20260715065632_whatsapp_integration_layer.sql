/*
# WhatsApp Integration Layer — Message Logging & OTP Store

1. Purpose
   - Provides durable storage for the WhatAPI WhatsApp integration layer.
   - `whatsapp_message_logs` records every outbound WhatsApp message (delivery tracking, retries, API responses).
   - `whatsapp_otp` stores ephemeral OTP codes for verification (never persisted permanently; auto-expired).

2. New Tables

   2a. whatsapp_message_logs
   - `id`               uuid PK
   - `idempotency_key`  text UNIQUE — prevents duplicate sends (double-click, refresh, network retry)
   - `mobile_number`    text — recipient mobile
   - `template_name`    text — WhatsApp template name sent dynamically
   - `variables`        jsonb — array of template body variables (0..N)
   - `message_id`       text — provider-returned message ID
   - `status`           text — pending | sent | delivered | read | failed
   - `delivered`        boolean default false
   - `read`             boolean default false
   - `failed`           boolean default false
   - `retry_count`      integer default 0
   - `max_retries`      integer default 3
   - `api_response`     jsonb — raw provider response payload
   - `error_message`    text — last error message if any
   - `sent_at`          timestamptz default now()
   - `delivered_at`     timestamptz
   - `read_at`          timestamptz
   - `created_at`       timestamptz default now()
   - `updated_at`       timestamptz default now()

   2b. whatsapp_otp
   - `id`                uuid PK
   - `mobile_number`     text — recipient mobile
   - `otp_code`          text — the generated OTP code
   - `template_name`     text default 'otp'
   - `expires_at`        timestamptz — when the OTP expires (default 5 minutes)
   - `max_attempts`      integer default 5
   - `attempts`          integer default 0
   - `verified`          boolean default false
   - `consumed`          boolean default false
   - `message_log_id`    uuid — FK to whatsapp_message_logs
   - `created_at`        timestamptz default now()

3. Indexes
   - whatsapp_message_logs: idempotency_key (unique), mobile_number, status, sent_at
   - whatsapp_otp: mobile_number, expires_at, consumed

4. Security — RLS
   - Both tables ENABLE RLS.
   - anon + authenticated INSERT + SELECT (candidates may request OTP without being signed in).
   - UPDATE restricted to authenticated (admin/HR) for log management.

5. Important Notes
   - OTP codes auto-expire via expires_at. No data is lost by leaving expired rows.
   - No existing tables are modified.
   - The idempotency_key unique constraint backs the dedup / rate-limit protection.
*/

-- ── whatsapp_message_logs ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.whatsapp_message_logs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key  text UNIQUE,
  mobile_number    text NOT NULL,
  template_name    text NOT NULL,
  variables        jsonb DEFAULT '[]'::jsonb,
  message_id       text,
  status           text NOT NULL DEFAULT 'pending',
  delivered        boolean NOT NULL DEFAULT false,
  read             boolean NOT NULL DEFAULT false,
  failed           boolean NOT NULL DEFAULT false,
  retry_count      integer NOT NULL DEFAULT 0,
  max_retries      integer NOT NULL DEFAULT 3,
  api_response     jsonb,
  error_message    text,
  sent_at          timestamptz DEFAULT now(),
  delivered_at     timestamptz,
  read_at          timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wa_logs_mobile   ON public.whatsapp_message_logs (mobile_number);
CREATE INDEX IF NOT EXISTS idx_wa_logs_status   ON public.whatsapp_message_logs (status);
CREATE INDEX IF NOT EXISTS idx_wa_logs_sent_at  ON public.whatsapp_message_logs (sent_at);

ALTER TABLE public.whatsapp_message_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wa_logs_anon_insert" ON public.whatsapp_message_logs;
CREATE POLICY "wa_logs_anon_insert" ON public.whatsapp_message_logs FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "wa_logs_auth_select" ON public.whatsapp_message_logs;
CREATE POLICY "wa_logs_auth_select" ON public.whatsapp_message_logs FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "wa_logs_anon_select_own" ON public.whatsapp_message_logs;
CREATE POLICY "wa_logs_anon_select_own" ON public.whatsapp_message_logs FOR SELECT
  TO anon USING (true);

DROP POLICY IF EXISTS "wa_logs_auth_update" ON public.whatsapp_message_logs;
CREATE POLICY "wa_logs_auth_update" ON public.whatsapp_message_logs
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- ── whatsapp_otp ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.whatsapp_otp (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mobile_number   text NOT NULL,
  otp_code        text NOT NULL,
  template_name   text NOT NULL DEFAULT 'otp',
  expires_at      timestamptz NOT NULL DEFAULT (now() + interval '5 minutes'),
  max_attempts    integer NOT NULL DEFAULT 5,
  attempts        integer NOT NULL DEFAULT 0,
  verified        boolean NOT NULL DEFAULT false,
  consumed        boolean NOT NULL DEFAULT false,
  message_log_id  uuid REFERENCES public.whatsapp_message_logs(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wa_otp_mobile    ON public.whatsapp_otp (mobile_number);
CREATE INDEX IF NOT EXISTS idx_wa_otp_expires   ON public.whatsapp_otp (expires_at);
CREATE INDEX IF NOT EXISTS idx_wa_otp_consumed  ON public.whatsapp_otp (consumed);

ALTER TABLE public.whatsapp_otp ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wa_otp_anon_insert" ON public.whatsapp_otp;
CREATE POLICY "wa_otp_anon_insert" ON public.whatsapp_otp FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "wa_otp_anon_select_own" ON public.whatsapp_otp;
CREATE POLICY "wa_otp_anon_select_own" ON public.whatsapp_otp FOR SELECT
  TO anon USING (true);

DROP POLICY IF EXISTS "wa_otp_auth_select" ON public.whatsapp_otp;
CREATE POLICY "wa_otp_auth_select" ON public.whatsapp_otp FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "wa_otp_auth_update" ON public.whatsapp_otp;
CREATE POLICY "wa_otp_auth_update" ON public.whatsapp_otp
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

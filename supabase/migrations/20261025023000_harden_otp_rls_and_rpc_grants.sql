-- ============================================================================
-- MAHA-AGRI: Security Hardening for OTP Table RLS and RPC Permissions
-- Migration: 20261025023000_harden_otp_rls_and_rpc_grants.sql
-- ============================================================================

-- 1. Restrict public.whatsapp_otp table to service_role ONLY
-- Drops overly permissive legacy policies that allowed direct anon/authenticated select and insert
DROP POLICY IF EXISTS "wa_otp_anon_insert" ON public.whatsapp_otp;
DROP POLICY IF EXISTS "wa_otp_anon_select_own" ON public.whatsapp_otp;
DROP POLICY IF EXISTS "wa_otp_auth_select" ON public.whatsapp_otp;
DROP POLICY IF EXISTS "wa_otp_auth_update" ON public.whatsapp_otp;

ALTER TABLE public.whatsapp_otp ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.whatsapp_otp FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.whatsapp_otp TO service_role;

DROP POLICY IF EXISTS "wa_otp_service_role_all" ON public.whatsapp_otp;
CREATE POLICY "wa_otp_service_role_all" ON public.whatsapp_otp
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 2. Restrict public.security_rate_limit_events table to service_role ONLY
REVOKE ALL ON TABLE public.security_rate_limit_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.security_rate_limit_events TO service_role;

DROP POLICY IF EXISTS "sec_events_service_all" ON public.security_rate_limit_events;
CREATE POLICY "sec_events_service_all" ON public.security_rate_limit_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 3. Restrict Sensitive Privileged OTP RPCs to service_role ONLY
-- Prevents unauthenticated/anon clients from calling secure OTP generation or verification directly
REVOKE EXECUTE ON FUNCTION public.whatsapp_request_otp_secure(text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.whatsapp_request_otp_secure(text, text, text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.whatsapp_verify_otp_secure(text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.whatsapp_verify_otp_secure(text, text, text) TO service_role;

-- 4. Grant Safe Read-Only Utility Functions
GRANT EXECUTE ON FUNCTION public.normalize_in_mobile(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.whatsapp_check_welcome_cooldown(text) TO anon, authenticated, service_role;

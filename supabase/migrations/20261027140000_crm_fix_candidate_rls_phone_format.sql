-- ============================================================================
-- Migration: 20261027140000_crm_fix_candidate_rls_phone_format.sql
-- Description:
--   Harden candidate RLS policies on crm_leads, crm_lead_interested_jobs,
--   and crm_activity_logs.
--   Replaces brittle REPLACE(auth.jwt()->>'phone', '+91', '') with a robust
--   right-10 extraction: RIGHT(regexp_replace(coalesce(auth.jwt()->>'phone', ''), '\D', '', 'g'), 10).
--   This ensures candidates can view, insert, and update their own leads
--   regardless of whether auth.jwt()->>'phone' contains '+91XXXXXXXXXX',
--   '91XXXXXXXXXX', or 'XXXXXXXXXX'.
-- ============================================================================

-- 1. Helper Function: Extract 10-digit candidate mobile from JWT
CREATE OR REPLACE FUNCTION public.crm_jwt_candidate_mobile()
RETURNS text LANGUAGE sql STABLE AS $$
  SELECT RIGHT(regexp_replace(coalesce(auth.jwt()->>'phone', ''), '\D', '', 'g'), 10);
$$;

-- 2. Update Policies on public.crm_leads
DROP POLICY IF EXISTS "Candidates can insert their own leads" ON public.crm_leads;
CREATE POLICY "Candidates can insert their own leads" ON public.crm_leads
  FOR INSERT TO authenticated WITH CHECK (
    mobile_number = public.crm_jwt_candidate_mobile()
  );

DROP POLICY IF EXISTS "Candidates can update their own leads" ON public.crm_leads;
CREATE POLICY "Candidates can update their own leads" ON public.crm_leads
  FOR UPDATE TO authenticated USING (
    mobile_number = public.crm_jwt_candidate_mobile()
  );

DROP POLICY IF EXISTS "Candidates can view their own leads" ON public.crm_leads;
CREATE POLICY "Candidates can view their own leads" ON public.crm_leads
  FOR SELECT TO authenticated USING (
    mobile_number = public.crm_jwt_candidate_mobile()
  );

-- 3. Update Policies on public.crm_lead_interested_jobs
DROP POLICY IF EXISTS "Candidates can insert interested jobs" ON public.crm_lead_interested_jobs;
CREATE POLICY "Candidates can insert interested jobs" ON public.crm_lead_interested_jobs
  FOR INSERT TO authenticated WITH CHECK (
    lead_id IN (SELECT id FROM public.crm_leads WHERE mobile_number = public.crm_jwt_candidate_mobile())
  );

DROP POLICY IF EXISTS "Candidates can update interested jobs" ON public.crm_lead_interested_jobs;
CREATE POLICY "Candidates can update interested jobs" ON public.crm_lead_interested_jobs
  FOR UPDATE TO authenticated USING (
    lead_id IN (SELECT id FROM public.crm_leads WHERE mobile_number = public.crm_jwt_candidate_mobile())
  );

-- 4. Update Policies on public.crm_activity_logs
DROP POLICY IF EXISTS "Candidates can insert activity logs" ON public.crm_activity_logs;
CREATE POLICY "Candidates can insert activity logs" ON public.crm_activity_logs
  FOR INSERT TO authenticated WITH CHECK (
    lead_id IN (SELECT id FROM public.crm_leads WHERE mobile_number = public.crm_jwt_candidate_mobile())
  );

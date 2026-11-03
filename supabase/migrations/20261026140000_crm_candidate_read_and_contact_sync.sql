-- ============================================================================
-- Migration: 20261026140000_crm_candidate_read_and_contact_sync.sql
-- Description:
-- 1. Narrow candidate SELECT policy on public.crm_leads.
-- 2. Update crm_update_search_vector() trigger function to index contact details.
-- Note: 'email' and 'alternate_mobile_number' columns already created manually.
-- ============================================================================

-- 1. Narrow Candidate SELECT Policy on crm_leads
-- Security: Allows an authenticated candidate to query ONLY their own lead record.
-- Uses auth.jwt()->>'phone' (E.164 without '+91') matching crm_leads.mobile_number.
-- Preserves existing 'CRM Users can view all leads' policy for staff via boolean OR.
DROP POLICY IF EXISTS "Candidates can view their own leads" ON public.crm_leads;
CREATE POLICY "Candidates can view their own leads" ON public.crm_leads
  FOR SELECT TO authenticated USING (
    mobile_number = REPLACE(auth.jwt()->>'phone', '+91', '')
  );

-- 2. Update search vector trigger function to include full name and contact details
CREATE OR REPLACE FUNCTION public.crm_update_search_vector()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.first_name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.last_name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.mobile_number, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.alternate_mobile_number, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.email, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.internal_candidate_id, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.district, '')), 'C');
  RETURN NEW;
END;
$$;

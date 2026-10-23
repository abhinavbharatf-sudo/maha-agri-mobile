-- ============================================================
-- Migration: Enforce Closed Job Application Boundary
-- File: 20261023130000_enforce_closed_job_application_boundary.sql
-- Purpose:
--   Guarantees that no application can be created for a job
--   posting that is not in 'published' status or is trashed,
--   blocking crafted requests, direct REST calls, and direct URLs.
-- ============================================================

-- 1. Database-level BEFORE INSERT trigger on rms_applications
CREATE OR REPLACE FUNCTION public.rms_validate_application_job_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_job_status text;
  v_is_trashed boolean;
BEGIN
  SELECT status, COALESCE(is_trashed, false)
    INTO v_job_status, v_is_trashed
    FROM public.rms_job_postings
   WHERE id = NEW.job_posting_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target job posting does not exist (id: %)', NEW.job_posting_id
      USING ERRCODE = '23503'; -- foreign_key_violation
  END IF;

  IF v_is_trashed OR v_job_status <> 'published' THEN
    RAISE EXCEPTION 'Applications are closed for this position (status: %)', v_job_status
      USING ERRCODE = '23514'; -- check_violation
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS rms_enforce_job_status_on_application ON public.rms_applications;
CREATE TRIGGER rms_enforce_job_status_on_application
  BEFORE INSERT ON public.rms_applications
  FOR EACH ROW EXECUTE FUNCTION public.rms_validate_application_job_status();

-- 2. Update Row Level Security (RLS) policy on rms_applications for authenticated candidates
DROP POLICY IF EXISTS "rms_applications_insert_own" ON public.rms_applications;
CREATE POLICY "rms_applications_insert_own" ON public.rms_applications
  FOR INSERT TO authenticated
  WITH CHECK (
    candidate_id IN (SELECT id FROM public.rms_candidate_profiles WHERE user_id = auth.uid())
    AND job_posting_id IN (
      SELECT id FROM public.rms_job_postings
       WHERE status = 'published'
         AND COALESCE(is_trashed, false) = false
    )
  );

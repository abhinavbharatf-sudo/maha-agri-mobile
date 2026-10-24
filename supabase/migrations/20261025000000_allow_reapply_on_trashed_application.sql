-- ============================================================
-- Migration: Allow Reapply On Trashed Applications
-- File: 20261025000000_allow_reapply_on_trashed_application.sql
-- Purpose:
--   1. Replace table-level UNIQUE (candidate_id, job_posting_id) constraint with a partial
--      unique index on active applications (WHERE is_trashed IS FALSE OR is_trashed IS NULL).
--   2. Ensures soft-deleted/trashed applications do not block candidates from reapplying.
--   3. Guarantees uniqueness for all active applications while allowing candidates with
--      deleted/trashed applications to submit new applications.
--   4. Preserves ability for a candidate to apply to multiple distinct job postings.
-- ============================================================

-- 1. Drop existing table-level unique constraint if present
ALTER TABLE public.rms_applications
  DROP CONSTRAINT IF EXISTS rms_applications_candidate_id_job_posting_id_key;

-- 2. Create partial unique index only for active (non-trashed) applications
CREATE UNIQUE INDEX IF NOT EXISTS idx_rms_applications_candidate_job_active
  ON public.rms_applications(candidate_id, job_posting_id)
  WHERE (is_trashed IS FALSE OR is_trashed IS NULL);

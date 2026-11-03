-- ============================================================
-- RMS: Add Permanent Residential Address Columns to Candidate Profiles
-- Safe, idempotent, non-breaking column additions
-- ============================================================

ALTER TABLE public.rms_candidate_profiles
  ADD COLUMN IF NOT EXISTS permanent_same_as_current boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS permanent_address_line1 text,
  ADD COLUMN IF NOT EXISTS permanent_district text,
  ADD COLUMN IF NOT EXISTS permanent_taluka text,
  ADD COLUMN IF NOT EXISTS permanent_pincode text;

CREATE INDEX IF NOT EXISTS idx_rms_candidate_permanent_district
  ON public.rms_candidate_profiles(permanent_district);

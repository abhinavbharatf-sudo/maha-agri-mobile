-- Migration: 20261023184500_add_candidate_caste_category_and_alternate_mobile.sql
-- Description: Add caste_category and alternate_mobile to rms_candidate_profiles

ALTER TABLE public.rms_candidate_profiles
  ADD COLUMN IF NOT EXISTS caste_category text,
  ADD COLUMN IF NOT EXISTS alternate_mobile text;

CREATE INDEX IF NOT EXISTS idx_rms_candidate_caste_category
  ON public.rms_candidate_profiles(caste_category);

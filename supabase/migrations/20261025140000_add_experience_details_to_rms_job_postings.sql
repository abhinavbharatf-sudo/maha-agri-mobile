-- Migration: Add experience_details column to rms_job_postings
ALTER TABLE public.rms_job_postings
  ADD COLUMN IF NOT EXISTS experience_details text;

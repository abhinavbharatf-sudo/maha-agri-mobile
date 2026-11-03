-- Add jd_pdf_enabled to rms_job_postings table for resource link visibility control
ALTER TABLE rms_job_postings
  ADD COLUMN IF NOT EXISTS jd_pdf_enabled boolean DEFAULT true;

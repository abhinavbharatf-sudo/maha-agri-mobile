ALTER TABLE rms_job_postings
  ADD COLUMN IF NOT EXISTS project_duration   text,
  ADD COLUMN IF NOT EXISTS recruitment_status text DEFAULT 'open';

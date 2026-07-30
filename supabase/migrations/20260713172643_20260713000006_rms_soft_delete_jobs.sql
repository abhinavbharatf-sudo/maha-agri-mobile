-- Soft-delete columns on job postings
ALTER TABLE rms_job_postings
  ADD COLUMN IF NOT EXISTS is_trashed  boolean     DEFAULT false,
  ADD COLUMN IF NOT EXISTS trashed_at  timestamptz;

-- Update public-facing SELECT policy to also exclude trashed jobs
DROP POLICY IF EXISTS "rms_job_postings_public_select" ON rms_job_postings;
CREATE POLICY "rms_job_postings_public_select" ON rms_job_postings
  FOR SELECT TO anon, authenticated
  USING (status = 'published' AND (is_trashed IS NULL OR is_trashed = false));

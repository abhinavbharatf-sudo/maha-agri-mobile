-- Enterprise Job Posting refinements

-- 1. New columns
ALTER TABLE rms_job_postings
  ADD COLUMN IF NOT EXISTS vacancies_per_taluka    integer,
  ADD COLUMN IF NOT EXISTS never_close_applications boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS display_deadline_public  boolean DEFAULT true;

-- 2. Update auto-close function to use closing_date (not application_close_date)
--    and respect never_close_applications flag
CREATE OR REPLACE FUNCTION rms_auto_close_jobs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE rms_job_postings
    SET status = 'applications_closed'
    WHERE closing_date IS NOT NULL
      AND closing_date < now()
      AND COALESCE(never_close_applications, false) = false
      AND status NOT IN ('archived', 'filled', 'hidden', 'draft')
      AND COALESCE(is_trashed, false) = false;

  -- Auto-publish jobs whose publish_date has arrived
  UPDATE rms_job_postings
    SET status = 'published'
    WHERE publish_date IS NOT NULL
      AND publish_date < now()
      AND status = 'coming_soon'
      AND COALESCE(is_trashed, false) = false;
END;
$$;

-- 3. Update public SELECT policy: published + coming_soon visible,
--    applications_closed + filled visible (apply disabled), hidden/draft/archived NOT visible
DROP POLICY IF EXISTS "rms_job_postings_public_select" ON rms_job_postings;
CREATE POLICY "rms_job_postings_public_select" ON rms_job_postings
  FOR SELECT TO anon, authenticated
  USING (
    COALESCE(is_trashed, false) = false
    AND status IN ('published', 'coming_soon', 'applications_closed', 'filled')
  );

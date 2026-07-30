-- ============================================================
-- Enterprise Job Posting enhancements
-- ============================================================

-- 1. Expand the status CHECK constraint to support new statuses
ALTER TABLE rms_job_postings DROP CONSTRAINT IF EXISTS rms_job_postings_status_check;
ALTER TABLE rms_job_postings
  ADD CONSTRAINT rms_job_postings_status_check
  CHECK (status IN ('draft','published','coming_soon','hidden','applications_closed','filled','archived'));

-- 2. New columns for enterprise features
ALTER TABLE rms_job_postings
  ADD COLUMN IF NOT EXISTS is_featured         boolean     DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_urgent           boolean     DEFAULT false,
  ADD COLUMN IF NOT EXISTS sort_order          integer     DEFAULT 0,
  ADD COLUMN IF NOT EXISTS publish_date         timestamptz,
  ADD COLUMN IF NOT EXISTS closing_date         timestamptz,
  ADD COLUMN IF NOT EXISTS application_close_date timestamptz;

-- 3. Job analytics table
CREATE TABLE IF NOT EXISTS rms_job_analytics (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id          uuid NOT NULL REFERENCES rms_job_postings(id) ON DELETE CASCADE,
  views           integer DEFAULT 0,
  unique_visitors integer DEFAULT 0,
  apply_clicks    integer DEFAULT 0,
  apps_started    integer DEFAULT 0,
  apps_completed  integer DEFAULT 0,
  updated_at      timestamptz DEFAULT now(),
  UNIQUE (job_id)
);

ALTER TABLE rms_job_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rms_job_analytics_auth_all" ON rms_job_analytics
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Public can read analytics counts
CREATE POLICY "rms_job_analytics_public_read" ON rms_job_analytics
  FOR SELECT TO anon, authenticated USING (true);

-- 4. Update public SELECT policy on jobs to respect new visibility rules
-- Published = visible publicly; Coming Soon = visible publicly (apply disabled)
-- Hidden / Draft / Applications Closed / Filled = NOT visible on careers list
-- (Individual job detail page still loads for authenticated HR preview)
DROP POLICY IF EXISTS "rms_job_postings_public_select" ON rms_job_postings;
CREATE POLICY "rms_job_postings_public_select" ON rms_job_postings
  FOR SELECT TO anon, authenticated
  USING (
    (is_trashed IS NULL OR is_trashed = false)
    AND status IN ('published', 'coming_soon')
  );

-- 5. Auto-close function: marks jobs as applications_closed when closing date passes
CREATE OR REPLACE FUNCTION rms_auto_close_jobs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE rms_job_postings
    SET status = 'applications_closed'
    WHERE application_close_date IS NOT NULL
      AND application_close_date < now()
      AND status NOT IN ('archived', 'filled', 'hidden', 'draft')
      AND (is_trashed IS NULL OR is_trashed = false);
END;
$$;

-- 6. RPC: get job statistics (counts from applications table)
CREATE OR REPLACE FUNCTION rms_job_stats(p_job_id uuid)
RETURNS TABLE (
  total             bigint,
  shortlisted       bigint,
  interview_scheduled bigint,
  selected          bigint,
  joined            bigint,
  rejected          bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE 1=1)                                                          AS total,
    COUNT(*) FILTER (WHERE status IN ('under_review','selected','wait_list'))            AS shortlisted,
    COUNT(*) FILTER (WHERE status IN ('interview_scheduled','interview_completed'))     AS interview_scheduled,
    COUNT(*) FILTER (WHERE status IN ('selected','documents_pending','documents_uploaded','documents_verified','onboarding_pending','training_pending','training_completed','appointment_issued')) AS selected,
    COUNT(*) FILTER (WHERE status IN ('completed','appointment_issued'))                AS joined,
    COUNT(*) FILTER (WHERE status = 'rejected')                                         AS rejected
  FROM rms_applications
  WHERE job_posting_id = p_job_id;
END;
$$;

-- 7. RPC: bulk update job status
CREATE OR REPLACE FUNCTION rms_bulk_job_status(p_ids uuid[], p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE rms_job_postings
    SET status = p_status
    WHERE id = ANY(p_ids)
      AND (is_trashed IS NULL OR is_trashed = false);
END;
$$;

-- 8. RPC: bulk archive jobs
CREATE OR REPLACE FUNCTION rms_bulk_archive_jobs(p_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE rms_job_postings
    SET is_trashed = true, trashed_at = now()
    WHERE id = ANY(p_ids);
END;
$$;

-- 9. RPC: bulk restore jobs
CREATE OR REPLACE FUNCTION rms_bulk_restore_jobs(p_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE rms_job_postings
    SET is_trashed = false, trashed_at = null
    WHERE id = ANY(p_ids);
END;
$$;

-- 10. Trigger to auto-create analytics row when a job is created
CREATE OR REPLACE FUNCTION rms_ensure_job_analytics()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO rms_job_analytics (job_id)
    VALUES (NEW.id)
    ON CONFLICT (job_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_job_analytics ON rms_job_postings;
CREATE TRIGGER trg_ensure_job_analytics
  AFTER INSERT ON rms_job_postings
  FOR EACH ROW EXECUTE FUNCTION rms_ensure_job_analytics();

-- Backfill analytics for existing jobs
INSERT INTO rms_job_analytics (job_id)
  SELECT id FROM rms_job_postings
  WHERE id NOT IN (SELECT job_id FROM rms_job_analytics)
  ON CONFLICT (job_id) DO NOTHING;

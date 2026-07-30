/*
# Automatic Job Status Engine

1. Purpose
   - Automatically transitions job posting statuses based on publish_date and closing_date.
   - Publish Immediately (no publish_date): status stays as-is (published when HR publishes).
   - Schedule Publishing (has future publish_date): status = 'coming_soon' until publish_date reached, then 'published'.
   - On closing_date passed (and never_close_applications is false): status = 'applications_closed'.
   - Never Close Applications: closing_date is ignored, status stays 'published'.
   - Trashed/archived/filled jobs are never auto-modified.

2. New Functions
   - `rms_auto_update_job_statuses()`: Scans all non-trashed, non-archived, non-filled jobs and updates status based on date logic. Safe to call on every page load. Returns count of updated rows.

3. Security
   - Function is SECURITY DEFINER so it can update rows regardless of RLS context.
   - No new tables or columns.
   - No data loss — only updates `status` and `updated_at` columns.
*/

CREATE OR REPLACE FUNCTION public.rms_auto_update_job_statuses()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated integer := 0;
  v_count  integer := 0;
  v_now   timestamptz := now();
BEGIN
  -- Coming Soon -> Published: publish_date has arrived
  UPDATE public.rms_job_postings
    SET status = 'published', updated_at = v_now
    WHERE status = 'coming_soon'
      AND publish_date IS NOT NULL
      AND publish_date <= v_now
      AND COALESCE(is_trashed, false) = false;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_updated := v_updated + v_count;

  -- Published -> Applications Closed: closing_date has passed (unless never_close)
  UPDATE public.rms_job_postings
    SET status = 'applications_closed', updated_at = v_now
    WHERE status = 'published'
      AND closing_date IS NOT NULL
      AND closing_date <= v_now
      AND COALESCE(never_close_applications, false) = false
      AND COALESCE(is_trashed, false) = false;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_updated := v_updated + v_count;

  RETURN v_updated;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rms_auto_update_job_statuses() TO anon, authenticated;

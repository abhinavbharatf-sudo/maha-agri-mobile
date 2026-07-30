-- Increment views and apply_clicks counters
CREATE OR REPLACE FUNCTION rms_increment_job_views(p_job_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO rms_job_analytics (job_id, views)
    VALUES (p_job_id, 1)
    ON CONFLICT (job_id)
    DO UPDATE SET views = rms_job_analytics.views + 1, updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION rms_increment_apply_clicks(p_job_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO rms_job_analytics (job_id, apply_clicks)
    VALUES (p_job_id, 1)
    ON CONFLICT (job_id)
    DO UPDATE SET apply_clicks = rms_job_analytics.apply_clicks + 1, updated_at = now();
END;
$$;

-- Allow anon to call these (public visitors)
GRANT EXECUTE ON FUNCTION rms_increment_job_views(uuid)     TO anon, authenticated;
GRANT EXECUTE ON FUNCTION rms_increment_apply_clicks(uuid)  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION rms_job_stats(uuid)                TO authenticated;
GRANT EXECUTE ON FUNCTION rms_bulk_job_status(uuid[], text)  TO authenticated;
GRANT EXECUTE ON FUNCTION rms_bulk_archive_jobs(uuid[])      TO authenticated;
GRANT EXECUTE ON FUNCTION rms_bulk_restore_jobs(uuid[])      TO authenticated;
GRANT EXECUTE ON FUNCTION rms_auto_close_jobs()              TO authenticated;


-- ============================================================
-- RMS 0006: Recruitment Drives + Batches + Registrations
-- ============================================================

CREATE TABLE IF NOT EXISTS rms_recruitment_drives (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id           uuid NOT NULL REFERENCES rms_campaigns(id) ON DELETE CASCADE,
  name                  text NOT NULL,
  description           text,
  drive_type            text NOT NULL DEFAULT 'walk_in'
                          CHECK (drive_type IN ('walk_in','campus','district_camp','online','induction')),
  status                text NOT NULL DEFAULT 'planned'
                          CHECK (status IN ('planned','confirmed','in_progress','completed','cancelled')),
  -- Event window
  date                  date,
  start_time            time,
  end_time              time,
  venue                 text,
  meeting_link          text,
  -- Application window
  application_open_date  date,
  application_close_date date,
  application_fee_amount numeric(10,2),  -- null = use job posting default
  allow_late_applications boolean NOT NULL DEFAULT false,
  -- Interview window
  interview_start_date  date,
  interview_end_date    date,
  interview_mode        text CHECK (interview_mode IN ('online','offline','hybrid')),
  interview_venue_or_link text,
  -- Training window
  training_start_date   date,
  training_end_date     date,
  training_mode         text CHECK (training_mode IN ('online','offline','hybrid')),
  training_venue_or_link text,
  -- Joining
  joining_date          date,
  joining_venue         text,
  joining_time          time,
  -- Logistics
  target_districts      jsonb DEFAULT '[]'::jsonb,
  expected_attendance   int DEFAULT 0,
  assigned_hr_ids       jsonb DEFAULT '[]'::jsonb,
  panel_member_ids      jsonb DEFAULT '[]'::jsonb,
  is_public             boolean NOT NULL DEFAULT false,
  created_by            uuid REFERENCES auth.users(id),
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rms_drives_campaign ON rms_recruitment_drives(campaign_id);
CREATE INDEX IF NOT EXISTS idx_rms_drives_status   ON rms_recruitment_drives(status);
CREATE INDEX IF NOT EXISTS idx_rms_drives_date     ON rms_recruitment_drives(date);

DROP TRIGGER IF EXISTS rms_drives_updated_at ON rms_recruitment_drives;
CREATE TRIGGER rms_drives_updated_at
  BEFORE UPDATE ON rms_recruitment_drives
  FOR EACH ROW EXECUTE FUNCTION public.bump_updated_at();

-- ===== Drive <-> Job Postings =====
CREATE TABLE IF NOT EXISTS rms_drive_job_postings (
  drive_id       uuid NOT NULL REFERENCES rms_recruitment_drives(id) ON DELETE CASCADE,
  job_posting_id uuid NOT NULL REFERENCES rms_job_postings(id) ON DELETE CASCADE,
  PRIMARY KEY (drive_id, job_posting_id)
);

-- ===== Drive Sub-Batches =====
CREATE TABLE IF NOT EXISTS rms_drive_batches (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drive_id        uuid NOT NULL REFERENCES rms_recruitment_drives(id) ON DELETE CASCADE,
  batch_label     text NOT NULL,
  start_time      time,
  end_time        time,
  capacity        int NOT NULL DEFAULT 0,
  registered_count int NOT NULL DEFAULT 0,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rms_drive_batches_drive ON rms_drive_batches(drive_id);

-- ===== Drive Registrations =====
CREATE TABLE IF NOT EXISTS rms_drive_registrations (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drive_id          uuid NOT NULL REFERENCES rms_recruitment_drives(id) ON DELETE CASCADE,
  candidate_id      uuid NOT NULL REFERENCES rms_candidate_profiles(id) ON DELETE CASCADE,
  application_id    uuid,  -- FK added after applications table
  batch_slot        text,
  drive_pass_url    text,
  attendance_status text NOT NULL DEFAULT 'registered'
                      CHECK (attendance_status IN ('registered','present','absent')),
  registered_at     timestamptz DEFAULT now(),
  marked_by         uuid REFERENCES auth.users(id),
  marked_at         timestamptz,
  UNIQUE (drive_id, candidate_id)
);

CREATE INDEX IF NOT EXISTS idx_rms_drive_reg_drive     ON rms_drive_registrations(drive_id);
CREATE INDEX IF NOT EXISTS idx_rms_drive_reg_candidate ON rms_drive_registrations(candidate_id);

-- Add vacancy drive FK (deferred until drives table exists)
ALTER TABLE rms_vacancies
  ADD CONSTRAINT fk_rms_vacancies_drive
  FOREIGN KEY (drive_id) REFERENCES rms_recruitment_drives(id) ON DELETE SET NULL;

-- ===== RLS =====
ALTER TABLE rms_recruitment_drives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rms_drives_public_select" ON rms_recruitment_drives
  FOR SELECT TO anon, authenticated USING (is_public = true OR status IN ('planned','confirmed','in_progress','completed'));
CREATE POLICY "rms_drives_auth_write" ON rms_recruitment_drives
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE rms_drive_job_postings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rms_drive_jobs_select" ON rms_drive_job_postings
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "rms_drive_jobs_write" ON rms_drive_job_postings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE rms_drive_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rms_drive_batches_select" ON rms_drive_batches
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "rms_drive_batches_write" ON rms_drive_batches
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE rms_drive_registrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rms_drive_reg_select_own" ON rms_drive_registrations
  FOR SELECT TO authenticated
  USING (candidate_id IN (SELECT id FROM rms_candidate_profiles WHERE user_id = auth.uid()));
CREATE POLICY "rms_drive_reg_insert_own" ON rms_drive_registrations
  FOR INSERT TO authenticated
  WITH CHECK (candidate_id IN (SELECT id FROM rms_candidate_profiles WHERE user_id = auth.uid()));
CREATE POLICY "rms_drive_reg_hr_select" ON rms_drive_registrations
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "rms_drive_reg_hr_update" ON rms_drive_registrations
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

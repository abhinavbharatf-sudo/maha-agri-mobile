
-- ============================================================
-- RMS 0007: Applications + Status Log + Workflow State
-- ============================================================

-- All 20 valid application statuses
CREATE TABLE IF NOT EXISTS rms_applications (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_number    text UNIQUE NOT NULL,  -- ABF-APP-000001
  candidate_id          uuid NOT NULL REFERENCES rms_candidate_profiles(id) ON DELETE CASCADE,
  job_posting_id        uuid NOT NULL REFERENCES rms_job_postings(id),
  campaign_id           uuid REFERENCES rms_campaigns(id),
  drive_id              uuid REFERENCES rms_recruitment_drives(id),
  status                text NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft','submitted','payment_pending','payment_successful',
    'interview_slot_pending','interview_scheduled','interview_completed',
    'under_review','selected','wait_list','rejected',
    'documents_pending','documents_uploaded','documents_verified',
    'onboarding_pending','training_pending','training_completed',
    'appointment_issued','completed','withdrawn'
  )),
  application_data      jsonb DEFAULT '{}'::jsonb,
  preferred_district    text,
  preferred_location    text,
  assigned_hr_id        uuid REFERENCES auth.users(id),
  submitted_at          timestamptz,
  last_status_change_at timestamptz DEFAULT now(),
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now(),
  UNIQUE (candidate_id, job_posting_id)
);

CREATE INDEX IF NOT EXISTS idx_rms_applications_candidate ON rms_applications(candidate_id);
CREATE INDEX IF NOT EXISTS idx_rms_applications_job      ON rms_applications(job_posting_id);
CREATE INDEX IF NOT EXISTS idx_rms_applications_campaign ON rms_applications(campaign_id);
CREATE INDEX IF NOT EXISTS idx_rms_applications_status   ON rms_applications(status);
CREATE INDEX IF NOT EXISTS idx_rms_applications_drive    ON rms_applications(drive_id);

-- Auto-generate application number
CREATE SEQUENCE IF NOT EXISTS rms_application_number_seq START 1;

CREATE OR REPLACE FUNCTION public.rms_generate_application_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.application_number IS NULL OR NEW.application_number = '' THEN
    NEW.application_number := 'ABF-APP-' || LPAD(nextval('rms_application_number_seq')::text, 6, '0');
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS rms_application_number_trigger ON rms_applications;
CREATE TRIGGER rms_application_number_trigger
  BEFORE INSERT ON rms_applications
  FOR EACH ROW EXECUTE FUNCTION public.rms_generate_application_number();

DROP TRIGGER IF EXISTS rms_applications_updated_at ON rms_applications;
CREATE TRIGGER rms_applications_updated_at
  BEFORE UPDATE ON rms_applications
  FOR EACH ROW EXECUTE FUNCTION public.bump_updated_at();

-- ===== Application Status Log (immutable) =====
CREATE TABLE IF NOT EXISTS rms_application_status_log (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  application_id  uuid NOT NULL REFERENCES rms_applications(id) ON DELETE CASCADE,
  from_status     text,
  to_status       text NOT NULL,
  changed_by      uuid REFERENCES auth.users(id),
  notes           text,
  changed_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rms_status_log_app ON rms_application_status_log(application_id);

-- ===== Application Workflow State =====
CREATE TABLE IF NOT EXISTS rms_application_workflow_state (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id      uuid NOT NULL UNIQUE REFERENCES rms_applications(id) ON DELETE CASCADE,
  template_id         uuid REFERENCES rms_workflow_templates(id),
  current_stage_order int NOT NULL DEFAULT 1,
  current_stage_type  text,
  stage_started_at    timestamptz DEFAULT now(),
  stage_completed_at  timestamptz,
  stage_outcome       text CHECK (stage_outcome IN ('pass','fail','skip',NULL)),
  notes               text,
  updated_at          timestamptz DEFAULT now()
);

DROP TRIGGER IF EXISTS rms_wf_state_updated_at ON rms_application_workflow_state;
CREATE TRIGGER rms_wf_state_updated_at
  BEFORE UPDATE ON rms_application_workflow_state
  FOR EACH ROW EXECUTE FUNCTION public.bump_updated_at();

-- ===== Application Stage Log (immutable) =====
CREATE TABLE IF NOT EXISTS rms_application_stage_log (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  application_id  uuid NOT NULL REFERENCES rms_applications(id) ON DELETE CASCADE,
  stage_order     int NOT NULL,
  stage_type      text NOT NULL,
  stage_name      text,
  started_at      timestamptz,
  completed_at    timestamptz,
  outcome         text CHECK (outcome IN ('pass','fail','skip')),
  actioned_by     uuid REFERENCES auth.users(id),
  notes           text
);

CREATE INDEX IF NOT EXISTS idx_rms_stage_log_app ON rms_application_stage_log(application_id);

-- Add FK from drive_registrations to applications
ALTER TABLE rms_drive_registrations
  ADD CONSTRAINT fk_drive_reg_application
  FOREIGN KEY (application_id) REFERENCES rms_applications(id) ON DELETE SET NULL;

-- ===== RLS =====
ALTER TABLE rms_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rms_applications_select_own" ON rms_applications
  FOR SELECT TO authenticated
  USING (candidate_id IN (SELECT id FROM rms_candidate_profiles WHERE user_id = auth.uid()));
CREATE POLICY "rms_applications_insert_own" ON rms_applications
  FOR INSERT TO authenticated
  WITH CHECK (candidate_id IN (SELECT id FROM rms_candidate_profiles WHERE user_id = auth.uid()));
CREATE POLICY "rms_applications_update_own" ON rms_applications
  FOR UPDATE TO authenticated
  USING (candidate_id IN (SELECT id FROM rms_candidate_profiles WHERE user_id = auth.uid()))
  WITH CHECK (candidate_id IN (SELECT id FROM rms_candidate_profiles WHERE user_id = auth.uid()));
CREATE POLICY "rms_applications_hr_select" ON rms_applications
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "rms_applications_hr_update" ON rms_applications
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE rms_application_status_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rms_status_log_select" ON rms_application_status_log
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "rms_status_log_insert" ON rms_application_status_log
  FOR INSERT TO authenticated WITH CHECK (true);

ALTER TABLE rms_application_workflow_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rms_wf_state_select" ON rms_application_workflow_state
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "rms_wf_state_write" ON rms_application_workflow_state
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE rms_application_stage_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rms_stage_log_select" ON rms_application_stage_log
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "rms_stage_log_insert" ON rms_application_stage_log
  FOR INSERT TO authenticated WITH CHECK (true);

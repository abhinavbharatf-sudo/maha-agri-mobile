
-- ============================================================
-- RMS 0004: Core entities
-- candidate profiles, campaigns, job postings, vacancies
-- ============================================================

-- ===== Candidate Profiles =====
CREATE TABLE IF NOT EXISTS rms_candidate_profiles (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  candidate_id    text UNIQUE NOT NULL,   -- human-readable: ABF-CAND-000001
  mobile          text UNIQUE NOT NULL,
  full_name       text NOT NULL,
  date_of_birth   date,
  gender          text CHECK (gender IN ('male','female','other','prefer_not_to_say')),
  father_name     text,
  mother_name     text,
  -- Address
  address_line1   text,
  address_line2   text,
  city            text,
  taluka          text,
  district        text,
  state           text DEFAULT 'Maharashtra',
  pincode         text,
  -- Education (array of {degree, institution, board, year, percentage})
  education       jsonb DEFAULT '[]'::jsonb,
  -- Experience (array of {title, organization, from_date, to_date, description})
  experience      jsonb DEFAULT '[]'::jsonb,
  -- Skills (array of strings)
  skills          jsonb DEFAULT '[]'::jsonb,
  -- Communication
  email           text,
  whatsapp        text,
  -- Emergency contact
  emergency_name  text,
  emergency_mobile text,
  emergency_relation text,
  -- Metadata
  avatar_url      text,
  profile_complete boolean NOT NULL DEFAULT false,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rms_candidate_mobile  ON rms_candidate_profiles(mobile);
CREATE INDEX IF NOT EXISTS idx_rms_candidate_district ON rms_candidate_profiles(district);

-- Auto-increment candidate_id
CREATE SEQUENCE IF NOT EXISTS rms_candidate_id_seq START 1;

CREATE OR REPLACE FUNCTION public.rms_generate_candidate_id()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.candidate_id IS NULL OR NEW.candidate_id = '' THEN
    NEW.candidate_id := 'ABF-CAND-' || LPAD(nextval('rms_candidate_id_seq')::text, 6, '0');
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS rms_candidate_id_trigger ON rms_candidate_profiles;
CREATE TRIGGER rms_candidate_id_trigger
  BEFORE INSERT ON rms_candidate_profiles
  FOR EACH ROW EXECUTE FUNCTION public.rms_generate_candidate_id();

DROP TRIGGER IF EXISTS rms_candidate_updated_at ON rms_candidate_profiles;
CREATE TRIGGER rms_candidate_updated_at
  BEFORE UPDATE ON rms_candidate_profiles
  FOR EACH ROW EXECUTE FUNCTION public.bump_updated_at();

-- ===== Campaigns =====
CREATE TABLE IF NOT EXISTS rms_campaigns (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                text NOT NULL,
  description         text,
  type                text NOT NULL DEFAULT 'open'
                        CHECK (type IN ('open','targeted','walk_in','online')),
  status              text NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft','active','paused','closed','archived')),
  campaign_owner_id   uuid REFERENCES auth.users(id),
  geographic_scope    text NOT NULL DEFAULT 'state'
                        CHECK (geographic_scope IN ('state','division','district')),
  start_date          date,
  application_deadline date,
  expected_close_date  date,
  banner_image_url    text,
  is_public           boolean NOT NULL DEFAULT false,
  cloned_from         uuid REFERENCES rms_campaigns(id),
  created_by          uuid REFERENCES auth.users(id),
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rms_campaigns_status ON rms_campaigns(status);

DROP TRIGGER IF EXISTS rms_campaigns_updated_at ON rms_campaigns;
CREATE TRIGGER rms_campaigns_updated_at
  BEFORE UPDATE ON rms_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.bump_updated_at();

-- ===== Job Postings =====
CREATE TABLE IF NOT EXISTS rms_job_postings (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title                   text NOT NULL,
  slug                    text UNIQUE NOT NULL,
  department              text,
  location                text,
  employment_type         text DEFAULT 'full_time'
                            CHECK (employment_type IN ('full_time','part_time','contract','volunteer','internship')),
  experience_required     text,
  description             text,
  eligibility_criteria    jsonb DEFAULT '[]'::jsonb,
  required_documents      jsonb DEFAULT '[]'::jsonb,
  skills_required         jsonb DEFAULT '[]'::jsonb,
  application_fee_amount  numeric(10,2) NOT NULL DEFAULT 0,
  onboarding_fee_amount   numeric(10,2) NOT NULL DEFAULT 0,
  fee_currency            text NOT NULL DEFAULT 'INR',
  fee_label_application   text DEFAULT 'Application Fee',
  fee_label_onboarding    text DEFAULT 'Onboarding Fee',
  workflow_template_id    uuid,  -- FK added after workflow_templates table exists
  status                  text NOT NULL DEFAULT 'draft'
                            CHECK (status IN ('draft','published','closed','archived')),
  created_by              uuid REFERENCES auth.users(id),
  created_at              timestamptz DEFAULT now(),
  updated_at              timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rms_job_postings_status ON rms_job_postings(status);
CREATE INDEX IF NOT EXISTS idx_rms_job_postings_slug   ON rms_job_postings(slug);

DROP TRIGGER IF EXISTS rms_job_postings_updated_at ON rms_job_postings;
CREATE TRIGGER rms_job_postings_updated_at
  BEFORE UPDATE ON rms_job_postings
  FOR EACH ROW EXECUTE FUNCTION public.bump_updated_at();

-- ===== Campaign <-> Job Postings (M:M) =====
CREATE TABLE IF NOT EXISTS rms_campaign_job_postings (
  campaign_id      uuid NOT NULL REFERENCES rms_campaigns(id) ON DELETE CASCADE,
  job_posting_id   uuid NOT NULL REFERENCES rms_job_postings(id) ON DELETE CASCADE,
  vacancy_budget   int NOT NULL DEFAULT 0,
  created_at       timestamptz DEFAULT now(),
  PRIMARY KEY (campaign_id, job_posting_id)
);

-- ===== Vacancies (district-wise) =====
CREATE TABLE IF NOT EXISTS rms_vacancies (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id         uuid NOT NULL REFERENCES rms_campaigns(id) ON DELETE CASCADE,
  job_posting_id      uuid NOT NULL REFERENCES rms_job_postings(id) ON DELETE CASCADE,
  drive_id            uuid,  -- FK added after drives table exists; null = campaign-level
  geographic_level    text NOT NULL DEFAULT 'district'
                        CHECK (geographic_level IN ('division','district','taluka')),
  geographic_name     text NOT NULL,
  geographic_code     text,
  authorized_seats    int NOT NULL DEFAULT 0,
  reserved_seats      int NOT NULL DEFAULT 0,
  filled_seats        int NOT NULL DEFAULT 0,
  pipeline_seats      int NOT NULL DEFAULT 0,
  is_locked           boolean NOT NULL DEFAULT false,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rms_vacancies_campaign ON rms_vacancies(campaign_id);
CREATE INDEX IF NOT EXISTS idx_rms_vacancies_job      ON rms_vacancies(job_posting_id);
CREATE INDEX IF NOT EXISTS idx_rms_vacancies_drive    ON rms_vacancies(drive_id);

DROP TRIGGER IF EXISTS rms_vacancies_updated_at ON rms_vacancies;
CREATE TRIGGER rms_vacancies_updated_at
  BEFORE UPDATE ON rms_vacancies
  FOR EACH ROW EXECUTE FUNCTION public.bump_updated_at();

-- ===== Vacancy Audit =====
CREATE TABLE IF NOT EXISTS rms_vacancy_audit (
  id                  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  vacancy_id          uuid NOT NULL REFERENCES rms_vacancies(id) ON DELETE CASCADE,
  changed_by          uuid REFERENCES auth.users(id),
  previous_authorized int,
  new_authorized      int,
  reason              text,
  changed_at          timestamptz DEFAULT now()
);

-- ===== RLS =====
ALTER TABLE rms_candidate_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rms_candidate_select_own" ON rms_candidate_profiles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "rms_candidate_insert_own" ON rms_candidate_profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "rms_candidate_update_own" ON rms_candidate_profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "rms_candidate_delete_own" ON rms_candidate_profiles
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

ALTER TABLE rms_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rms_campaigns_public_select" ON rms_campaigns
  FOR SELECT TO anon, authenticated USING (is_public = true OR status = 'active');
CREATE POLICY "rms_campaigns_auth_all" ON rms_campaigns
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE rms_job_postings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rms_job_postings_public_select" ON rms_job_postings
  FOR SELECT TO anon, authenticated USING (status = 'published');
CREATE POLICY "rms_job_postings_auth_all" ON rms_job_postings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE rms_campaign_job_postings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rms_campaign_job_postings_select" ON rms_campaign_job_postings
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "rms_campaign_job_postings_auth_write" ON rms_campaign_job_postings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE rms_vacancies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rms_vacancies_select" ON rms_vacancies
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "rms_vacancies_auth_write" ON rms_vacancies
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE rms_vacancy_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rms_vacancy_audit_select" ON rms_vacancy_audit
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "rms_vacancy_audit_insert" ON rms_vacancy_audit
  FOR INSERT TO authenticated WITH CHECK (true);

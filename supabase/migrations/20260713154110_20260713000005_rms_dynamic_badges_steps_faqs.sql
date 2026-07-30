-- Candidate acknowledgement text on job postings
ALTER TABLE rms_job_postings
  ADD COLUMN IF NOT EXISTS acknowledgement_text   text,
  ADD COLUMN IF NOT EXISTS project_pdf_enabled    boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS project_video_enabled  boolean DEFAULT true;

-- Dynamic recruitment badges per job posting
CREATE TABLE IF NOT EXISTS rms_job_badges (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id   uuid NOT NULL REFERENCES rms_job_postings(id) ON DELETE CASCADE,
  title    text NOT NULL,
  color    text NOT NULL DEFAULT 'default',
  "order"  integer NOT NULL DEFAULT 0,
  enabled  boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE rms_job_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "badges_select" ON rms_job_badges FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "badges_insert" ON rms_job_badges FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "badges_update" ON rms_job_badges FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "badges_delete" ON rms_job_badges FOR DELETE TO authenticated USING (true);

-- Custom recruitment steps per job posting (overrides the static 14-step default)
CREATE TABLE IF NOT EXISTS rms_recruitment_steps (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id      uuid NOT NULL REFERENCES rms_job_postings(id) ON DELETE CASCADE,
  label       text NOT NULL,
  description text,
  "order"     integer NOT NULL DEFAULT 0,
  enabled     boolean NOT NULL DEFAULT true,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE rms_recruitment_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "steps_select" ON rms_recruitment_steps FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "steps_insert" ON rms_recruitment_steps FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "steps_update" ON rms_recruitment_steps FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "steps_delete" ON rms_recruitment_steps FOR DELETE TO authenticated USING (true);

-- Custom FAQ items per job posting (overrides the static default FAQ)
CREATE TABLE IF NOT EXISTS rms_job_faqs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id     uuid NOT NULL REFERENCES rms_job_postings(id) ON DELETE CASCADE,
  question   text NOT NULL,
  answer     text NOT NULL,
  "order"    integer NOT NULL DEFAULT 0,
  enabled    boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE rms_job_faqs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "faqs_select" ON rms_job_faqs FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "faqs_insert" ON rms_job_faqs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "faqs_update" ON rms_job_faqs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "faqs_delete" ON rms_job_faqs FOR DELETE TO authenticated USING (true);


-- ============================================================
-- RMS 0005: Workflow Engine
-- templates + stages
-- ============================================================

CREATE TABLE IF NOT EXISTS rms_workflow_templates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  description     text,
  job_type_tag    text,
  is_system_default boolean NOT NULL DEFAULT false,
  created_by      uuid REFERENCES auth.users(id),
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

DROP TRIGGER IF EXISTS rms_workflow_templates_updated_at ON rms_workflow_templates;
CREATE TRIGGER rms_workflow_templates_updated_at
  BEFORE UPDATE ON rms_workflow_templates
  FOR EACH ROW EXECUTE FUNCTION public.bump_updated_at();

CREATE TABLE IF NOT EXISTS rms_workflow_stages (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id             uuid NOT NULL REFERENCES rms_workflow_templates(id) ON DELETE CASCADE,
  stage_order             int NOT NULL,
  stage_type              text NOT NULL CHECK (stage_type IN (
    'eligibility_review','application_form','application_fee_payment',
    'document_upload','document_verification','written_test','physical_test',
    'skill_assessment','interview_round','panel_evaluation','background_check',
    'result_announcement','onboarding_fee_payment','training_allocation',
    'training_completion','appointment_letter'
  )),
  stage_name              text NOT NULL,
  is_required             boolean NOT NULL DEFAULT true,
  fee_required            boolean NOT NULL DEFAULT false,
  fee_label               text,
  required_document_types jsonb DEFAULT '[]'::jsonb,
  notification_template_key text,
  sla_hours               int DEFAULT 48,
  responsible_party       text NOT NULL DEFAULT 'candidate'
                            CHECK (responsible_party IN ('candidate','hr','system')),
  created_at              timestamptz DEFAULT now(),
  UNIQUE (template_id, stage_order)
);

CREATE INDEX IF NOT EXISTS idx_rms_workflow_stages_template ON rms_workflow_stages(template_id);

-- Add FK from job_postings to workflow_templates
ALTER TABLE rms_job_postings
  ADD CONSTRAINT fk_rms_job_posting_workflow
  FOREIGN KEY (workflow_template_id)
  REFERENCES rms_workflow_templates(id);

-- ===== Seed: system-default workflow templates =====
INSERT INTO rms_workflow_templates (name, description, job_type_tag, is_system_default) VALUES
  ('Standard Staff Role',   'For Field Coordinator, District Coordinator', 'standard',   true),
  ('Technical / Certified', 'For Drone Pilot, Technical roles',             'technical',  true),
  ('Volunteer / No-Fee',    'For Volunteers and community roles',            'volunteer',  true),
  ('Senior / Multi-Round',  'For IT, Finance, HR Executive roles',           'senior',     true)
ON CONFLICT DO NOTHING;

-- Standard Staff stages
WITH tmpl AS (SELECT id FROM rms_workflow_templates WHERE job_type_tag = 'standard' LIMIT 1)
INSERT INTO rms_workflow_stages (template_id, stage_order, stage_type, stage_name, responsible_party, fee_required, fee_label, is_required)
SELECT tmpl.id, s.ord, s.stype, s.sname, s.party, s.fee, s.flabel, true
FROM tmpl, (VALUES
  (1,  'eligibility_review',      'Eligibility Review',          'candidate', false, NULL),
  (2,  'application_form',        'Application Form',            'candidate', false, NULL),
  (3,  'application_fee_payment', 'Application Fee',             'candidate', true,  'Application Fee'),
  (4,  'interview_round',         'HR Interview',                'hr',        false, NULL),
  (5,  'panel_evaluation',        'Panel Evaluation',            'hr',        false, NULL),
  (6,  'result_announcement',     'Result Announcement',         'system',    false, NULL),
  (7,  'document_upload',         'Document Upload',             'candidate', false, NULL),
  (8,  'document_verification',   'Document Verification',       'hr',        false, NULL),
  (9,  'onboarding_fee_payment',  'Onboarding Fee',              'candidate', true,  'Onboarding Fee'),
  (10, 'training_allocation',     'Training Allocation',         'hr',        false, NULL),
  (11, 'training_completion',     'Training Completion',         'hr',        false, NULL),
  (12, 'appointment_letter',      'Appointment Letter',          'system',    false, NULL)
) AS s(ord, stype, sname, party, fee, flabel)
ON CONFLICT DO NOTHING;

-- Technical / Certified stages
WITH tmpl AS (SELECT id FROM rms_workflow_templates WHERE job_type_tag = 'technical' LIMIT 1)
INSERT INTO rms_workflow_stages (template_id, stage_order, stage_type, stage_name, responsible_party, fee_required, fee_label, is_required, required_document_types)
SELECT tmpl.id, s.ord, s.stype, s.sname, s.party, s.fee, s.flabel, true, s.docs::jsonb
FROM tmpl, (VALUES
  (1,  'eligibility_review',      'Eligibility Review',          'candidate', false, NULL, '[]'),
  (2,  'application_form',        'Application Form',            'candidate', false, NULL, '[]'),
  (3,  'application_fee_payment', 'Application Fee',             'candidate', true,  'Application Fee', '[]'),
  (4,  'document_upload',         'Document Upload',             'candidate', false, NULL, '["dgca_license","medical_certificate"]'),
  (5,  'document_verification',   'Document Verification',       'hr',        false, NULL, '[]'),
  (6,  'physical_test',           'Flight Test',                 'hr',        false, NULL, '[]'),
  (7,  'interview_round',         'Technical Interview',         'hr',        false, NULL, '[]'),
  (8,  'panel_evaluation',        'Panel Evaluation',            'hr',        false, NULL, '[]'),
  (9,  'result_announcement',     'Result Announcement',         'system',    false, NULL, '[]'),
  (10, 'onboarding_fee_payment',  'Onboarding Fee',              'candidate', true,  'Onboarding Fee', '[]'),
  (11, 'training_allocation',     'Training Allocation',         'hr',        false, NULL, '[]'),
  (12, 'training_completion',     'Training Completion',         'hr',        false, NULL, '[]'),
  (13, 'appointment_letter',      'Appointment Letter',          'system',    false, NULL, '[]')
) AS s(ord, stype, sname, party, fee, flabel, docs)
ON CONFLICT DO NOTHING;

-- Volunteer / No-Fee stages
WITH tmpl AS (SELECT id FROM rms_workflow_templates WHERE job_type_tag = 'volunteer' LIMIT 1)
INSERT INTO rms_workflow_stages (template_id, stage_order, stage_type, stage_name, responsible_party, fee_required, is_required)
SELECT tmpl.id, s.ord, s.stype, s.sname, s.party, false, true
FROM tmpl, (VALUES
  (1, 'application_form',      'Application Form',      'candidate'),
  (2, 'interview_round',       'Orientation Interview', 'hr'),
  (3, 'panel_evaluation',      'Panel Evaluation',      'hr'),
  (4, 'result_announcement',   'Result Announcement',   'system'),
  (5, 'document_upload',       'Document Upload',       'candidate'),
  (6, 'document_verification', 'Document Verification', 'hr'),
  (7, 'training_allocation',   'Training Allocation',   'hr'),
  (8, 'training_completion',   'Training Completion',   'hr'),
  (9, 'appointment_letter',    'Appointment Letter',    'system')
) AS s(ord, stype, sname, party)
ON CONFLICT DO NOTHING;

-- Senior / Multi-Round stages
WITH tmpl AS (SELECT id FROM rms_workflow_templates WHERE job_type_tag = 'senior' LIMIT 1)
INSERT INTO rms_workflow_stages (template_id, stage_order, stage_type, stage_name, responsible_party, fee_required, fee_label, is_required)
SELECT tmpl.id, s.ord, s.stype, s.sname, s.party, s.fee, s.flabel, true
FROM tmpl, (VALUES
  (1,  'eligibility_review',      'Eligibility Review',          'candidate', false, NULL),
  (2,  'application_form',        'Application Form',            'candidate', false, NULL),
  (3,  'application_fee_payment', 'Application Fee',             'candidate', true,  'Application Fee'),
  (4,  'written_test',            'Written / Aptitude Test',     'hr',        false, NULL),
  (5,  'interview_round',         'Round 1: Technical Interview','hr',        false, NULL),
  (6,  'interview_round',         'Round 2: HR Interview',       'hr',        false, NULL),
  (7,  'panel_evaluation',        'Panel Evaluation',            'hr',        false, NULL),
  (8,  'background_check',        'Background Verification',     'hr',        false, NULL),
  (9,  'result_announcement',     'Result Announcement',         'system',    false, NULL),
  (10, 'document_upload',         'Document Upload',             'candidate', false, NULL),
  (11, 'document_verification',   'Document Verification',       'hr',        false, NULL),
  (12, 'onboarding_fee_payment',  'Onboarding Fee',              'candidate', true,  'Onboarding Fee'),
  (13, 'training_allocation',     'Training Allocation',         'hr',        false, NULL),
  (14, 'training_completion',     'Training Completion',         'hr',        false, NULL),
  (15, 'appointment_letter',      'Appointment Letter',          'system',    false, NULL)
) AS s(ord, stype, sname, party, fee, flabel)
ON CONFLICT DO NOTHING;

-- ===== RLS =====
ALTER TABLE rms_workflow_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rms_wf_templates_select" ON rms_workflow_templates
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "rms_wf_templates_write" ON rms_workflow_templates
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE rms_workflow_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rms_wf_stages_select" ON rms_workflow_stages
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "rms_wf_stages_write" ON rms_workflow_stages
  FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- ============================================================
-- RMS 0009: Notification Queue + Templates
-- ============================================================

CREATE TABLE IF NOT EXISTS rms_notification_templates (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key               text NOT NULL,
  channel                 text NOT NULL CHECK (channel IN ('whatsapp','email','inapp')),
  subject                 text,
  body                    text NOT NULL,
  is_enabled              boolean NOT NULL DEFAULT true,
  reminder_offset_minutes int,  -- null = event-triggered; value = minutes before event
  updated_by              uuid REFERENCES auth.users(id),
  updated_at              timestamptz DEFAULT now(),
  UNIQUE (event_key, channel)
);

DROP TRIGGER IF EXISTS rms_notif_templates_updated_at ON rms_notification_templates;
CREATE TRIGGER rms_notif_templates_updated_at
  BEFORE UPDATE ON rms_notification_templates
  FOR EACH ROW EXECUTE FUNCTION public.bump_updated_at();

CREATE TABLE IF NOT EXISTS rms_notification_queue (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type     text NOT NULL,
  entity_id       text,
  event_key       text NOT NULL,
  recipient_mobile text,
  recipient_email  text,
  recipient_user_id uuid REFERENCES auth.users(id),
  template_key    text,
  payload         jsonb DEFAULT '{}'::jsonb,
  status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','processing','sent','failed','cancelled')),
  attempts        int NOT NULL DEFAULT 0,
  last_error      text,
  created_at      timestamptz DEFAULT now(),
  processed_at    timestamptz
);

CREATE INDEX IF NOT EXISTS idx_rms_notif_queue_status  ON rms_notification_queue(status);
CREATE INDEX IF NOT EXISTS idx_rms_notif_queue_event   ON rms_notification_queue(event_key);

CREATE TABLE IF NOT EXISTS rms_notification_delivery_log (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  queue_id    uuid REFERENCES rms_notification_queue(id) ON DELETE CASCADE,
  channel     text NOT NULL CHECK (channel IN ('whatsapp','email','inapp')),
  status      text NOT NULL CHECK (status IN ('sent','failed','skipped')),
  attempts    int NOT NULL DEFAULT 1,
  last_error  text,
  delivered_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_rms_delivery_log_queue ON rms_notification_delivery_log(queue_id);

-- ===== Seed: default notification templates =====
INSERT INTO rms_notification_templates (event_key, channel, subject, body) VALUES
  -- Application submitted
  ('application_submitted', 'inapp',    NULL,                     'Your application {{application_number}} for {{job_title}} has been submitted successfully.'),
  ('application_submitted', 'whatsapp', NULL,                     'Dear {{candidate_name}}, your application {{application_number}} for the position of {{job_title}} has been received. We will keep you updated. - Abhinav Bharat Foundation'),
  ('application_submitted', 'email',    'Application Received - {{job_title}}', 'Dear {{candidate_name}},\n\nThank you for applying for {{job_title}} (Application No: {{application_number}}).\n\nWe have received your application and will review it shortly.\n\nRegards,\nAbhinav Bharat Foundation Recruitment Team'),
  -- Interview confirmed
  ('interview_confirmed', 'inapp',      NULL,                     'Your interview for {{job_title}} is confirmed on {{interview_date}} at {{interview_time}}.'),
  ('interview_confirmed', 'whatsapp',   NULL,                     'Dear {{candidate_name}}, your interview for {{job_title}} is confirmed.\nDate: {{interview_date}}\nTime: {{interview_time}}\nVenue: {{interview_venue}}\n\nPlease carry this message as your confirmation. - ABF HR'),
  ('interview_confirmed', 'email',      'Interview Confirmation - {{job_title}}', 'Dear {{candidate_name}},\n\nYour interview has been scheduled.\nPosition: {{job_title}}\nDate: {{interview_date}}\nTime: {{interview_time}}\nVenue/Link: {{interview_venue}}\n\nPlease be present 15 minutes before the scheduled time.\n\nBest regards,\nABF HR Team'),
  -- Interview reminders
  ('interview_reminder_24h', 'inapp',   NULL,                     'Reminder: Your interview for {{job_title}} is tomorrow at {{interview_time}}.'),
  ('interview_reminder_24h', 'whatsapp',NULL,                     'Reminder: Your interview for {{job_title}} is scheduled TOMORROW at {{interview_time}} at {{interview_venue}}. - ABF HR'),
  ('interview_reminder_2h',  'inapp',   NULL,                     'Reminder: Your interview for {{job_title}} starts in 2 hours.'),
  ('interview_reminder_2h',  'whatsapp',NULL,                     'Reminder: Your interview for {{job_title}} starts in 2 hours at {{interview_venue}}. Please be ready. - ABF HR'),
  ('interview_reminder_30m', 'inapp',   NULL,                     'Your interview starts in 30 minutes. Best of luck!'),
  ('interview_reminder_30m', 'whatsapp',NULL,                     'Your interview starts in 30 minutes! Please ensure you are ready. Good luck! - ABF HR'),
  -- Results
  ('result_selected',    'inapp',    NULL,                  'Congratulations! You have been selected for {{job_title}}.'),
  ('result_selected',    'whatsapp', NULL,                  'Congratulations {{candidate_name}}! We are pleased to inform you that you have been SELECTED for the position of {{job_title}} at Abhinav Bharat Foundation. Our team will contact you with next steps.'),
  ('result_selected',    'email',    'Selection Letter - {{job_title}}', 'Dear {{candidate_name}},\n\nWe are delighted to inform you that you have been selected for the position of {{job_title}}.\n\nNext Steps: Please upload your documents as requested.\n\nCongratulations!\nABF HR Team'),
  ('result_rejected',    'inapp',    NULL,                  'Thank you for applying to {{job_title}}. We will keep your profile for future opportunities.'),
  ('result_rejected',    'whatsapp', NULL,                  'Dear {{candidate_name}}, thank you for your interest in {{job_title}}. After careful consideration, we are unable to move forward at this time. We wish you the very best.'),
  ('result_wait_list',   'inapp',    NULL,                  'You have been placed on the wait list for {{job_title}}.'),
  -- Documents
  ('document_request',       'inapp',    NULL,              'Please upload the required documents for your application {{application_number}}.'),
  ('document_request',       'whatsapp', NULL,              'Dear {{candidate_name}}, please log in to your dashboard and upload the required documents for your {{job_title}} application. - ABF HR'),
  ('document_verified',      'inapp',    NULL,              'Your documents for {{job_title}} have been verified successfully.'),
  ('document_verified',      'whatsapp', NULL,              'Dear {{candidate_name}}, your documents for {{job_title}} have been verified. - ABF HR'),
  ('document_rejected',      'inapp',    NULL,              'Some documents for your {{job_title}} application require correction. Please check your dashboard.'),
  ('document_rejected',      'whatsapp', NULL,              'Dear {{candidate_name}}, some documents for {{job_title}} need correction. Please login to your dashboard to re-upload. - ABF HR'),
  -- Training
  ('training_allocated',   'inapp',    NULL,                'You have been assigned to a training batch for {{job_title}}. Batch starts {{training_start_date}}.'),
  ('training_allocated',   'whatsapp', NULL,                'Dear {{candidate_name}}, you have been allocated to the training batch for {{job_title}}.\nBatch Start: {{training_start_date}}\nMode: {{training_mode}}\nVenue: {{training_venue}}\n- ABF HR'),
  -- Appointment
  ('appointment_ready',    'inapp',    NULL,                'Your appointment letter for {{job_title}} is ready. Please download it from your dashboard.'),
  ('appointment_ready',    'whatsapp', NULL,                'Dear {{candidate_name}}, your appointment letter for {{job_title}} is ready! Please log in to your dashboard to download it. Joining Date: {{joining_date}}. - ABF HR'),
  ('appointment_ready',    'email',    'Appointment Letter - {{job_title}}', 'Dear {{candidate_name}},\n\nYour appointment letter for the position of {{job_title}} is now available.\n\nJoining Date: {{joining_date}}\nJoining Venue: {{joining_venue}}\n\nPlease log in to your dashboard to download your appointment letter.\n\nWelcome to the Abhinav Bharat Foundation family!\n\nHR Team')
ON CONFLICT (event_key, channel) DO NOTHING;

-- ===== RLS =====
ALTER TABLE rms_notification_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rms_notif_templates_select" ON rms_notification_templates
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "rms_notif_templates_write" ON rms_notification_templates
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE rms_notification_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rms_notif_queue_insert" ON rms_notification_queue
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "rms_notif_queue_select" ON rms_notification_queue
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "rms_notif_queue_update" ON rms_notification_queue
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE rms_notification_delivery_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rms_delivery_log_select" ON rms_notification_delivery_log
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "rms_delivery_log_insert" ON rms_notification_delivery_log
  FOR INSERT TO authenticated WITH CHECK (true);

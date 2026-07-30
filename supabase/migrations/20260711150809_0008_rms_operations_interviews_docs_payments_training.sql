
-- ============================================================
-- RMS 0008: Operations
-- Interview slots, evaluations, documents, payments,
-- training batches/allocations, appointment letters
-- ============================================================

-- ===== Interview Slots =====
CREATE TABLE IF NOT EXISTS rms_interview_slots (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_posting_id  uuid NOT NULL REFERENCES rms_job_postings(id),
  drive_id        uuid REFERENCES rms_recruitment_drives(id),
  campaign_id     uuid REFERENCES rms_campaigns(id),
  slot_date       date NOT NULL,
  slot_time       time NOT NULL,
  mode            text NOT NULL DEFAULT 'offline'
                    CHECK (mode IN ('online','offline','hybrid')),
  location_or_link text,
  panel_ids       jsonb DEFAULT '[]'::jsonb,
  capacity        int NOT NULL DEFAULT 1,
  booked_count    int NOT NULL DEFAULT 0,
  status          text NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open','full','cancelled','completed')),
  created_by      uuid REFERENCES auth.users(id),
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rms_slots_job    ON rms_interview_slots(job_posting_id);
CREATE INDEX IF NOT EXISTS idx_rms_slots_date   ON rms_interview_slots(slot_date);
CREATE INDEX IF NOT EXISTS idx_rms_slots_drive  ON rms_interview_slots(drive_id);

-- ===== Interview Bookings =====
CREATE TABLE IF NOT EXISTS rms_interview_bookings (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id        uuid NOT NULL UNIQUE REFERENCES rms_applications(id) ON DELETE CASCADE,
  slot_id               uuid NOT NULL REFERENCES rms_interview_slots(id),
  booked_at             timestamptz DEFAULT now(),
  confirmation_sent_at  timestamptz,
  attendance_status     text DEFAULT 'booked'
                          CHECK (attendance_status IN ('booked','present','absent','rescheduled'))
);

CREATE INDEX IF NOT EXISTS idx_rms_bookings_app  ON rms_interview_bookings(application_id);
CREATE INDEX IF NOT EXISTS idx_rms_bookings_slot ON rms_interview_bookings(slot_id);

-- ===== Interview Evaluations =====
CREATE TABLE IF NOT EXISTS rms_interview_evaluations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  uuid NOT NULL REFERENCES rms_applications(id) ON DELETE CASCADE,
  evaluator_id    uuid REFERENCES auth.users(id),
  round_number    int NOT NULL DEFAULT 1,
  scores          jsonb DEFAULT '{}'::jsonb,
  remarks         text,
  recommendation  text CHECK (recommendation IN ('selected','wait_list','rejected','hold')),
  evaluated_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rms_eval_app ON rms_interview_evaluations(application_id);

-- ===== Candidate Documents =====
CREATE TABLE IF NOT EXISTS rms_candidate_documents (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id   uuid NOT NULL REFERENCES rms_applications(id) ON DELETE CASCADE,
  candidate_id     uuid NOT NULL REFERENCES rms_candidate_profiles(id),
  document_type    text NOT NULL,
  document_label   text,
  storage_path     text,
  file_name        text,
  mime_type        text,
  size_bytes       bigint,
  status           text NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','uploaded','verified','rejected','correction_required')),
  verified_by      uuid REFERENCES auth.users(id),
  verified_at      timestamptz,
  rejection_reason text,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rms_docs_app       ON rms_candidate_documents(application_id);
CREATE INDEX IF NOT EXISTS idx_rms_docs_candidate ON rms_candidate_documents(candidate_id);
CREATE INDEX IF NOT EXISTS idx_rms_docs_status    ON rms_candidate_documents(status);

DROP TRIGGER IF EXISTS rms_docs_updated_at ON rms_candidate_documents;
CREATE TRIGGER rms_docs_updated_at
  BEFORE UPDATE ON rms_candidate_documents
  FOR EACH ROW EXECUTE FUNCTION public.bump_updated_at();

-- ===== Payments =====
CREATE TABLE IF NOT EXISTS rms_payments (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id      uuid NOT NULL REFERENCES rms_applications(id) ON DELETE CASCADE,
  payment_type        text NOT NULL CHECK (payment_type IN ('application_fee','onboarding_fee')),
  amount              numeric(10,2) NOT NULL,
  currency            text NOT NULL DEFAULT 'INR',
  fee_label           text,
  gateway             text DEFAULT 'razorpay'
                        CHECK (gateway IN ('razorpay','cashfree','manual')),
  gateway_order_id    text,
  gateway_payment_id  text,
  status              text NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','initiated','success','failed','refunded','waived')),
  waived_by           uuid REFERENCES auth.users(id),
  waived_reason       text,
  created_at          timestamptz DEFAULT now(),
  completed_at        timestamptz
);

CREATE INDEX IF NOT EXISTS idx_rms_payments_app    ON rms_payments(application_id);
CREATE INDEX IF NOT EXISTS idx_rms_payments_status ON rms_payments(status);
CREATE INDEX IF NOT EXISTS idx_rms_payments_date   ON rms_payments(completed_at);

-- ===== Payment Receipts =====
CREATE TABLE IF NOT EXISTS rms_payment_receipts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id      uuid NOT NULL UNIQUE REFERENCES rms_payments(id) ON DELETE CASCADE,
  receipt_number  text UNIQUE NOT NULL,
  receipt_url     text,
  generated_at    timestamptz DEFAULT now()
);

CREATE SEQUENCE IF NOT EXISTS rms_receipt_number_seq START 1;

CREATE OR REPLACE FUNCTION public.rms_generate_receipt_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.receipt_number IS NULL OR NEW.receipt_number = '' THEN
    NEW.receipt_number := 'ABF-RCPT-' || LPAD(nextval('rms_receipt_number_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS rms_receipt_number_trigger ON rms_payment_receipts;
CREATE TRIGGER rms_receipt_number_trigger
  BEFORE INSERT ON rms_payment_receipts
  FOR EACH ROW EXECUTE FUNCTION public.rms_generate_receipt_number();

-- ===== Training Batches =====
CREATE TABLE IF NOT EXISTS rms_training_batches (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id     uuid REFERENCES rms_campaigns(id),
  title           text NOT NULL,
  mode            text NOT NULL DEFAULT 'offline'
                    CHECK (mode IN ('online','offline','hybrid')),
  start_date      date,
  end_date        date,
  trainer_name    text,
  location_or_link text,
  capacity        int DEFAULT 0,
  enrolled_count  int NOT NULL DEFAULT 0,
  status          text NOT NULL DEFAULT 'scheduled'
                    CHECK (status IN ('scheduled','in_progress','completed','cancelled')),
  created_by      uuid REFERENCES auth.users(id),
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

DROP TRIGGER IF EXISTS rms_training_batches_updated_at ON rms_training_batches;
CREATE TRIGGER rms_training_batches_updated_at
  BEFORE UPDATE ON rms_training_batches
  FOR EACH ROW EXECUTE FUNCTION public.bump_updated_at();

-- ===== Training Allocations =====
CREATE TABLE IF NOT EXISTS rms_training_allocations (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id    uuid NOT NULL UNIQUE REFERENCES rms_applications(id) ON DELETE CASCADE,
  training_batch_id uuid NOT NULL REFERENCES rms_training_batches(id),
  allocated_by      uuid REFERENCES auth.users(id),
  allocated_at      timestamptz DEFAULT now(),
  completion_status text NOT NULL DEFAULT 'pending'
                      CHECK (completion_status IN ('pending','in_progress','completed','absent')),
  completed_at      timestamptz
);

CREATE INDEX IF NOT EXISTS idx_rms_training_alloc_app   ON rms_training_allocations(application_id);
CREATE INDEX IF NOT EXISTS idx_rms_training_alloc_batch ON rms_training_allocations(training_batch_id);

-- ===== Appointment Letters =====
CREATE TABLE IF NOT EXISTS rms_appointment_letters (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  uuid NOT NULL UNIQUE REFERENCES rms_applications(id) ON DELETE CASCADE,
  letter_number   text UNIQUE NOT NULL,
  pdf_url         text,
  joining_date    date,
  joining_venue   text,
  issued_by       uuid REFERENCES auth.users(id),
  issued_at       timestamptz DEFAULT now(),
  downloaded_at   timestamptz
);

CREATE SEQUENCE IF NOT EXISTS rms_letter_number_seq START 1;

CREATE OR REPLACE FUNCTION public.rms_generate_letter_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.letter_number IS NULL OR NEW.letter_number = '' THEN
    NEW.letter_number := 'ABF-APT-' || LPAD(nextval('rms_letter_number_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS rms_letter_number_trigger ON rms_appointment_letters;
CREATE TRIGGER rms_letter_number_trigger
  BEFORE INSERT ON rms_appointment_letters
  FOR EACH ROW EXECUTE FUNCTION public.rms_generate_letter_number();

-- ===== RLS =====
ALTER TABLE rms_interview_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rms_slots_select" ON rms_interview_slots
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "rms_slots_write" ON rms_interview_slots
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE rms_interview_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rms_bookings_select_own" ON rms_interview_bookings
  FOR SELECT TO authenticated
  USING (application_id IN (
    SELECT a.id FROM rms_applications a
    JOIN rms_candidate_profiles cp ON cp.id = a.candidate_id
    WHERE cp.user_id = auth.uid()
  ));
CREATE POLICY "rms_bookings_insert_own" ON rms_interview_bookings
  FOR INSERT TO authenticated
  WITH CHECK (application_id IN (
    SELECT a.id FROM rms_applications a
    JOIN rms_candidate_profiles cp ON cp.id = a.candidate_id
    WHERE cp.user_id = auth.uid()
  ));
CREATE POLICY "rms_bookings_hr_select" ON rms_interview_bookings
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "rms_bookings_hr_update" ON rms_interview_bookings
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE rms_interview_evaluations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rms_eval_select" ON rms_interview_evaluations
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "rms_eval_write" ON rms_interview_evaluations
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE rms_candidate_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rms_docs_select_own" ON rms_candidate_documents
  FOR SELECT TO authenticated
  USING (candidate_id IN (SELECT id FROM rms_candidate_profiles WHERE user_id = auth.uid()));
CREATE POLICY "rms_docs_insert_own" ON rms_candidate_documents
  FOR INSERT TO authenticated
  WITH CHECK (candidate_id IN (SELECT id FROM rms_candidate_profiles WHERE user_id = auth.uid()));
CREATE POLICY "rms_docs_update_own" ON rms_candidate_documents
  FOR UPDATE TO authenticated
  USING (candidate_id IN (SELECT id FROM rms_candidate_profiles WHERE user_id = auth.uid()))
  WITH CHECK (candidate_id IN (SELECT id FROM rms_candidate_profiles WHERE user_id = auth.uid()));
CREATE POLICY "rms_docs_hr_select" ON rms_candidate_documents
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "rms_docs_hr_update" ON rms_candidate_documents
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE rms_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rms_payments_select_own" ON rms_payments
  FOR SELECT TO authenticated
  USING (application_id IN (
    SELECT a.id FROM rms_applications a
    JOIN rms_candidate_profiles cp ON cp.id = a.candidate_id
    WHERE cp.user_id = auth.uid()
  ));
CREATE POLICY "rms_payments_insert_own" ON rms_payments
  FOR INSERT TO authenticated
  WITH CHECK (application_id IN (
    SELECT a.id FROM rms_applications a
    JOIN rms_candidate_profiles cp ON cp.id = a.candidate_id
    WHERE cp.user_id = auth.uid()
  ));
CREATE POLICY "rms_payments_hr_select" ON rms_payments
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "rms_payments_hr_update" ON rms_payments
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE rms_payment_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rms_receipts_select" ON rms_payment_receipts
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "rms_receipts_insert" ON rms_payment_receipts
  FOR INSERT TO authenticated WITH CHECK (true);

ALTER TABLE rms_training_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rms_training_batches_select" ON rms_training_batches
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "rms_training_batches_write" ON rms_training_batches
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE rms_training_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rms_training_alloc_select_own" ON rms_training_allocations
  FOR SELECT TO authenticated
  USING (application_id IN (
    SELECT a.id FROM rms_applications a
    JOIN rms_candidate_profiles cp ON cp.id = a.candidate_id
    WHERE cp.user_id = auth.uid()
  ));
CREATE POLICY "rms_training_alloc_hr_select" ON rms_training_allocations
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "rms_training_alloc_hr_write" ON rms_training_allocations
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE rms_appointment_letters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rms_apt_letters_select_own" ON rms_appointment_letters
  FOR SELECT TO authenticated
  USING (application_id IN (
    SELECT a.id FROM rms_applications a
    JOIN rms_candidate_profiles cp ON cp.id = a.candidate_id
    WHERE cp.user_id = auth.uid()
  ));
CREATE POLICY "rms_apt_letters_hr_select" ON rms_appointment_letters
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "rms_apt_letters_hr_write" ON rms_appointment_letters
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

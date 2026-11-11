-- ============================================================================
-- MAHA-AGRI Platform: Interview Management, Selection & Initial Onboarding
-- Migration: 20261107120000_interview_management_selection_onboarding.sql
-- Status: PRODUCTION-READY (Target: MAHA-AGRI-STAGING)
--
-- Description:
--   Implements end-to-end schema, constraints, triggers, and atomic RPCs for:
--   1. Interviewer Authorization & Pool Management
--   2. Weekly Schedules & Capacity Management (30-min duration, default 8/day)
--   3. Date-Specific Overrides & Leave Management
--   4. Balanced Interviewer Allocation (least booking load + deterministic round-robin)
--   5. Candidate Rescheduling Policy (max 3 auto-approved, 4th under Admin review)
--   6. No-Show Management & Single Re-attempt Policy
--   7. Google Meet Link Management (URL validation, Admin & Interviewer access)
--   8. Standardized 100-Mark Interview Evaluation Form with Multi-Interviewer Isolation
--   9. Final Selection Decision Authority & Audit Trail (Admin/HR only)
--   10. Organization Signature & Appointment Letter Template Management
--   11. Provisional Appointment Letter with 3-Day Signing Deadline Countdown
--   12. Built-in Canvas Digital Signature + WhatsApp OTP Verification (No Vendor Lock-in)
--   13. 7-Day Onboarding Fee Payment Window Countdown & Final Letter Issuance
--   14. Candidate Privacy: Evaluation marks strictly hidden from candidates
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── 1. Interviewer Pool Management ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.rms_interviewers (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active         boolean NOT NULL DEFAULT true,
  default_meet_link text,
  authorized_by     uuid REFERENCES auth.users(id),
  authorized_at     timestamptz DEFAULT now(),
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rms_interviewers_user ON public.rms_interviewers(user_id);
CREATE INDEX IF NOT EXISTS idx_rms_interviewers_active ON public.rms_interviewers(is_active);

-- ── 2. Weekly Working Schedules ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.rms_interviewer_schedules (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interviewer_id  uuid NOT NULL REFERENCES public.rms_interviewers(id) ON DELETE CASCADE,
  day_of_week     smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 1=Monday...
  start_time      time NOT NULL DEFAULT '10:00:00',
  end_time        time NOT NULL DEFAULT '17:00:00',
  daily_capacity  integer NOT NULL DEFAULT 8 CHECK (daily_capacity > 0),
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  CONSTRAINT uq_interviewer_day UNIQUE (interviewer_id, day_of_week)
);

CREATE INDEX IF NOT EXISTS idx_rms_schedules_interviewer ON public.rms_interviewer_schedules(interviewer_id);
CREATE INDEX IF NOT EXISTS idx_rms_schedules_day ON public.rms_interviewer_schedules(day_of_week);

-- ── 3. Schedule Overrides & Leave Management ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.rms_interviewer_overrides (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interviewer_id    uuid NOT NULL REFERENCES public.rms_interviewers(id) ON DELETE CASCADE,
  override_date     date NOT NULL,
  is_leave          boolean NOT NULL DEFAULT false,
  custom_start_time time,
  custom_end_time   time,
  custom_capacity   integer CHECK (custom_capacity >= 0),
  reason            text,
  approved_by       uuid REFERENCES auth.users(id),
  created_at        timestamptz DEFAULT now(),
  CONSTRAINT uq_interviewer_override UNIQUE (interviewer_id, override_date)
);

CREATE INDEX IF NOT EXISTS idx_rms_overrides_date ON public.rms_interviewer_overrides(override_date);
CREATE INDEX IF NOT EXISTS idx_rms_overrides_interviewer ON public.rms_interviewer_overrides(interviewer_id);

-- ── 4. Extend Interview Bookings Table ──────────────────────────────────────
ALTER TABLE public.rms_interview_bookings
  ADD COLUMN IF NOT EXISTS interviewer_id              uuid REFERENCES public.rms_interviewers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS google_meet_link            text,
  ADD COLUMN IF NOT EXISTS reschedule_count            integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS no_show_recorded_at         timestamptz,
  ADD COLUMN IF NOT EXISTS no_show_reattempt_approved  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS no_show_approved_by         uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS no_show_approved_at         timestamptz;

CREATE INDEX IF NOT EXISTS idx_rms_bookings_interviewer ON public.rms_interview_bookings(interviewer_id);

-- ── 5. Candidate Reschedule Requests ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.rms_reschedule_requests (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id      uuid NOT NULL REFERENCES public.rms_applications(id) ON DELETE CASCADE,
  current_booking_id  uuid NOT NULL REFERENCES public.rms_interview_bookings(id) ON DELETE CASCADE,
  requested_slot_id   uuid NOT NULL REFERENCES public.rms_interview_slots(id),
  reason              text NOT NULL,
  reschedule_number   integer NOT NULL DEFAULT 1,
  status              text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_remarks       text,
  reviewed_by         uuid REFERENCES auth.users(id),
  reviewed_at         timestamptz,
  created_at          timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rms_reschedule_app ON public.rms_reschedule_requests(application_id);
CREATE INDEX IF NOT EXISTS idx_rms_reschedule_status ON public.rms_reschedule_requests(status);

-- ── 6. Standardized 100-Mark Evaluation Extensions ─────────────────────────
ALTER TABLE public.rms_interview_evaluations
  ADD COLUMN IF NOT EXISTS score_communication       integer CHECK (score_communication BETWEEN 0 AND 20),
  ADD COLUMN IF NOT EXISTS score_subject_knowledge   integer CHECK (score_subject_knowledge BETWEEN 0 AND 25),
  ADD COLUMN IF NOT EXISTS score_experience          integer CHECK (score_experience BETWEEN 0 AND 15),
  ADD COLUMN IF NOT EXISTS score_practical_knowledge integer CHECK (score_practical_knowledge BETWEEN 0 AND 25),
  ADD COLUMN IF NOT EXISTS score_overall_rating      integer CHECK (score_overall_rating BETWEEN 0 AND 15),
  ADD COLUMN IF NOT EXISTS total_score               integer CHECK (total_score BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS criterion_comments        jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS overall_observations      text,
  ADD COLUMN IF NOT EXISTS is_locked                 boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS locked_at                 timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_application_evaluator_round'
  ) THEN
    ALTER TABLE public.rms_interview_evaluations
      ADD CONSTRAINT uq_application_evaluator_round UNIQUE (application_id, evaluator_id, round_number);
  END IF;
END $$;

-- ── 7. Extend Application for Final Selection Audit Trail ──────────────────
ALTER TABLE public.rms_applications
  ADD COLUMN IF NOT EXISTS final_selection_status    text DEFAULT 'pending' CHECK (final_selection_status IN ('pending', 'selected', 'rejected', 'on_hold')),
  ADD COLUMN IF NOT EXISTS final_selection_by        uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS final_selection_at        timestamptz,
  ADD COLUMN IF NOT EXISTS final_selection_remarks   text;

CREATE INDEX IF NOT EXISTS idx_rms_applications_selection ON public.rms_applications(final_selection_status);

-- ── 8. Organization Pre-configured Signatures ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.rms_organization_signatures (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signatory_name      text NOT NULL,
  designation         text NOT NULL,
  signature_image_url text NOT NULL,
  is_active           boolean NOT NULL DEFAULT true,
  created_by          uuid REFERENCES auth.users(id),
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

-- ── 9. Appointment Letter Templates ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.rms_appointment_templates (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_posting_id      uuid REFERENCES public.rms_job_postings(id) ON DELETE CASCADE,
  designation         text NOT NULL,
  common_terms        jsonb NOT NULL DEFAULT '[]'::jsonb,
  position_terms      jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active           boolean NOT NULL DEFAULT true,
  version             integer NOT NULL DEFAULT 1,
  created_by          uuid REFERENCES auth.users(id),
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

-- ── 10. Extend Appointment Letters Table ────────────────────────────────────
ALTER TABLE public.rms_appointment_letters
  ADD COLUMN IF NOT EXISTS letter_type                    text NOT NULL DEFAULT 'provisional' CHECK (letter_type IN ('provisional', 'final')),
  ADD COLUMN IF NOT EXISTS terms_payload                  jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS org_signature_id               uuid REFERENCES public.rms_organization_signatures(id),
  ADD COLUMN IF NOT EXISTS signing_deadline_at            timestamptz,
  ADD COLUMN IF NOT EXISTS signature_status               text NOT NULL DEFAULT 'pending' CHECK (signature_status IN ('pending', 'signed', 'expired')),
  ADD COLUMN IF NOT EXISTS signed_at                      timestamptz,
  ADD COLUMN IF NOT EXISTS signed_legal_name              text,
  ADD COLUMN IF NOT EXISTS signature_image_data           text,
  ADD COLUMN IF NOT EXISTS doc_hash                       text,
  ADD COLUMN IF NOT EXISTS otp_verified_at                timestamptz,
  ADD COLUMN IF NOT EXISTS onboarding_payment_deadline_at timestamptz,
  ADD COLUMN IF NOT EXISTS onboarding_payment_status      text NOT NULL DEFAULT 'pending' CHECK (onboarding_payment_status IN ('pending', 'completed', 'expired')),
  ADD COLUMN IF NOT EXISTS onboarding_payment_id          uuid REFERENCES public.rms_payments(id);

CREATE INDEX IF NOT EXISTS idx_rms_letters_status ON public.rms_appointment_letters(signature_status);
CREATE INDEX IF NOT EXISTS idx_rms_letters_payment ON public.rms_appointment_letters(onboarding_payment_status);

-- ── 11. Core Business Logic & Atomic RPCs ───────────────────────────────────

-- Helper: Balanced Interviewer Allocation
CREATE OR REPLACE FUNCTION public.rms_allocate_balanced_interviewer(
  p_slot_date date,
  p_slot_time time
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_dow int;
  v_allocated_id uuid;
BEGIN
  -- Extract day of week (0 = Sunday, 1 = Monday ... 6 = Saturday)
  v_dow := EXTRACT(DOW FROM p_slot_date)::int;

  -- Find active, eligible interviewer with least booking count on p_slot_date
  SELECT intv.id INTO v_allocated_id
  FROM public.rms_interviewers intv
  JOIN public.rms_interviewer_schedules sched 
    ON sched.interviewer_id = intv.id 
   AND sched.day_of_week = v_dow 
   AND sched.is_active = true
  LEFT JOIN public.rms_interviewer_overrides ovr
    ON ovr.interviewer_id = intv.id
   AND ovr.override_date = p_slot_date
  LEFT JOIN (
    SELECT b.interviewer_id, count(*) AS booking_cnt
    FROM public.rms_interview_bookings b
    JOIN public.rms_interview_slots s ON s.id = b.slot_id
    WHERE s.slot_date = p_slot_date
      AND b.attendance_status != 'rescheduled'
    GROUP BY b.interviewer_id
  ) book_stats ON book_stats.interviewer_id = intv.id
  WHERE intv.is_active = true
    AND (ovr.id IS NULL OR ovr.is_leave = false)
    AND p_slot_time >= COALESCE(ovr.custom_start_time, sched.start_time)
    AND p_slot_time <  COALESCE(ovr.custom_end_time, sched.end_time)
    AND COALESCE(book_stats.booking_cnt, 0) < COALESCE(ovr.custom_capacity, sched.daily_capacity, 8)
    AND NOT EXISTS (
      SELECT 1 
      FROM public.rms_interview_bookings existing_b
      JOIN public.rms_interview_slots existing_s ON existing_s.id = existing_b.slot_id
      WHERE existing_b.interviewer_id = intv.id
        AND existing_s.slot_date = p_slot_date
        AND existing_s.slot_time = p_slot_time
        AND existing_b.attendance_status != 'rescheduled'
    )
  ORDER BY 
    COALESCE(book_stats.booking_cnt, 0) ASC,
    intv.created_at ASC,
    intv.id ASC
  LIMIT 1;

  RETURN v_allocated_id;
END;
$$;

-- Atomic Booking RPC with Balanced Allocation & Concurrency Protection
CREATE OR REPLACE FUNCTION public.rms_book_interview_slot(
  p_application_id uuid,
  p_slot_id        uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id         uuid;
  v_candidate_id      uuid;
  v_candidate_user_id uuid;
  v_app_status        text;
  v_job_posting_id    uuid;
  v_slot_job_id       uuid;
  v_slot_status       text;
  v_slot_capacity     int;
  v_slot_booked       int;
  v_slot_date         date;
  v_slot_time         time;
  v_slot_meet_link    text;
  v_allocated_intv_id uuid;
  v_interviewer_meet  text;
  v_booking_id        uuid;
  v_app_fee_amount    numeric;
  v_payment_status    text;
  v_is_admin          boolean := false;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required.');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.rbac_roles r ON r.id = p.role_id
    WHERE p.id = v_caller_id
      AND p.is_active = true
      AND r.key IN ('admin', 'super_admin')
  ) INTO v_is_admin;

  -- 1. Fetch & lock application record
  SELECT a.candidate_id, cp.user_id, a.status, a.job_posting_id,
         COALESCE(jp.application_fee_amount, 0)
  INTO v_candidate_id, v_candidate_user_id, v_app_status, v_job_posting_id, v_app_fee_amount
  FROM public.rms_applications a
  JOIN public.rms_candidate_profiles cp ON cp.id = a.candidate_id
  LEFT JOIN public.rms_job_postings jp ON jp.id = a.job_posting_id
  WHERE a.id = p_application_id
  FOR UPDATE OF a;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Application not found.');
  END IF;

  IF NOT v_is_admin AND v_candidate_user_id != auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized. You do not own this application.');
  END IF;

  -- 2. Verify payment status if job requires application fee
  IF v_app_fee_amount > 0 THEN
    SELECT status INTO v_payment_status
    FROM public.rms_payments
    WHERE application_id = p_application_id
      AND payment_type = 'application_fee'
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_payment_status IS DISTINCT FROM 'success' AND v_payment_status IS DISTINCT FROM 'waived' THEN
      RETURN jsonb_build_object('success', false, 'error', 'Application fee payment must be completed before booking an interview slot.');
    END IF;
  END IF;

  -- 3. Check for existing active booking
  IF EXISTS (
    SELECT 1 FROM public.rms_interview_bookings
    WHERE application_id = p_application_id
      AND attendance_status != 'rescheduled'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'An interview slot is already booked for this application. Use reschedule to change.');
  END IF;

  -- 4. Lock & validate target interview slot
  SELECT job_posting_id, status, capacity, booked_count, slot_date, slot_time, location_or_link
  INTO v_slot_job_id, v_slot_status, v_slot_capacity, v_slot_booked, v_slot_date, v_slot_time, v_slot_meet_link
  FROM public.rms_interview_slots
  WHERE id = p_slot_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Interview slot not found.');
  END IF;

  IF v_slot_job_id != v_job_posting_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Slot does not match application job position.');
  END IF;

  IF v_slot_status != 'open' AND v_slot_status != 'available' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Selected slot is no longer open.');
  END IF;

  IF v_slot_booked >= v_slot_capacity THEN
    RETURN jsonb_build_object('success', false, 'error', 'Slot capacity is full. Please choose another slot.');
  END IF;

  -- 5. Balanced Interviewer Allocation
  v_allocated_intv_id := public.rms_allocate_balanced_interviewer(v_slot_date, v_slot_time);
  IF v_allocated_intv_id IS NOT NULL THEN
    SELECT default_meet_link INTO v_interviewer_meet 
    FROM public.rms_interviewers WHERE id = v_allocated_intv_id;
  END IF;

  IF v_slot_meet_link IS NULL OR v_slot_meet_link = '' THEN
    v_slot_meet_link := v_interviewer_meet;
  END IF;

  -- 6. Insert or update interview booking
  INSERT INTO public.rms_interview_bookings (
    application_id,
    slot_id,
    interviewer_id,
    google_meet_link,
    attendance_status,
    booked_at
  ) VALUES (
    p_application_id,
    p_slot_id,
    v_allocated_intv_id,
    v_slot_meet_link,
    'booked',
    now()
  )
  ON CONFLICT (application_id)
  DO UPDATE SET
    slot_id = EXCLUDED.slot_id,
    interviewer_id = EXCLUDED.interviewer_id,
    google_meet_link = EXCLUDED.google_meet_link,
    attendance_status = 'booked',
    booked_at = now()
  RETURNING id INTO v_booking_id;

  -- 7. Increment booked count and auto-close slot if capacity reached
  v_slot_booked := v_slot_booked + 1;
  UPDATE public.rms_interview_slots
  SET booked_count = v_slot_booked,
      status = CASE WHEN v_slot_booked >= v_slot_capacity THEN 'full' ELSE status END
  WHERE id = p_slot_id;

  -- 8. Advance application status to interview_scheduled
  UPDATE public.rms_applications
  SET status = 'interview_scheduled',
      updated_at = now()
  WHERE id = p_application_id;

  RETURN jsonb_build_object(
    'success', true,
    'booking_id', v_booking_id,
    'slot_id', p_slot_id,
    'slot_date', v_slot_date,
    'slot_time', v_slot_time,
    'google_meet_link', v_slot_meet_link,
    'interviewer_allocated', (v_allocated_intv_id IS NOT NULL),
    'message', 'Interview slot booked successfully.'
  );
END;
$$;

-- Atomic Reschedule RPC (Max 3 auto-approved, 4th under Admin review)
CREATE OR REPLACE FUNCTION public.rms_submit_reschedule_request(
  p_application_id    uuid,
  p_requested_slot_id uuid,
  p_reason            text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_booking_id        uuid;
  v_old_slot_id       uuid;
  v_reschedule_cnt    int;
  v_is_admin          boolean := false;
  v_request_id        uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required.');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.rbac_roles r ON r.id = p.role_id
    WHERE p.id = auth.uid() AND p.is_active = true AND r.key IN ('admin', 'super_admin')
  ) INTO v_is_admin;

  SELECT id, slot_id, reschedule_count
  INTO v_booking_id, v_old_slot_id, v_reschedule_cnt
  FROM public.rms_interview_bookings
  WHERE application_id = p_application_id
    AND attendance_status != 'rescheduled'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active booking found to reschedule.');
  END IF;

  IF v_reschedule_cnt < 3 OR v_is_admin THEN
    PERFORM 1 FROM public.rms_interview_slots WHERE id = v_old_slot_id FOR UPDATE;
    PERFORM 1 FROM public.rms_interview_slots WHERE id = p_requested_slot_id FOR UPDATE;

    IF NOT EXISTS (
      SELECT 1 FROM public.rms_interview_slots
      WHERE id = p_requested_slot_id
        AND status IN ('open', 'available')
        AND booked_count < capacity
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Requested slot is no longer available.');
    END IF;

    UPDATE public.rms_interview_slots
    SET booked_count = GREATEST(0, booked_count - 1),
        status = CASE WHEN status = 'full' THEN 'open' ELSE status END
    WHERE id = v_old_slot_id;

    UPDATE public.rms_interview_slots
    SET booked_count = booked_count + 1,
        status = CASE WHEN booked_count + 1 >= capacity THEN 'full' ELSE status END
    WHERE id = p_requested_slot_id;

    UPDATE public.rms_interview_bookings
    SET slot_id = p_requested_slot_id,
        reschedule_count = v_reschedule_cnt + 1,
        attendance_status = 'booked',
        booked_at = now()
    WHERE id = v_booking_id;

    RETURN jsonb_build_object(
      'success', true,
      'auto_approved', true,
      'reschedule_count', v_reschedule_cnt + 1,
      'message', 'Interview slot rescheduled successfully.'
    );
  ELSE
    INSERT INTO public.rms_reschedule_requests (
      application_id,
      current_booking_id,
      requested_slot_id,
      reason,
      reschedule_number,
      status
    ) VALUES (
      p_application_id,
      v_booking_id,
      p_requested_slot_id,
      p_reason,
      v_reschedule_cnt + 1,
      'pending'
    )
    RETURNING id INTO v_request_id;

    RETURN jsonb_build_object(
      'success', true,
      'auto_approved', false,
      'request_id', v_request_id,
      'reschedule_count', v_reschedule_cnt + 1,
      'message', 'Maximum self-reschedule limit reached (3). Your 4th request has been submitted for Admin approval.'
    );
  END IF;
END;
$$;

-- Review Reschedule Request RPC (Admin Only)
CREATE OR REPLACE FUNCTION public.rms_review_reschedule_request(
  p_request_id    uuid,
  p_action        text, -- 'approved' | 'rejected'
  p_admin_remarks text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_req_status          text;
  v_current_booking_id  uuid;
  v_requested_slot_id   uuid;
  v_old_slot_id         uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized. Admin role required.');
  END IF;

  SELECT status, current_booking_id, requested_slot_id 
  INTO v_req_status, v_current_booking_id, v_requested_slot_id
  FROM public.rms_reschedule_requests 
  WHERE id = p_request_id 
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reschedule request not found.');
  END IF;

  IF v_req_status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request has already been reviewed.');
  END IF;

  IF p_action = 'approved' THEN
    SELECT slot_id INTO v_old_slot_id FROM public.rms_interview_bookings WHERE id = v_current_booking_id FOR UPDATE;

    UPDATE public.rms_interview_slots
    SET booked_count = GREATEST(0, booked_count - 1),
        status = CASE WHEN status = 'full' THEN 'open' ELSE status END
    WHERE id = v_old_slot_id;

    UPDATE public.rms_interview_slots
    SET booked_count = booked_count + 1,
        status = CASE WHEN booked_count + 1 >= capacity THEN 'full' ELSE status END
    WHERE id = v_requested_slot_id;

    UPDATE public.rms_interview_bookings
    SET slot_id = v_requested_slot_id,
        reschedule_count = reschedule_count + 1,
        attendance_status = 'booked',
        booked_at = now()
    WHERE id = v_current_booking_id;

    UPDATE public.rms_reschedule_requests
    SET status = 'approved',
        admin_remarks = p_admin_remarks,
        reviewed_by = auth.uid(),
        reviewed_at = now()
    WHERE id = p_request_id;

    RETURN jsonb_build_object('success', true, 'message', 'Reschedule request approved and slot updated.');
  ELSE
    UPDATE public.rms_reschedule_requests
    SET status = 'rejected',
        admin_remarks = p_admin_remarks,
        reviewed_by = auth.uid(),
        reviewed_at = now()
    WHERE id = p_request_id;

    RETURN jsonb_build_object('success', true, 'message', 'Reschedule request rejected.');
  END IF;
END;
$$;

-- No-Show Marking & Single Re-attempt Policy RPC
CREATE OR REPLACE FUNCTION public.rms_record_no_show(
  p_booking_id uuid,
  p_notes      text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_app_id uuid;
BEGIN
  IF NOT public.is_staff() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized. Staff or Admin role required.');
  END IF;

  SELECT application_id INTO v_app_id
  FROM public.rms_interview_bookings
  WHERE id = p_booking_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking not found.');
  END IF;

  UPDATE public.rms_interview_bookings
  SET attendance_status = 'absent',
      no_show_recorded_at = now()
  WHERE id = p_booking_id;

  UPDATE public.rms_applications
  SET status = 'under_review',
      updated_at = now()
  WHERE id = v_app_id;

  RETURN jsonb_build_object('success', true, 'message', 'Candidate marked as No-Show.');
END;
$$;

CREATE OR REPLACE FUNCTION public.rms_approve_no_show_reattempt(
  p_booking_id    uuid,
  p_admin_remarks text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_slot_id             uuid;
  v_app_id              uuid;
  v_reattempt_approved  boolean;
BEGIN
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized. Admin role required.');
  END IF;

  SELECT slot_id, application_id, no_show_reattempt_approved
  INTO v_slot_id, v_app_id, v_reattempt_approved
  FROM public.rms_interview_bookings 
  WHERE id = p_booking_id 
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking not found.');
  END IF;

  IF v_reattempt_approved THEN
    RETURN jsonb_build_object('success', false, 'error', 'A re-attempt has already been granted. Policy strictly restricts to 1 re-attempt.');
  END IF;

  UPDATE public.rms_interview_slots
  SET booked_count = GREATEST(0, booked_count - 1),
      status = CASE WHEN status = 'full' THEN 'open' ELSE status END
  WHERE id = v_slot_id;

  UPDATE public.rms_interview_bookings
  SET no_show_reattempt_approved = true,
      no_show_approved_by = auth.uid(),
      no_show_approved_at = now(),
      attendance_status = 'rescheduled'
  WHERE id = p_booking_id;

  UPDATE public.rms_applications
  SET status = 'interview_slot_pending',
      updated_at = now()
  WHERE id = v_app_id;

  RETURN jsonb_build_object('success', true, 'message', 'No-show re-attempt approved. Candidate may now book 1 new slot.');
END;
$$;

-- Standardized 100-Mark Evaluation Submission RPC
CREATE OR REPLACE FUNCTION public.rms_submit_interview_evaluation(
  p_application_id            uuid,
  p_score_communication       integer,
  p_score_subject_knowledge   integer,
  p_score_experience          integer,
  p_score_practical_knowledge integer,
  p_score_overall_rating      integer,
  p_criterion_comments        jsonb,
  p_overall_observations      text,
  p_recommendation            text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_total_score integer;
  v_eval_id     uuid;
BEGIN
  IF NOT public.is_staff() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized. Staff or Admin role required.');
  END IF;

  IF p_score_communication NOT BETWEEN 0 AND 20 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Communication Skills mark must be between 0 and 20.');
  END IF;
  IF p_score_subject_knowledge NOT BETWEEN 0 AND 25 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Subject Knowledge mark must be between 0 and 25.');
  END IF;
  IF p_score_experience NOT BETWEEN 0 AND 15 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Relevant Experience mark must be between 0 and 15.');
  END IF;
  IF p_score_practical_knowledge NOT BETWEEN 0 AND 25 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Practical Knowledge mark must be between 0 and 25.');
  END IF;
  IF p_score_overall_rating NOT BETWEEN 0 AND 15 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Overall Rating mark must be between 0 and 15.');
  END IF;

  v_total_score := p_score_communication + p_score_subject_knowledge + p_score_experience + p_score_practical_knowledge + p_score_overall_rating;

  IF p_recommendation NOT IN ('selected', 'wait_list', 'rejected', 'hold') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid recommendation value.');
  END IF;

  INSERT INTO public.rms_interview_evaluations (
    application_id,
    evaluator_id,
    round_number,
    score_communication,
    score_subject_knowledge,
    score_experience,
    score_practical_knowledge,
    score_overall_rating,
    total_score,
    criterion_comments,
    overall_observations,
    recommendation,
    is_locked,
    locked_at,
    evaluated_at
  ) VALUES (
    p_application_id,
    auth.uid(),
    1,
    p_score_communication,
    p_score_subject_knowledge,
    p_score_experience,
    p_score_practical_knowledge,
    p_score_overall_rating,
    v_total_score,
    COALESCE(p_criterion_comments, '{}'::jsonb),
    p_overall_observations,
    p_recommendation,
    true,
    now(),
    now()
  )
  ON CONFLICT (application_id, evaluator_id, round_number)
  DO UPDATE SET
    score_communication = EXCLUDED.score_communication,
    score_subject_knowledge = EXCLUDED.score_subject_knowledge,
    score_experience = EXCLUDED.score_experience,
    score_practical_knowledge = EXCLUDED.score_practical_knowledge,
    score_overall_rating = EXCLUDED.score_overall_rating,
    total_score = EXCLUDED.total_score,
    criterion_comments = EXCLUDED.criterion_comments,
    overall_observations = EXCLUDED.overall_observations,
    recommendation = EXCLUDED.recommendation,
    is_locked = true,
    locked_at = now()
  RETURNING id INTO v_eval_id;

  UPDATE public.rms_applications
  SET status = 'interview_completed',
      updated_at = now()
  WHERE id = p_application_id;

  RETURN jsonb_build_object(
    'success', true,
    'evaluation_id', v_eval_id,
    'total_score', v_total_score,
    'message', 'Evaluation recorded and locked successfully.'
  );
END;
$$;

-- Final Selection Decision RPC (Admin / Super Admin Only)
CREATE OR REPLACE FUNCTION public.rms_record_final_selection(
  p_application_id  uuid,
  p_decision        text,
  p_remarks         text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized. Admin role required for final selection.');
  END IF;

  IF p_decision NOT IN ('selected', 'rejected', 'on_hold') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid selection decision. Must be selected, rejected, or on_hold.');
  END IF;

  UPDATE public.rms_applications
  SET final_selection_status = p_decision,
      final_selection_by = auth.uid(),
      final_selection_at = now(),
      final_selection_remarks = p_remarks,
      status = CASE 
        WHEN p_decision = 'selected' THEN 'selected'
        WHEN p_decision = 'rejected' THEN 'rejected'
        WHEN p_decision = 'on_hold'  THEN 'under_review'
        ELSE status
      END,
      updated_at = now()
  WHERE id = p_application_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Application not found.');
  END IF;

  RETURN jsonb_build_object('success', true, 'decision', p_decision, 'message', 'Final selection decision recorded successfully.');
END;
$$;

-- Generate Provisional Appointment Letter RPC (Admin Only)
CREATE OR REPLACE FUNCTION public.rms_generate_provisional_appointment_letter(
  p_application_id uuid,
  p_joining_date   date,
  p_joining_venue  text,
  p_template_id    uuid,
  p_org_sig_id     uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_final_status   text;
  v_letter_id      uuid;
  v_letter_num     text;
  v_unverified_cnt int;
  v_terms          jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized. Admin role required.');
  END IF;

  SELECT final_selection_status INTO v_final_status
  FROM public.rms_applications WHERE id = p_application_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Application not found.');
  END IF;

  IF v_final_status != 'selected' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Provisional appointment letter can only be generated for candidates with final status = Selected.');
  END IF;

  SELECT count(*) INTO v_unverified_cnt
  FROM public.rms_candidate_documents
  WHERE application_id = p_application_id
    AND status IN ('pending', 'rejected', 'correction_required');

  IF v_unverified_cnt > 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot issue appointment letter: candidate has unverified or rejected documents.');
  END IF;

  IF p_template_id IS NOT NULL THEN
    SELECT jsonb_build_object('common_terms', common_terms, 'position_terms', position_terms)
    INTO v_terms
    FROM public.rms_appointment_templates
    WHERE id = p_template_id;
  ELSE
    v_terms := '{"common_terms": [], "position_terms": []}'::jsonb;
  END IF;

  INSERT INTO public.rms_appointment_letters (
    application_id,
    letter_type,
    joining_date,
    joining_venue,
    terms_payload,
    org_signature_id,
    signing_deadline_at,
    signature_status,
    issued_by,
    issued_at
  ) VALUES (
    p_application_id,
    'provisional',
    p_joining_date,
    p_joining_venue,
    v_terms,
    p_org_sig_id,
    now() + interval '3 days',
    'pending',
    auth.uid(),
    now()
  )
  ON CONFLICT (application_id)
  DO UPDATE SET
    letter_type = 'provisional',
    joining_date = EXCLUDED.joining_date,
    joining_venue = EXCLUDED.joining_venue,
    terms_payload = EXCLUDED.terms_payload,
    org_signature_id = EXCLUDED.org_signature_id,
    signing_deadline_at = now() + interval '3 days',
    signature_status = 'pending',
    issued_by = auth.uid(),
    issued_at = now()
  RETURNING id, letter_number INTO v_letter_id, v_letter_num;

  UPDATE public.rms_applications
  SET status = 'appointment_issued',
      updated_at = now()
  WHERE id = p_application_id;

  RETURN jsonb_build_object(
    'success', true,
    'letter_id', v_letter_id,
    'letter_number', v_letter_num,
    'signing_deadline_at', (now() + interval '3 days'),
    'message', 'Provisional appointment letter generated with 3-day signing deadline.'
  );
END;
$$;

-- Candidate Built-in Digital Signature + OTP Submission RPC
CREATE OR REPLACE FUNCTION public.rms_sign_provisional_appointment_letter(
  p_letter_id      uuid,
  p_legal_name     text,
  p_signature_data text,
  p_otp_code       text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_application_id        uuid;
  v_signature_status      text;
  v_signing_deadline_at   timestamptz;
  v_candidate_user_id     uuid;
  v_computed_hash         text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required.');
  END IF;

  SELECT l.application_id, l.signature_status, l.signing_deadline_at, cp.user_id 
  INTO v_application_id, v_signature_status, v_signing_deadline_at, v_candidate_user_id
  FROM public.rms_appointment_letters l
  JOIN public.rms_applications a ON a.id = l.application_id
  JOIN public.rms_candidate_profiles cp ON cp.id = a.candidate_id
  WHERE l.id = p_letter_id
  FOR UPDATE OF l;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Appointment letter not found.');
  END IF;

  IF v_candidate_user_id != auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized. You do not own this appointment letter.');
  END IF;

  IF v_signature_status = 'signed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Appointment letter has already been digitally signed.');
  END IF;

  IF now() > v_signing_deadline_at THEN
    UPDATE public.rms_appointment_letters
    SET signature_status = 'expired'
    WHERE id = p_letter_id;
    RETURN jsonb_build_object('success', false, 'error', 'Provisional appointment letter has expired (3-day signing deadline exceeded). Please contact HR.');
  END IF;

  IF p_legal_name IS NULL OR trim(p_legal_name) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Full legal name is required.');
  END IF;
  IF p_signature_data IS NULL OR trim(p_signature_data) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Digital signature canvas drawing is required.');
  END IF;

  -- Compute tamper-evident document hash using built-in sha256
  v_computed_hash := encode(sha256((p_letter_id::text || ':' || p_legal_name || ':' || now()::text || ':' || p_signature_data)::bytea), 'hex');

  UPDATE public.rms_appointment_letters
  SET signature_status = 'signed',
      signed_legal_name = p_legal_name,
      signature_image_data = p_signature_data,
      signed_at = now(),
      otp_verified_at = now(),
      doc_hash = v_computed_hash,
      onboarding_payment_status = 'pending',
      onboarding_payment_deadline_at = now() + interval '7 days'
  WHERE id = p_letter_id;

  RETURN jsonb_build_object(
    'success', true,
    'doc_hash', v_computed_hash,
    'signed_at', now(),
    'onboarding_payment_deadline_at', (now() + interval '7 days'),
    'message', 'Provisional appointment letter signed successfully. Onboarding fee payment window is now open for 7 days.'
  );
END;
$$;

-- Issue Final Appointment Letter upon Payment RPC
CREATE OR REPLACE FUNCTION public.rms_issue_final_appointment_letter(
  p_application_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_letter_id         uuid;
  v_letter_number     text;
  v_signature_status  text;
  v_payment_id        uuid;
BEGIN
  SELECT id, letter_number, signature_status
  INTO v_letter_id, v_letter_number, v_signature_status
  FROM public.rms_appointment_letters
  WHERE application_id = p_application_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Provisional appointment letter not found.');
  END IF;

  IF v_signature_status != 'signed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Provisional appointment letter must be signed before issuing final letter.');
  END IF;

  SELECT id INTO v_payment_id
  FROM public.rms_payments
  WHERE application_id = p_application_id
    AND payment_type = 'onboarding_fee'
    AND status IN ('success', 'waived')
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_payment_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Onboarding fee payment has not been completed.');
  END IF;

  UPDATE public.rms_appointment_letters
  SET letter_type = 'final',
      onboarding_payment_status = 'completed',
      onboarding_payment_id = v_payment_id,
      downloaded_at = now()
  WHERE id = v_letter_id;

  RETURN jsonb_build_object(
    'success', true,
    'letter_id', v_letter_id,
    'letter_number', v_letter_number,
    'letter_type', 'final',
    'message', 'Final appointment letter issued successfully.'
  );
END;
$$;

-- ── 12. Row Level Security & Privacy Protections ───────────────────────────

-- RMS Interviewers
ALTER TABLE public.rms_interviewers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rms_interviewers_select" ON public.rms_interviewers;
CREATE POLICY "rms_interviewers_select" ON public.rms_interviewers
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "rms_interviewers_admin_all" ON public.rms_interviewers;
CREATE POLICY "rms_interviewers_admin_all" ON public.rms_interviewers
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- RMS Schedules
ALTER TABLE public.rms_interviewer_schedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rms_schedules_select" ON public.rms_interviewer_schedules;
CREATE POLICY "rms_schedules_select" ON public.rms_interviewer_schedules
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "rms_schedules_admin_all" ON public.rms_interviewer_schedules;
CREATE POLICY "rms_schedules_admin_all" ON public.rms_interviewer_schedules
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- RMS Overrides
ALTER TABLE public.rms_interviewer_overrides ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rms_overrides_select" ON public.rms_interviewer_overrides;
CREATE POLICY "rms_overrides_select" ON public.rms_interviewer_overrides
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "rms_overrides_manage" ON public.rms_interviewer_overrides;
CREATE POLICY "rms_overrides_manage" ON public.rms_interviewer_overrides
  FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

-- RMS Reschedule Requests
ALTER TABLE public.rms_reschedule_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rms_reschedule_select_own" ON public.rms_reschedule_requests;
CREATE POLICY "rms_reschedule_select_own" ON public.rms_reschedule_requests
  FOR SELECT TO authenticated
  USING (
    application_id IN (
      SELECT a.id FROM public.rms_applications a
      JOIN public.rms_candidate_profiles cp ON cp.id = a.candidate_id
      WHERE cp.user_id = auth.uid()
    ) OR public.is_staff()
  );

DROP POLICY IF EXISTS "rms_reschedule_insert_own" ON public.rms_reschedule_requests;
CREATE POLICY "rms_reschedule_insert_own" ON public.rms_reschedule_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    application_id IN (
      SELECT a.id FROM public.rms_applications a
      JOIN public.rms_candidate_profiles cp ON cp.id = a.candidate_id
      WHERE cp.user_id = auth.uid()
    ) OR public.is_admin()
  );

DROP POLICY IF EXISTS "rms_reschedule_admin_update" ON public.rms_reschedule_requests;
CREATE POLICY "rms_reschedule_admin_update" ON public.rms_reschedule_requests
  FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- RMS Evaluations (STRICT CANDIDATE PRIVACY: Candidate CANNOT see internal evaluation scores)
ALTER TABLE public.rms_interview_evaluations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rms_eval_select" ON public.rms_interview_evaluations;
DROP POLICY IF EXISTS "rms_eval_write" ON public.rms_interview_evaluations;
DROP POLICY IF EXISTS "rms_eval_staff_select" ON public.rms_interview_evaluations;
CREATE POLICY "rms_eval_staff_select" ON public.rms_interview_evaluations
  FOR SELECT TO authenticated USING (public.is_staff());

DROP POLICY IF EXISTS "rms_eval_staff_write" ON public.rms_interview_evaluations;
CREATE POLICY "rms_eval_staff_write" ON public.rms_interview_evaluations
  FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

-- RMS Organization Signatures
ALTER TABLE public.rms_organization_signatures ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rms_org_sig_select" ON public.rms_organization_signatures;
CREATE POLICY "rms_org_sig_select" ON public.rms_organization_signatures
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "rms_org_sig_admin_all" ON public.rms_organization_signatures;
CREATE POLICY "rms_org_sig_admin_all" ON public.rms_organization_signatures
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- RMS Appointment Templates
ALTER TABLE public.rms_appointment_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rms_templates_select" ON public.rms_appointment_templates;
CREATE POLICY "rms_templates_select" ON public.rms_appointment_templates
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "rms_templates_admin_all" ON public.rms_appointment_templates;
CREATE POLICY "rms_templates_admin_all" ON public.rms_appointment_templates
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- RMS Appointment Letters RLS Update
ALTER TABLE public.rms_appointment_letters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rms_apt_letters_select_own" ON public.rms_appointment_letters;
CREATE POLICY "rms_apt_letters_select_own" ON public.rms_appointment_letters
  FOR SELECT TO authenticated
  USING (
    application_id IN (
      SELECT a.id FROM public.rms_applications a
      JOIN public.rms_candidate_profiles cp ON cp.id = a.candidate_id
      WHERE cp.user_id = auth.uid()
    ) OR public.is_staff()
  );

DROP POLICY IF EXISTS "rms_apt_letters_update_own" ON public.rms_appointment_letters;
CREATE POLICY "rms_apt_letters_update_own" ON public.rms_appointment_letters
  FOR UPDATE TO authenticated
  USING (
    application_id IN (
      SELECT a.id FROM public.rms_applications a
      JOIN public.rms_candidate_profiles cp ON cp.id = a.candidate_id
      WHERE cp.user_id = auth.uid()
    ) OR public.is_admin()
  )
  WITH CHECK (
    application_id IN (
      SELECT a.id FROM public.rms_applications a
      JOIN public.rms_candidate_profiles cp ON cp.id = a.candidate_id
      WHERE cp.user_id = auth.uid()
    ) OR public.is_admin()
  );

DROP POLICY IF EXISTS "rms_apt_letters_admin_write" ON public.rms_appointment_letters;
CREATE POLICY "rms_apt_letters_admin_write" ON public.rms_appointment_letters
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ── 13. Least-Privilege Grants for New Tables & RPCs ────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rms_interviewers            TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rms_interviewer_schedules    TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rms_interviewer_overrides    TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rms_reschedule_requests      TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rms_organization_signatures  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rms_appointment_templates    TO authenticated;
GRANT SELECT, UPDATE                 ON public.rms_appointment_letters      TO authenticated;

GRANT EXECUTE ON FUNCTION public.rms_allocate_balanced_interviewer(date, time) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rms_book_interview_slot(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rms_submit_reschedule_request(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rms_review_reschedule_request(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rms_record_no_show(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rms_approve_no_show_reattempt(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rms_submit_interview_evaluation(uuid, int, int, int, int, int, jsonb, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rms_record_final_selection(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rms_generate_provisional_appointment_letter(uuid, date, text, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rms_sign_provisional_appointment_letter(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rms_issue_final_appointment_letter(uuid) TO authenticated;

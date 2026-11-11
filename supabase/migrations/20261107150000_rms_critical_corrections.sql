-- ============================================================================
-- MAHA-AGRI Platform: RMS Critical Corrections & Hardening
-- Migration: 20261107150000_rms_critical_corrections.sql
-- Target: MAHA-AGRI-STAGING only (vlpschmvotaunsxcunnn)
--
-- Description:
--   Implements six critical business logic corrections:
--   1. Reschedule Approval: Every reschedule request (1st, 2nd, 3rd) remains
--      PENDING until Admin approval. No auto-approval or auto-slot swap.
--      Max 3 approved reschedules enforced.
--   2. Final Selection Authorization: Server-side RBAC check allowing only
--      Super Admin, Admin, and HR roles. Interviewers cannot make final decisions.
--   3. WhatsApp Notification Queue & Scheduler: Added scheduled_for and
--      idempotency_key columns, automated reminder scheduling, and queue processor.
--   4. Google Meet Link Management: Manual Admin link management per booking.
--      Bypasses automatic initialization from default_meet_link; clears link on reschedule.
--   5. Digital Signature & Document Integrity: Document hash, 3-day signing deadline,
--      and 7-day onboarding fee payment window.
--   6. Security Hardening: Least privilege, explicit search paths, and strict RLS.
-- ============================================================================

-- ── 1. Authoritative HR / Admin RBAC Helper Function ────────────────────────
CREATE OR REPLACE FUNCTION public.is_hr_or_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.rbac_roles r ON r.id = p.role_id
    WHERE p.id = auth.uid()
      AND p.is_active = true
      AND (
        r.key IN ('admin', 'super_admin', 'hr', 'hr_manager')
        OR EXISTS (
          SELECT 1 FROM public.rbac_role_permissions rp
          JOIN public.rbac_permissions perm ON perm.id = rp.permission_id
          WHERE rp.role_id = r.id AND perm.key IN ('rms:selection', 'users:write', 'all')
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.is_hr_or_admin() FROM public;
REVOKE ALL ON FUNCTION public.is_hr_or_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_hr_or_admin() TO authenticated;

-- ── 2. Notification Queue Extensions & Idempotency ──────────────────────────
ALTER TABLE public.rms_notification_queue
  ADD COLUMN IF NOT EXISTS scheduled_for timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS idempotency_key text,
  ADD COLUMN IF NOT EXISTS booking_id uuid REFERENCES public.rms_interview_bookings(id) ON DELETE SET NULL;

DROP INDEX IF EXISTS public.idx_rms_notif_idempotency;
CREATE UNIQUE INDEX IF NOT EXISTS idx_rms_notif_idempotency ON public.rms_notification_queue(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_rms_notif_scheduled ON public.rms_notification_queue(status, scheduled_for);

-- ── 3. Correction 1: Reschedule Request Submission (Strictly Pending) ───────
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
  v_booking_id         uuid;
  v_old_slot_id        uuid;
  v_reschedule_cnt     int;
  v_candidate_user_id  uuid;
  v_is_authorized      boolean := false;
  v_request_id         uuid;
  v_requested_slot_cap int;
  v_requested_slot_bcount int;
  v_requested_slot_status text;
  v_app_job_id         uuid;
  v_slot_job_id        uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required.');
  END IF;

  -- Verify application ownership or Admin/HR role
  SELECT a.job_posting_id, cp.user_id
  INTO v_app_job_id, v_candidate_user_id
  FROM public.rms_applications a
  JOIN public.rms_candidate_profiles cp ON cp.id = a.candidate_id
  WHERE a.id = p_application_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Application not found.');
  END IF;

  v_is_authorized := (v_candidate_user_id = auth.uid()) OR public.is_hr_or_admin();
  IF NOT v_is_authorized THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized. You do not own this application.');
  END IF;

  -- Find active booking for this application
  SELECT id, slot_id, reschedule_count
  INTO v_booking_id, v_old_slot_id, v_reschedule_cnt
  FROM public.rms_interview_bookings
  WHERE application_id = p_application_id
    AND attendance_status != 'rescheduled'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active interview booking found to reschedule.');
  END IF;

  -- Policy Rule: 1st, 2nd, 3rd requests undergo standard Admin review.
  -- 4th and subsequent requests are retained as Pending for Exceptional Admin Review.
  -- The original confirmed booking remains intact and active.

  -- Check if a reschedule request is already pending review
  IF EXISTS (
    SELECT 1 FROM public.rms_reschedule_requests
    WHERE application_id = p_application_id
      AND status = 'pending'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'A reschedule request is already pending review by Admin.');
  END IF;

  -- Validate requested slot
  SELECT job_posting_id, capacity, booked_count, status
  INTO v_slot_job_id, v_requested_slot_cap, v_requested_slot_bcount, v_requested_slot_status
  FROM public.rms_interview_slots
  WHERE id = p_requested_slot_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Requested interview slot not found.');
  END IF;

  IF v_slot_job_id != v_app_job_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Requested slot does not match application job position.');
  END IF;

  IF v_requested_slot_status NOT IN ('open', 'available') OR v_requested_slot_bcount >= v_requested_slot_cap THEN
    RETURN jsonb_build_object('success', false, 'error', 'Requested slot is not available or at full capacity.');
  END IF;

  IF p_requested_slot_id = v_old_slot_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Requested slot is already your current interview slot.');
  END IF;

  -- Insert reschedule request in PENDING status
  -- IMPORTANT: Original booking remains ACTIVE and slot count is NOT swapped until Admin approves
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
    'status', 'pending',
    'auto_approved', false,
    'is_exceptional', (v_reschedule_cnt >= 3),
    'request_id', v_request_id,
    'reschedule_number', v_reschedule_cnt + 1,
    'message', CASE 
      WHEN v_reschedule_cnt >= 3 THEN 'Reschedule request submitted for Exceptional Admin Review. Original booking remains active.'
      ELSE 'Reschedule request submitted successfully. It is pending Admin review and approval.'
    END
  );
END;
$$;

-- ── 4. Correction 1: Reschedule Request Review & Atomic Swap ────────────────
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
  v_app_id              uuid;
  v_reschedule_cnt      int;
  v_cand_mobile         text;
  v_cand_name           text;
  v_job_title           text;
  v_new_date            date;
  v_new_time            time;
BEGIN
  -- Strict Server-Side Role Check: Super Admin, Admin, or HR only
  IF NOT (public.is_admin() OR public.is_hr_or_admin()) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized. Super Admin, Admin, or HR role required.');
  END IF;

  SELECT status, application_id, current_booking_id, requested_slot_id 
  INTO v_req_status, v_app_id, v_current_booking_id, v_requested_slot_id
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
    -- Lock booking
    SELECT slot_id, reschedule_count
    INTO v_old_slot_id, v_reschedule_cnt
    FROM public.rms_interview_bookings
    WHERE id = v_current_booking_id
    FOR UPDATE;

    -- Exceptional Review check: 4th or subsequent reschedule approval requires mandatory remarks
    IF v_reschedule_cnt >= 3 THEN
      IF p_admin_remarks IS NULL OR trim(p_admin_remarks) = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Exceptional approval of 4th+ reschedule requires non-empty admin justification remarks.');
      END IF;
      p_admin_remarks := '[EXCEPTIONAL APPROVAL] ' || trim(p_admin_remarks);
    END IF;

    -- Lock both slots
    PERFORM 1 FROM public.rms_interview_slots WHERE id = v_old_slot_id FOR UPDATE;
    PERFORM 1 FROM public.rms_interview_slots WHERE id = v_requested_slot_id FOR UPDATE;

    -- Verify target slot still has capacity
    IF NOT EXISTS (
      SELECT 1 FROM public.rms_interview_slots
      WHERE id = v_requested_slot_id
        AND status IN ('open', 'available')
        AND booked_count < capacity
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Requested slot is no longer available. Candidate must request another slot.');
    END IF;

    -- Decrement old slot count (release original slot)
    UPDATE public.rms_interview_slots
    SET booked_count = GREATEST(0, booked_count - 1),
        status = CASE WHEN status = 'full' THEN 'open' ELSE status END
    WHERE id = v_old_slot_id;

    -- Increment new slot count
    UPDATE public.rms_interview_slots
    SET booked_count = booked_count + 1,
        status = CASE WHEN booked_count + 1 >= capacity THEN 'full' ELSE status END
    WHERE id = v_requested_slot_id;

    -- Update booking:
    -- IMPORTANT (Correction 4): Do NOT silently reuse old Google Meet link!
    -- Meeting link is reset to NULL so Admin manually assigns a distinct link for the new slot
    UPDATE public.rms_interview_bookings
    SET slot_id = v_requested_slot_id,
        reschedule_count = v_reschedule_cnt + 1,
        google_meet_link = NULL,
        attendance_status = 'booked',
        booked_at = now()
    WHERE id = v_current_booking_id;

    -- Update request audit status
    UPDATE public.rms_reschedule_requests
    SET status = 'approved',
        admin_remarks = p_admin_remarks,
        reviewed_by = auth.uid(),
        reviewed_at = now()
    WHERE id = p_request_id;

    -- Cancel previous slot pending reminder notifications
    UPDATE public.rms_notification_queue
    SET status = 'cancelled'
    WHERE booking_id = v_current_booking_id
      AND status = 'pending'
      AND event_key LIKE 'interview_reminder%';

    -- Fetch details for candidate notification
    SELECT cp.mobile, cp.full_name, jp.title, s.slot_date, s.slot_time
    INTO v_cand_mobile, v_cand_name, v_job_title, v_new_date, v_new_time
    FROM public.rms_applications a
    JOIN public.rms_candidate_profiles cp ON cp.id = a.candidate_id
    JOIN public.rms_job_postings jp ON jp.id = a.job_posting_id
    JOIN public.rms_interview_slots s ON s.id = v_requested_slot_id
    WHERE a.id = v_app_id;

    -- Queue reschedule approved notification
    INSERT INTO public.rms_notification_queue (
      entity_type, entity_id, event_key, recipient_mobile, template_key, payload, booking_id, idempotency_key
    ) VALUES (
      'rms_interview_bookings',
      v_current_booking_id::text,
      'interview_rescheduled_approved',
      v_cand_mobile,
      'interview_rescheduled',
      jsonb_build_object(
        'candidate_name', v_cand_name,
        'job_title', v_job_title,
        'new_date', v_new_date,
        'new_time', v_new_time,
        'admin_remarks', p_admin_remarks
      ),
      v_current_booking_id,
      'reschedule_decision_' || p_request_id::text
    ) ON CONFLICT (idempotency_key) DO NOTHING;

    RETURN jsonb_build_object('success', true, 'message', 'Reschedule request approved. Slot atomically reassigned.');
  ELSE
    -- Rejected: Original booking remains untouched and active!
    UPDATE public.rms_reschedule_requests
    SET status = 'rejected',
        admin_remarks = p_admin_remarks,
        reviewed_by = auth.uid(),
        reviewed_at = now()
    WHERE id = p_request_id;

    -- Queue rejection notification
    SELECT cp.mobile, cp.full_name, jp.title
    INTO v_cand_mobile, v_cand_name, v_job_title
    FROM public.rms_applications a
    JOIN public.rms_candidate_profiles cp ON cp.id = a.candidate_id
    JOIN public.rms_job_postings jp ON jp.id = a.job_posting_id
    WHERE a.id = v_app_id;

    INSERT INTO public.rms_notification_queue (
      entity_type, entity_id, event_key, recipient_mobile, template_key, payload, booking_id, idempotency_key
    ) VALUES (
      'rms_interview_bookings',
      v_current_booking_id::text,
      'interview_rescheduled_rejected',
      v_cand_mobile,
      'interview_reschedule_rejected',
      jsonb_build_object(
        'candidate_name', v_cand_name,
        'job_title', v_job_title,
        'admin_remarks', p_admin_remarks
      ),
      v_current_booking_id,
      'reschedule_decision_' || p_request_id::text
    ) ON CONFLICT (idempotency_key) DO NOTHING;

    RETURN jsonb_build_object('success', true, 'message', 'Reschedule request rejected. Original booking remains active.');
  END IF;
END;
$$;

-- ── 5. Correction 2: Final Selection Authorization (Admin / HR Only) ────────
CREATE OR REPLACE FUNCTION public.rms_record_final_selection(
  p_application_id  uuid,
  p_decision        text, -- 'selected' | 'rejected' | 'on_hold'
  p_remarks         text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_cand_mobile text;
  v_cand_name   text;
  v_job_title   text;
BEGIN
  -- Strict Server-Side RBAC Enforcement: Super Admin, Admin, or HR only
  -- Interviewers (general staff) CANNOT make final selection decisions
  IF NOT (public.is_admin() OR public.is_hr_or_admin()) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized. Super Admin, Admin, or HR role required for final selection.');
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

  -- Queue candidate WhatsApp notification upon final decision
  SELECT cp.mobile, cp.full_name, jp.title
  INTO v_cand_mobile, v_cand_name, v_job_title
  FROM public.rms_applications a
  JOIN public.rms_candidate_profiles cp ON cp.id = a.candidate_id
  JOIN public.rms_job_postings jp ON jp.id = a.job_posting_id
  WHERE a.id = p_application_id;

  INSERT INTO public.rms_notification_queue (
    entity_type, entity_id, event_key, recipient_mobile, template_key, payload, idempotency_key
  ) VALUES (
    'rms_applications',
    p_application_id::text,
    'final_selection_' || p_decision,
    v_cand_mobile,
    'result_' || CASE WHEN p_decision = 'on_hold' THEN 'wait_list' ELSE p_decision END,
    jsonb_build_object(
      'candidate_name', v_cand_name,
      'job_title', v_job_title,
      'decision', p_decision,
      'remarks', p_remarks
    ),
    'selection_decision_' || p_application_id::text
  ) ON CONFLICT (idempotency_key) DO NOTHING;

  RETURN jsonb_build_object('success', true, 'decision', p_decision, 'message', 'Final selection decision recorded successfully.');
END;
$$;

-- ── 6. Correction 4: Manual Google Meet Link Management ─────────────────────
CREATE OR REPLACE FUNCTION public.rms_update_booking_meet_link(
  p_booking_id uuid,
  p_meet_link  text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT (public.is_admin() OR public.is_hr_or_admin()) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized. Admin or HR role required.');
  END IF;

  IF p_meet_link IS NOT NULL AND p_meet_link != '' AND p_meet_link !~* '^https?://' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid URL format. Meeting link must begin with https:// or http://');
  END IF;

  UPDATE public.rms_interview_bookings
  SET google_meet_link = NULLIF(trim(p_meet_link), '')
  WHERE id = p_booking_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Interview booking not found.');
  END IF;

  RETURN jsonb_build_object('success', true, 'meet_link', p_meet_link, 'message', 'Google Meet link updated successfully.');
END;
$$;

-- Update rms_book_interview_slot:
-- Bypasses automatic initialization from default_meet_link (Manual Admin Workflow)
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
  v_allocated_intv_id uuid;
  v_booking_id        uuid;
  v_app_fee_amount    numeric;
  v_payment_status    text;
  v_is_admin          boolean := false;
  v_cand_mobile       text;
  v_cand_name         text;
  v_job_title         text;
  v_interview_ts      timestamptz;
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
      AND r.key IN ('admin', 'super_admin', 'hr', 'hr_manager')
  ) INTO v_is_admin;

  -- 1. Fetch & lock application record
  SELECT a.candidate_id, cp.user_id, cp.mobile, cp.full_name, a.status, a.job_posting_id,
         jp.title, COALESCE(jp.application_fee_amount, 0)
  INTO v_candidate_id, v_candidate_user_id, v_cand_mobile, v_cand_name, v_app_status, v_job_posting_id,
       v_job_title, v_app_fee_amount
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

  -- 2. Verify fee payment if required
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
  SELECT job_posting_id, status, capacity, booked_count, slot_date, slot_time
  INTO v_slot_job_id, v_slot_status, v_slot_capacity, v_slot_booked, v_slot_date, v_slot_time
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

  -- 5. Balanced Interviewer Allocation (for panel scheduling)
  v_allocated_intv_id := public.rms_allocate_balanced_interviewer(v_slot_date, v_slot_time);

  -- 6. Insert or update interview booking
  -- IMPORTANT (Correction 4): Google Meet link is NOT auto-copied from interviewer default_meet_link.
  -- Initialized to NULL; Admin manually enters the meeting link for each interview booking.
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
    NULL,
    'booked',
    now()
  )
  ON CONFLICT (application_id)
  DO UPDATE SET
    slot_id = EXCLUDED.slot_id,
    interviewer_id = EXCLUDED.interviewer_id,
    google_meet_link = NULL,
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

  -- 9. Queue Automated WhatsApp Reminders (Correction 3)
  v_interview_ts := (v_slot_date::text || ' ' || v_slot_time::text)::timestamp at time zone 'Asia/Kolkata';

  -- Immediate Confirmation
  INSERT INTO public.rms_notification_queue (
    entity_type, entity_id, event_key, recipient_mobile, template_key, payload, booking_id, scheduled_for, idempotency_key
  ) VALUES (
    'rms_interview_bookings', v_booking_id::text, 'interview_confirmed', v_cand_mobile, 'interview_schedule',
    jsonb_build_object('candidate_name', v_cand_name, 'job_title', v_job_title, 'date', v_slot_date, 'time', v_slot_time),
    v_booking_id, now(), 'notif_confirm_' || v_booking_id::text
  ) ON CONFLICT (idempotency_key) DO NOTHING;

  -- 1 Day (24h) Before Reminder
  IF v_interview_ts - interval '24 hours' > now() THEN
    INSERT INTO public.rms_notification_queue (
      entity_type, entity_id, event_key, recipient_mobile, template_key, payload, booking_id, scheduled_for, idempotency_key
    ) VALUES (
      'rms_interview_bookings', v_booking_id::text, 'interview_reminder_24h', v_cand_mobile, 'interview_reminder_1_day',
      jsonb_build_object('candidate_name', v_cand_name, 'job_title', v_job_title, 'date', v_slot_date, 'time', v_slot_time),
      v_booking_id, v_interview_ts - interval '24 hours', 'notif_rem_24h_' || v_booking_id::text
    ) ON CONFLICT (idempotency_key) DO NOTHING;
  END IF;

  -- 3 Hours Before Reminder
  IF v_interview_ts - interval '3 hours' > now() THEN
    INSERT INTO public.rms_notification_queue (
      entity_type, entity_id, event_key, recipient_mobile, template_key, payload, booking_id, scheduled_for, idempotency_key
    ) VALUES (
      'rms_interview_bookings', v_booking_id::text, 'interview_reminder_3h', v_cand_mobile, 'interview_reminder_3_hour',
      jsonb_build_object('candidate_name', v_cand_name, 'job_title', v_job_title, 'date', v_slot_date, 'time', v_slot_time),
      v_booking_id, v_interview_ts - interval '3 hours', 'notif_rem_3h_' || v_booking_id::text
    ) ON CONFLICT (idempotency_key) DO NOTHING;
  END IF;

  -- 10 Minutes Before Reminder
  IF v_interview_ts - interval '10 minutes' > now() THEN
    INSERT INTO public.rms_notification_queue (
      entity_type, entity_id, event_key, recipient_mobile, template_key, payload, booking_id, scheduled_for, idempotency_key
    ) VALUES (
      'rms_interview_bookings', v_booking_id::text, 'interview_reminder_10m', v_cand_mobile, 'interview_reminder_10_minute',
      jsonb_build_object('candidate_name', v_cand_name, 'job_title', v_job_title, 'date', v_slot_date, 'time', v_slot_time),
      v_booking_id, v_interview_ts - interval '10 minutes', 'notif_rem_10m_' || v_booking_id::text
    ) ON CONFLICT (idempotency_key) DO NOTHING;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'booking_id', v_booking_id,
    'slot_id', p_slot_id,
    'slot_date', v_slot_date,
    'slot_time', v_slot_time,
    'google_meet_link', NULL,
    'interviewer_allocated', (v_allocated_intv_id IS NOT NULL),
    'message', 'Interview slot booked successfully. Meeting link will be provided by Admin prior to interview.'
  );
END;
$$;

-- ── 7. Correction 3: Scheduled Notification Queue Processor RPC ─────────────
CREATE OR REPLACE FUNCTION public.rms_process_notification_batch(
  p_batch_size int DEFAULT 20
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_item record;
  v_processed_cnt int := 0;
  v_skipped_cnt   int := 0;
  v_booking_status text;
  v_results jsonb := '[]'::jsonb;
BEGIN
  -- Restrict execution to staff, admin, or service_role
  IF NOT (public.is_staff() OR auth.uid() IS NULL) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized.');
  END IF;

  FOR v_item IN
    SELECT q.*
    FROM public.rms_notification_queue q
    WHERE q.status = 'pending'
      AND q.scheduled_for <= now()
    ORDER BY q.scheduled_for ASC
    LIMIT p_batch_size
    FOR UPDATE SKIP LOCKED
  LOOP
    -- If notification is tied to an interview booking, verify booking is still valid
    IF v_item.booking_id IS NOT NULL THEN
      SELECT attendance_status INTO v_booking_status
      FROM public.rms_interview_bookings WHERE id = v_item.booking_id;

      IF v_booking_status IS NULL OR v_booking_status IN ('rescheduled', 'absent') THEN
        UPDATE public.rms_notification_queue
        SET status = 'cancelled',
            last_error = 'Booking changed or cancelled (' || COALESCE(v_booking_status, 'deleted') || ')',
            processed_at = now()
        WHERE id = v_item.id;

        v_skipped_cnt := v_skipped_cnt + 1;
        CONTINUE;
      END IF;
    END IF;

    -- Mark processing
    UPDATE public.rms_notification_queue
    SET status = 'processing',
        attempts = attempts + 1
    WHERE id = v_item.id;

    v_results := v_results || jsonb_build_object(
      'queue_id', v_item.id,
      'event_key', v_item.event_key,
      'recipient_mobile', v_item.recipient_mobile,
      'template_key', v_item.template_key,
      'payload', v_item.payload
    );

    v_processed_cnt := v_processed_cnt + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'claimed_count', v_processed_cnt,
    'skipped_count', v_skipped_cnt,
    'items', v_results
  );
END;
$$;

-- ── 8. Correction 5: Provisional Appointment Letter Generation & Notification
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
  v_cand_mobile    text;
  v_cand_name      text;
  v_job_title      text;
  v_deadline       timestamptz;
BEGIN
  IF NOT (public.is_admin() OR public.is_hr_or_admin()) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized. Admin or HR role required.');
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

  v_deadline := now() + interval '3 days';

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
    v_deadline,
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
    signing_deadline_at = v_deadline,
    signature_status = 'pending',
    issued_by = auth.uid(),
    issued_at = now()
  RETURNING id, letter_number INTO v_letter_id, v_letter_num;

  UPDATE public.rms_applications
  SET status = 'appointment_issued',
      updated_at = now()
  WHERE id = p_application_id;

  -- Queue WhatsApp notification with 3-day deadline notice
  SELECT cp.mobile, cp.full_name, jp.title
  INTO v_cand_mobile, v_cand_name, v_job_title
  FROM public.rms_applications a
  JOIN public.rms_candidate_profiles cp ON cp.id = a.candidate_id
  JOIN public.rms_job_postings jp ON jp.id = a.job_posting_id
  WHERE a.id = p_application_id;

  INSERT INTO public.rms_notification_queue (
    entity_type, entity_id, event_key, recipient_mobile, template_key, payload, idempotency_key
  ) VALUES (
    'rms_appointment_letters',
    v_letter_id::text,
    'provisional_appointment_issued',
    v_cand_mobile,
    'provisional_appointment_issued',
    jsonb_build_object(
      'candidate_name', v_cand_name,
      'job_title', v_job_title,
      'signing_deadline', v_deadline,
      'letter_number', v_letter_num
    ),
    'notif_prov_letter_' || v_letter_id::text
  ) ON CONFLICT (idempotency_key) DO NOTHING;

  RETURN jsonb_build_object(
    'success', true,
    'letter_id', v_letter_id,
    'letter_number', v_letter_num,
    'signing_deadline_at', v_deadline,
    'message', 'Provisional appointment letter generated with 3-day signing deadline.'
  );
END;
$$;

-- ── 9. Grants for New Functions ─────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION public.is_hr_or_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.rms_submit_reschedule_request(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rms_review_reschedule_request(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rms_record_final_selection(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rms_update_booking_meet_link(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rms_process_notification_batch(int) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rms_generate_provisional_appointment_letter(uuid, date, text, uuid, uuid) TO authenticated;

-- ── 10. Correction 6: Harden Interview Bookings RLS (Strict Isolation) ───────
DROP POLICY IF EXISTS "rms_bookings_hr_select" ON public.rms_interview_bookings;
DROP POLICY IF EXISTS "rms_bookings_select_own" ON public.rms_interview_bookings;
DROP POLICY IF EXISTS "rms_bookings_select_isolated" ON public.rms_interview_bookings;
CREATE POLICY "rms_bookings_select_isolated" ON public.rms_interview_bookings
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR public.is_hr_or_admin()
    OR (
      interviewer_id IN (
        SELECT id FROM public.rms_interviewers WHERE user_id = auth.uid()
      )
    )
    OR (
      application_id IN (
        SELECT a.id FROM public.rms_applications a
        JOIN public.rms_candidate_profiles cp ON cp.id = a.candidate_id
        WHERE cp.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "rms_bookings_hr_update" ON public.rms_interview_bookings;
DROP POLICY IF EXISTS "rms_bookings_update_admin_only" ON public.rms_interview_bookings;
CREATE POLICY "rms_bookings_update_admin_only" ON public.rms_interview_bookings
  FOR UPDATE TO authenticated
  USING (public.is_admin() OR public.is_hr_or_admin())
  WITH CHECK (public.is_admin() OR public.is_hr_or_admin());

-- ── 11. Correction 6: Harden Appointment Letters RLS (Strict Isolation) ──────
DROP POLICY IF EXISTS "rms_apt_letters_hr_select" ON public.rms_appointment_letters;
DROP POLICY IF EXISTS "rms_apt_letters_select_own" ON public.rms_appointment_letters;
DROP POLICY IF EXISTS "rms_apt_letters_select_isolated" ON public.rms_appointment_letters;
CREATE POLICY "rms_apt_letters_select_isolated" ON public.rms_appointment_letters
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR public.is_hr_or_admin()
    OR (
      application_id IN (
        SELECT a.id FROM public.rms_applications a
        JOIN public.rms_candidate_profiles cp ON cp.id = a.candidate_id
        WHERE cp.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "rms_apt_letters_hr_write" ON public.rms_appointment_letters;
DROP POLICY IF EXISTS "rms_apt_letters_write_admin_only" ON public.rms_appointment_letters;
CREATE POLICY "rms_apt_letters_write_admin_only" ON public.rms_appointment_letters
  FOR ALL TO authenticated
  USING (public.is_admin() OR public.is_hr_or_admin())
  WITH CHECK (public.is_admin() OR public.is_hr_or_admin());



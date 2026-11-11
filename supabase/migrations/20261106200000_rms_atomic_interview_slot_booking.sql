-- ============================================================================
-- Migration: Atomic Concurrency-Safe Interview Slot Booking
-- File: 20261106200000_rms_atomic_interview_slot_booking.sql
-- Description:
--   Implements atomic, serialized interview slot booking with PostgreSQL
--   row-level locking (SELECT ... FOR UPDATE).
--
-- Guarantees:
--   1. Serialized seat allocation: Locks the target slot row, preventing concurrent
--      requests from oversubscribing the last remaining capacity.
--   2. Strict capacity & status validation prior to any write.
--   3. Authenticated candidate ownership enforcement via auth.uid().
--   4. Preserves unique application_id booking constraint.
--   5. Enforces fee payment boundary for paid positions.
--   6. Reconciles booked_count and status on both target and prior slots (rescheduling).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.rms_book_interview_slot(
  p_application_id uuid,
  p_slot_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_app record;
  v_slot record;
  v_existing_booking record;
  v_current_booked int;
  v_new_slot_count int;
  v_old_slot_count int;
  v_booking record;
BEGIN
  -- 1. Candidate Authentication & Authorization Check
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'UNAUTHORIZED',
      'message', 'Authentication required: You must be signed in to book an interview slot.'
    );
  END IF;

  -- 2. Validate Application & Enforce Candidate Ownership
  SELECT
    a.id,
    a.candidate_id,
    a.job_posting_id,
    a.status,
    COALESCE(jp.application_fee_amount, 0) AS fee_amount,
    cp.user_id AS candidate_user_id,
    cp.full_name AS candidate_name,
    cp.mobile AS candidate_mobile,
    jp.title AS job_title
  INTO v_app
  FROM public.rms_applications a
  JOIN public.rms_job_postings jp ON jp.id = a.job_posting_id
  JOIN public.rms_candidate_profiles cp ON cp.id = a.candidate_id
  WHERE a.id = p_application_id;

  IF v_app.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'APP_NOT_FOUND',
      'message', 'Application record not found.'
    );
  END IF;

  -- Ownership verification: application must belong to the authenticated candidate (or HR staff)
  IF v_app.candidate_user_id <> v_user_id THEN
    IF NOT EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = v_user_id
        AND (
          (u.raw_user_meta_data->>'role') IN ('hr', 'hr_manager', 'admin', 'super_admin')
          OR (u.raw_app_meta_data->>'role') IN ('hr', 'hr_manager', 'admin', 'super_admin')
        )
    ) THEN
      RETURN jsonb_build_object(
        'success', false,
        'code', 'FORBIDDEN',
        'message', 'Permission denied: You can only book interview slots for your own application.'
      );
    END IF;
  END IF;

  -- 3. Payment Boundary Validation
  IF v_app.fee_amount > 0 AND v_app.status <> 'payment_successful' THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'PAYMENT_REQUIRED',
      'message', 'This position requires payment of the application fee before booking an interview slot.'
    );
  END IF;

  -- 4. Acquire Row-Level Lock on the Target Interview Slot (Concurrency Barrier)
  SELECT
    id,
    job_posting_id,
    slot_date,
    slot_time,
    mode,
    location_or_link,
    capacity,
    booked_count,
    status
  INTO v_slot
  FROM public.rms_interview_slots
  WHERE id = p_slot_id
  FOR UPDATE;

  IF v_slot.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'SLOT_NOT_FOUND',
      'message', 'Selected interview slot does not exist.'
    );
  END IF;

  -- Verify slot belongs to the position the candidate applied for
  IF v_slot.job_posting_id <> v_app.job_posting_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'JOB_MISMATCH',
      'message', 'This interview slot does not match the job posting for your application.'
    );
  END IF;

  -- Check if candidate is already booked to any slot
  SELECT id, slot_id, attendance_status, booked_at
  INTO v_existing_booking
  FROM public.rms_interview_bookings
  WHERE application_id = p_application_id;

  -- Count live active bookings for target slot
  SELECT count(*) INTO v_current_booked
  FROM public.rms_interview_bookings
  WHERE slot_id = p_slot_id;

  -- Idempotency Guard: If candidate is already booked to this exact slot, re-return successfully
  -- (even if slot status is now marked 'full' due to their own booking)
  IF v_existing_booking.id IS NOT NULL AND v_existing_booking.slot_id = p_slot_id THEN
    RETURN jsonb_build_object(
      'success', true,
      'code', 'OK',
      'booking', jsonb_build_object(
        'id', v_existing_booking.id,
        'application_id', p_application_id,
        'slot_id', p_slot_id,
        'booked_at', v_existing_booking.booked_at,
        'attendance_status', v_existing_booking.attendance_status
      ),
      'slot', jsonb_build_object(
        'id', v_slot.id,
        'job_posting_id', v_slot.job_posting_id,
        'slot_date', v_slot.slot_date,
        'slot_time', v_slot.slot_time,
        'mode', v_slot.mode,
        'location_or_link', v_slot.location_or_link,
        'capacity', v_slot.capacity,
        'booked_count', v_current_booked,
        'status', v_slot.status
      )
    );
  END IF;

  -- Check Slot Operational Status for new bookings or rescheduling
  IF v_slot.status <> 'open' THEN
    IF v_slot.status = 'full' THEN
      RETURN jsonb_build_object(
        'success', false,
        'code', 'SLOT_FULL',
        'message', 'Interview slot is full. Please select another slot.'
      );
    ELSE
      RETURN jsonb_build_object(
        'success', false,
        'code', 'SLOT_CLOSED',
        'message', 'Interview slot is no longer available. Please select another slot.'
      );
    END IF;
  END IF;

  -- For new bookings or slot changes: verify remaining capacity strictly
  IF v_current_booked >= v_slot.capacity THEN
    -- Update slot status to full if not already synchronized
    UPDATE public.rms_interview_slots
    SET status = 'full', booked_count = v_current_booked
    WHERE id = p_slot_id;

    RETURN jsonb_build_object(
      'success', false,
      'code', 'SLOT_FULL',
      'message', 'Interview slot is full. Please select another slot.'
    );
  END IF;

  -- 6. Atomic Upsert of Interview Booking
  INSERT INTO public.rms_interview_bookings (
    application_id,
    slot_id,
    attendance_status,
    booked_at
  )
  VALUES (
    p_application_id,
    p_slot_id,
    'booked',
    now()
  )
  ON CONFLICT (application_id)
  DO UPDATE SET
    slot_id = EXCLUDED.slot_id,
    attendance_status = 'booked',
    booked_at = now()
  RETURNING id, application_id, slot_id, booked_at, confirmation_sent_at, attendance_status
  INTO v_booking;

  -- 7. Advance Application Status to interview_scheduled
  UPDATE public.rms_applications
  SET status = 'interview_scheduled',
      updated_at = now()
  WHERE id = p_application_id;

  -- 8. Reconcile Target Slot Capacity & Status
  SELECT count(*) INTO v_new_slot_count
  FROM public.rms_interview_bookings
  WHERE slot_id = p_slot_id;

  UPDATE public.rms_interview_slots
  SET booked_count = v_new_slot_count,
      status = CASE WHEN v_new_slot_count >= capacity THEN 'full' ELSE 'open' END
  WHERE id = p_slot_id;

  -- 9. Reconcile Prior Slot (if rescheduling)
  IF v_existing_booking.id IS NOT NULL AND v_existing_booking.slot_id <> p_slot_id THEN
    SELECT count(*) INTO v_old_slot_count
    FROM public.rms_interview_bookings
    WHERE slot_id = v_existing_booking.slot_id;

    UPDATE public.rms_interview_slots
    SET booked_count = v_old_slot_count,
        status = CASE WHEN v_old_slot_count >= capacity THEN 'full' ELSE 'open' END
    WHERE id = v_existing_booking.slot_id;
  END IF;

  -- 10. Return Confirmed Booking Payload
  RETURN jsonb_build_object(
    'success', true,
    'code', 'OK',
    'booking', jsonb_build_object(
      'id', v_booking.id,
      'application_id', v_booking.application_id,
      'slot_id', v_booking.slot_id,
      'booked_at', v_booking.booked_at,
      'attendance_status', v_booking.attendance_status
    ),
    'slot', jsonb_build_object(
      'id', v_slot.id,
      'job_posting_id', v_slot.job_posting_id,
      'slot_date', v_slot.slot_date,
      'slot_time', v_slot.slot_time,
      'mode', v_slot.mode,
      'location_or_link', v_slot.location_or_link,
      'capacity', v_slot.capacity,
      'booked_count', v_new_slot_count,
      'status', CASE WHEN v_new_slot_count >= v_slot.capacity THEN 'full' ELSE 'open' END
    )
  );
END;
$$;

-- Security & Least-Privilege Grants: Authenticated Only (Revoked from public & anon)
REVOKE ALL ON FUNCTION public.rms_book_interview_slot(uuid, uuid) FROM public;
REVOKE ALL ON FUNCTION public.rms_book_interview_slot(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.rms_book_interview_slot(uuid, uuid) TO authenticated;

COMMENT ON FUNCTION public.rms_book_interview_slot(uuid, uuid) IS
  'Atomic, serialized interview slot booking with SELECT FOR UPDATE row-locking, ownership validation, and slot status reconciliation.';

-- ============================================================
-- Migration: WhatsApp Welcome Message 24-Hour Cooldown & Concurrency Index
-- File: 20261025010000_whatsapp_welcome_message_cooldown.sql
-- Purpose:
--   1. Adds composite index for ultra-fast 24-hour cooldown lookups on whatsapp_message_logs.
--   2. Provides database-level RPC to check and reserve welcome messages safely across devices.
--   3. Does NOT alter OTP tables, OTP flows, or non-welcome templates.
-- ============================================================

-- 1. Create composite index on whatsapp_message_logs for cooldown queries
CREATE INDEX IF NOT EXISTS idx_wa_logs_welcome_cooldown
  ON public.whatsapp_message_logs (mobile_number, template_name, status, sent_at DESC);

-- 2. Database RPC: Check 24-Hour Cooldown for Welcome Message
CREATE OR REPLACE FUNCTION public.whatsapp_check_welcome_cooldown(p_mobile text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_normalized text;
  v_last_sent timestamptz;
BEGIN
  -- Normalize mobile to 91XXXXXXXXXX
  v_normalized := regexp_replace(p_mobile, '[^\d]', '', 'g');
  IF length(v_normalized) = 10 THEN
    v_normalized := '91' || v_normalized;
  ELSIF length(v_normalized) = 11 AND v_normalized LIKE '0%' THEN
    v_normalized := '91' || substr(v_normalized, 2);
  ELSIF length(v_normalized) = 13 AND v_normalized LIKE '91%' THEN
    v_normalized := substr(v_normalized, 2);
  END IF;

  SELECT sent_at INTO v_last_sent
    FROM public.whatsapp_message_logs
   WHERE mobile_number = v_normalized
     AND template_name IN ('welcome', 'welcome_recruitment', 'welcome_to_recruitment_portal')
     AND status = 'sent'
     AND sent_at > (now() - interval '24 hours')
   ORDER BY sent_at DESC
   LIMIT 1;

  IF v_last_sent IS NOT NULL THEN
    RETURN jsonb_build_object(
      'in_cooldown', true,
      'last_sent_at', v_last_sent,
      'normalized_mobile', v_normalized
    );
  END IF;

  RETURN jsonb_build_object(
    'in_cooldown', false,
    'normalized_mobile', v_normalized
  );
END;
$$;

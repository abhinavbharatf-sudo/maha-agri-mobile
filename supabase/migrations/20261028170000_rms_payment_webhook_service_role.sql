-- ============================================================================
-- MAHA-AGRI Government Digital Operations Platform
-- Migration: RMS Careers Razorpay Webhook & Payment Reconciliation Indexes
-- Status: UNAPPLIED (Preserved for Staging/Production release cycle)
-- ============================================================================

-- 1. Unique indexes on gateway_order_id and gateway_payment_id for multi-instance DB-level replay protection
CREATE UNIQUE INDEX IF NOT EXISTS uq_rms_payments_gateway_payment ON public.rms_payments(gateway_payment_id) WHERE gateway_payment_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_rms_payments_gateway_order ON public.rms_payments(gateway_order_id) WHERE gateway_order_id IS NOT NULL;

-- 2. Ensure service_role has explicit write access to rms_payments and rms_applications
-- Note: In Supabase, the service_role key automatically bypasses RLS, but explicit grants ensure resilience
GRANT ALL ON TABLE public.rms_payments TO service_role;
GRANT ALL ON TABLE public.rms_payment_receipts TO service_role;
GRANT ALL ON TABLE public.rms_applications TO service_role;
GRANT ALL ON TABLE public.rms_application_status_log TO service_role;

-- 3. Idempotent trigger function for payment receipt generation on status = 'success'
CREATE OR REPLACE FUNCTION public.rms_on_payment_success_generate_receipt()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status = 'success' AND (OLD.status IS NULL OR OLD.status != 'success') THEN
    INSERT INTO public.rms_payment_receipts (payment_id, receipt_number, generated_at)
    VALUES (NEW.id, 'ABF-RCPT-' || LPAD(nextval('rms_receipt_number_seq')::text, 6, '0'), now())
    ON CONFLICT (payment_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_rms_payment_success_receipt ON public.rms_payments;
CREATE TRIGGER trg_rms_payment_success_receipt
  AFTER UPDATE OF status ON public.rms_payments
  FOR EACH ROW
  WHEN (NEW.status = 'success')
  EXECUTE FUNCTION public.rms_on_payment_success_generate_receipt();

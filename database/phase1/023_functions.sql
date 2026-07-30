-- ============================================================================
-- MAHA-AGRI Government Digital Operations Platform
-- Phase 1 Database Script: 023_functions.sql
-- 
-- Purpose: Stored Functions for Audit Envelope, Soil Health Index Calculation, and Wallet Balances.
-- Execution Order: 023 / 030
-- Dependencies: 001_extensions.sql to 021_scheduler_tables.sql
-- Rollback Notes: DROP FUNCTION IF EXISTS <function_name>;
-- ============================================================================

-- 1. Reusable Audit Trigger Function for Automatic record_version & updated_at Update
CREATE OR REPLACE FUNCTION tf_update_audit_columns()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  NEW.record_version = OLD.record_version + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Soil Health Index Score Calculator Function (0 to 100)
CREATE OR REPLACE FUNCTION fn_generate_soil_health_score(
  p_ph NUMERIC,
  p_ec NUMERIC,
  p_oc NUMERIC,
  p_n NUMERIC,
  p_p NUMERIC,
  p_k NUMERIC
) RETURNS NUMERIC AS $$
DECLARE
  v_score NUMERIC := 0.0;
BEGIN
  -- pH Evaluation (Ideal 6.5 - 7.5)
  IF p_ph BETWEEN 6.5 AND 7.5 THEN
    v_score := v_score + 20.0;
  ELSIF p_ph BETWEEN 6.0 AND 8.0 THEN
    v_score := v_score + 15.0;
  ELSE
    v_score := v_score + 5.0;
  END IF;

  -- Organic Carbon Evaluation (Ideal > 0.75%)
  IF p_oc >= 0.75 THEN
    v_score := v_score + 20.0;
  ELSIF p_oc >= 0.50 THEN
    v_score := v_score + 15.0;
  ELSE
    v_score := v_score + 5.0;
  END IF;

  -- NPK Balanced Assessment
  IF p_n > 280 THEN v_score := v_score + 20.0; ELSE v_score := v_score + 10.0; END IF;
  IF p_p > 14 THEN v_score := v_score + 20.0; ELSE v_score := v_score + 10.0; END IF;
  IF p_k > 150 THEN v_score := v_score + 20.0; ELSE v_score := v_score + 10.0; END IF;

  RETURN v_score;
END;
$$ LANGUAGE plpgsql;

-- 3. Calculate Double-Entry Wallet Balance Verification Function
CREATE OR REPLACE FUNCTION fn_get_wallet_balance(p_user_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_balance NUMERIC := 0.00;
BEGIN
  SELECT balance INTO v_balance
  FROM finance.wallet_accounts
  WHERE user_id = p_user_id AND is_deleted = FALSE;
  
  RETURN COALESCE(v_balance, 0.00);
END;
$$ LANGUAGE plpgsql;

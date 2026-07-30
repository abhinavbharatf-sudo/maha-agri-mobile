-- =============================================================================
-- MODULE 08: FINANCIAL LEDGER & BENEFIT DISBURSEMENT ENGINE DDL SCHEMA
-- Layer 1: Immutable Double-Entry Ledger + Layer 2: DBT Subsidy Disbursement
-- =============================================================================

-- 1. Ledger Accounts Table
CREATE TABLE IF NOT EXISTS fin_ledger_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_code VARCHAR(30) UNIQUE NOT NULL, -- ACC-STATE-SUBSIDY, ACC-FARMER-DBT
  account_name VARCHAR(150) NOT NULL,
  account_type VARCHAR(30) NOT NULL, -- ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE
  current_balance NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Immutable Journal Entries Table (Strict Reversal Entries ONLY)
CREATE TABLE IF NOT EXISTS fin_journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_code VARCHAR(50) UNIQUE NOT NULL, -- JRN-2026-00912
  entry_type VARCHAR(30) NOT NULL DEFAULT 'STANDARD', -- STANDARD, REVERSAL_ENTRY, ADJUSTMENT, REFUND
  reversal_of_entry_code VARCHAR(50), -- Link if this is a reversal entry
  
  debit_account_code VARCHAR(30) NOT NULL REFERENCES fin_ledger_accounts(account_code),
  credit_account_code VARCHAR(30) NOT NULL REFERENCES fin_ledger_accounts(account_code),
  amount NUMERIC(14, 2) NOT NULL,
  
  narration TEXT NOT NULL,
  posted_by_name VARCHAR(150) NOT NULL,
  is_posted BOOLEAN NOT NULL DEFAULT TRUE, -- Immutable once posted
  posted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. DBT Disbursement Batches Table
CREATE TABLE IF NOT EXISTS dbt_disbursement_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_code VARCHAR(50) UNIQUE NOT NULL, -- BATCH-2026-00048
  scheme_code VARCHAR(30) NOT NULL, -- MAHA-AGRI, PMEGP, DRONE_SUBSIDY
  bank_adapter VARCHAR(30) NOT NULL DEFAULT 'PFMS', -- PFMS, NPCI_APB, DIRECT_BANK_API, MANUAL
  
  total_beneficiaries INTEGER NOT NULL DEFAULT 0,
  total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  
  -- Batch State Lifecycle
  status VARCHAR(40) NOT NULL DEFAULT 'REQUESTED', -- REQUESTED, VERIFIED, BATCH_CREATED, APPROVED, SENT_TO_BANK, SUCCESS, PARTIAL_FAILED, CLOSED
  
  approved_by_name VARCHAR(150),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. DBT Disbursement Items Table
CREATE TABLE IF NOT EXISTS dbt_disbursement_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_code VARCHAR(50) UNIQUE NOT NULL, -- DBT-2026-09012
  batch_id UUID NOT NULL REFERENCES dbt_disbursement_batches(id) ON DELETE CASCADE,
  
  beneficiary_upp_id VARCHAR(32) NOT NULL,
  beneficiary_name VARCHAR(150) NOT NULL,
  ifsc_code VARCHAR(20) NOT NULL,
  bank_account_no VARCHAR(50) NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING', -- PENDING, VALIDATED, SENT_TO_BANK, SUCCESS, FAILED, REFUNDED
  bank_reference_no VARCHAR(100),
  failure_reason TEXT,
  
  disbursed_at TIMESTAMPTZ
);

-- 5. Daily Reconciliation Logs Table
CREATE TABLE IF NOT EXISTS fin_reconciliation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reconciliation_date DATE UNIQUE NOT NULL,
  total_sent_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  total_success_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  total_failed_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  discrepancy_count INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(30) NOT NULL DEFAULT 'RECONCILED',
  reconciled_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed Initial Accounts
INSERT INTO fin_ledger_accounts (account_code, account_name, account_type, current_balance)
VALUES
  ('ACC-STATE-POOL', 'Maharashtra State Treasury Pool Account', 'ASSET', 50000000.00),
  ('ACC-SUBSIDY-DISBURSED', 'DBT Subsidy Disbursal Account', 'EXPENSE', 12450000.00),
  ('ACC-REFUND-RECOVERY', 'Subsidy Refund & Recovery Account', 'LIABILITY', 45000.00)
ON CONFLICT (account_code) DO NOTHING;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_jrn_code ON fin_journal_entries(entry_code);
CREATE INDEX IF NOT EXISTS idx_dbt_batch ON dbt_disbursement_batches(batch_code);
CREATE INDEX IF NOT EXISTS idx_dbt_status ON dbt_disbursement_items(status);

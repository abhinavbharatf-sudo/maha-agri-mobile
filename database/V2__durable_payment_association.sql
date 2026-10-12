-- ============================================================================
-- MAHA-AGRI Government Digital Operations Platform
-- Migration: V2__durable_payment_association.sql
-- Target Database: PostgreSQL 16 (maha_agri_db)
-- Schemas: integration, edp
-- Description: Persists Cashfree orders & payment transactions with strict
--              candidate bindings and atomic portal single-redemption partial index.
-- ============================================================================

BEGIN;

-- 1. Create table integration.integ_payment_orders
CREATE TABLE IF NOT EXISTS "integration"."integ_payment_orders" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "orderCode" VARCHAR(50) NOT NULL UNIQUE,
    "candidateId" UUID NULL,
    "candidateCode" VARCHAR(50) NOT NULL,
    "gatewayName" VARCHAR(50) NOT NULL DEFAULT 'CASHFREE',
    "amount" DECIMAL(12, 2) NOT NULL,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'INR',
    "status" VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    "paymentSessionId" TEXT NULL,
    "paymentLink" TEXT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "integ_payment_orders_candidateId_idx" ON "integration"."integ_payment_orders"("candidateId");
CREATE INDEX IF NOT EXISTS "integ_payment_orders_candidateCode_idx" ON "integration"."integ_payment_orders"("candidateCode");

-- 2. Alter table integration.integ_payment_txns
ALTER TABLE "integration"."integ_payment_txns"
    ADD COLUMN IF NOT EXISTS "orderId" UUID NULL,
    ADD COLUMN IF NOT EXISTS "orderCode" VARCHAR(50) NULL,
    ADD COLUMN IF NOT EXISTS "candidateId" UUID NULL,
    ADD COLUMN IF NOT EXISTS "candidateCode" VARCHAR(50) NULL,
    ADD COLUMN IF NOT EXISTS "currency" VARCHAR(10) NOT NULL DEFAULT 'INR',
    ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Drop existing 'SUCCESS' default from status so non-success attempts are never defaulted to SUCCESS
ALTER TABLE "integration"."integ_payment_txns"
    ALTER COLUMN "status" DROP DEFAULT;

-- Foreign key from integ_payment_txns.orderId to integ_payment_orders.id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'integ_payment_txns_orderId_fkey'
    ) THEN
        ALTER TABLE "integration"."integ_payment_txns"
            ADD CONSTRAINT "integ_payment_txns_orderId_fkey"
            FOREIGN KEY ("orderId") REFERENCES "integration"."integ_payment_orders"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "integ_payment_txns_orderCode_idx" ON "integration"."integ_payment_txns"("orderCode");
CREATE INDEX IF NOT EXISTS "integ_payment_txns_candidateId_idx" ON "integration"."integ_payment_txns"("candidateId");
CREATE INDEX IF NOT EXISTS "integ_payment_txns_candidateCode_idx" ON "integration"."integ_payment_txns"("candidateCode");

-- 3. Alter table edp.edp_candidates
ALTER TABLE "edp"."edp_candidates"
    ADD COLUMN IF NOT EXISTS "paymentTxnCode" VARCHAR(50) NULL,
    ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMPTZ NULL;

-- 4. Partial Unique Index on edp.edp_candidates("paymentTxnCode") WHERE "paymentTxnCode" IS NOT NULL
CREATE UNIQUE INDEX IF NOT EXISTS "uq_edp_candidates_paymentTxnCode"
    ON "edp"."edp_candidates"("paymentTxnCode")
    WHERE "paymentTxnCode" IS NOT NULL;

COMMIT;

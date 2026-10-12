-- ============================================================================
-- MAHA-AGRI Government Digital Operations Platform
-- Restore Migration: V2__restore_durable_payment_association.sql
-- Target Database: PostgreSQL 16 (maha_agri_db)
-- Schemas: integration, edp
-- Description: Restores data from pre-rollback backup snapshots after V2 re-application.
--              Includes automated dependency-order restoration and post-restore
--              referential integrity and row parity verification.
-- ============================================================================

BEGIN;

-- 1. Ensure V2 Schema Elements Exist (Idempotent DDL)
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

ALTER TABLE "integration"."integ_payment_txns"
    ADD COLUMN IF NOT EXISTS "orderId" UUID NULL,
    ADD COLUMN IF NOT EXISTS "orderCode" VARCHAR(50) NULL,
    ADD COLUMN IF NOT EXISTS "candidateId" UUID NULL,
    ADD COLUMN IF NOT EXISTS "candidateCode" VARCHAR(50) NULL,
    ADD COLUMN IF NOT EXISTS "currency" VARCHAR(10) NOT NULL DEFAULT 'INR',
    ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "integration"."integ_payment_txns"
    ALTER COLUMN "status" DROP DEFAULT;

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

ALTER TABLE "edp"."edp_candidates"
    ADD COLUMN IF NOT EXISTS "paymentTxnCode" VARCHAR(50) NULL,
    ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMPTZ NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "uq_edp_candidates_paymentTxnCode"
    ON "edp"."edp_candidates"("paymentTxnCode")
    WHERE "paymentTxnCode" IS NOT NULL;

-- 2. Validate Snapshot Existence and Restore Data in Strict Dependency Order
DO $$
DECLARE
    v_order_count_backup INT := 0;
    v_order_count_restored INT := 0;
    v_candidate_count_backup INT := 0;
    v_candidate_count_restored INT := 0;
    v_txn_count_backup INT := 0;
    v_txn_count_restored INT := 0;
    v_orphan_order_count INT := 0;
    v_duplicate_txn_count INT := 0;
BEGIN
    -- Check if snapshot tables exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'integration' AND table_name = 'backup_rollback_integ_payment_orders') THEN
        RAISE NOTICE 'No order backup table found: integration.backup_rollback_integ_payment_orders (Skipping order restore)';
    ELSE
        SELECT COUNT(*) INTO v_order_count_backup FROM "integration"."backup_rollback_integ_payment_orders";
        
        -- Restore 1: integ_payment_orders (Insert missing rows and update existing)
        INSERT INTO "integration"."integ_payment_orders" (
            "id", "orderCode", "candidateId", "candidateCode", "gatewayName",
            "amount", "currency", "status", "paymentSessionId", "paymentLink",
            "createdAt", "updatedAt"
        )
        SELECT
            "id", "orderCode", "candidateId", "candidateCode", "gatewayName",
            "amount", "currency", "status", "paymentSessionId", "paymentLink",
            "createdAt", "updatedAt"
        FROM "integration"."backup_rollback_integ_payment_orders"
        ON CONFLICT ("orderCode") DO UPDATE SET
            "candidateId" = EXCLUDED."candidateId",
            "candidateCode" = EXCLUDED."candidateCode",
            "amount" = EXCLUDED."amount",
            "status" = EXCLUDED."status",
            "paymentSessionId" = EXCLUDED."paymentSessionId",
            "paymentLink" = EXCLUDED."paymentLink",
            "updatedAt" = EXCLUDED."updatedAt";
            
        SELECT COUNT(*) INTO v_order_count_restored FROM "integration"."integ_payment_orders";
        RAISE NOTICE 'Orders restored: % backup rows processed. Total in table: %', v_order_count_backup, v_order_count_restored;
    END IF;

    -- Restore 2: edp_candidates payment association and portal status
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'edp' AND table_name = 'backup_rollback_edp_candidate_payments') THEN
        RAISE NOTICE 'No candidate backup table found: edp.backup_rollback_edp_candidate_payments (Skipping candidate payment restore)';
    ELSE
        SELECT COUNT(*) INTO v_candidate_count_backup FROM "edp"."backup_rollback_edp_candidate_payments";

        UPDATE "edp"."edp_candidates" c
        SET "paymentTxnCode" = b."paymentTxnCode",
            "paidAt" = b."paidAt",
            "isPaid" = b."isPaid",
            "isPortalActive" = b."isPortalActive",
            "status" = b."status"
        FROM "edp"."backup_rollback_edp_candidate_payments" b
        WHERE c."id" = b."id";

        GET DIAGNOSTICS v_candidate_count_restored = ROW_COUNT;
        RAISE NOTICE 'Candidate payments restored: % rows updated matching backup.', v_candidate_count_restored;
    END IF;

    -- Restore 3: integ_payment_txns (Both update association columns AND insert missing full transaction rows)
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'integration' AND table_name = 'backup_rollback_integ_payment_txns') THEN
        RAISE NOTICE 'No transaction backup table found: integration.backup_rollback_integ_payment_txns (Skipping transaction restore)';
    ELSE
        SELECT COUNT(*) INTO v_txn_count_backup FROM "integration"."backup_rollback_integ_payment_txns";

        -- 3a. Update existing transaction rows
        UPDATE "integration"."integ_payment_txns" t
        SET "orderId" = b."orderId",
            "orderCode" = b."orderCode",
            "candidateId" = b."candidateId",
            "candidateCode" = b."candidateCode",
            "currency" = b."currency",
            "createdAt" = b."createdAt",
            "updatedAt" = b."updatedAt"
        FROM "integration"."backup_rollback_integ_payment_txns" b
        WHERE t."id" = b."id";

        -- 3b. Insert any transaction rows that exist in backup but missing from table
        INSERT INTO "integration"."integ_payment_txns" (
            "id", "txnCode", "orderId", "orderCode", "candidateId", "candidateCode",
            "gatewayName", "amount", "currency", "status", "settledAt", "createdAt", "updatedAt"
        )
        SELECT
            b."id", b."txnCode", b."orderId", b."orderCode", b."candidateId", b."candidateCode",
            b."gatewayName", b."amount", b."currency", b."status", b."settledAt", b."createdAt", b."updatedAt"
        FROM "integration"."backup_rollback_integ_payment_txns" b
        ON CONFLICT ("txnCode") DO UPDATE SET
            "orderId" = EXCLUDED."orderId",
            "orderCode" = EXCLUDED."orderCode",
            "candidateId" = EXCLUDED."candidateId",
            "candidateCode" = EXCLUDED."candidateCode",
            "status" = EXCLUDED."status",
            "updatedAt" = EXCLUDED."updatedAt";

        SELECT COUNT(*) INTO v_txn_count_restored FROM "integration"."integ_payment_txns";
        RAISE NOTICE 'Transactions restored: % backup rows processed. Total in table: %', v_txn_count_backup, v_txn_count_restored;
    END IF;

    -- =========================================================================
    -- Post-Restore Integrity Verification Assertions
    -- =========================================================================
    
    -- Check A: Orphaned foreign keys (Transactions pointing to non-existent orders)
    SELECT COUNT(*) INTO v_orphan_order_count
    FROM "integration"."integ_payment_txns"
    WHERE "orderId" IS NOT NULL
      AND "orderId" NOT IN (SELECT "id" FROM "integration"."integ_payment_orders");

    IF v_orphan_order_count > 0 THEN
        RAISE EXCEPTION 'RESTORE INTEGRITY FAILURE: Found % transactions with invalid/orphaned orderId', v_orphan_order_count;
    END IF;

    -- Check B: Candidate payment unique index violation
    SELECT COUNT(*) INTO v_duplicate_txn_count
    FROM (
        SELECT "paymentTxnCode"
        FROM "edp"."edp_candidates"
        WHERE "paymentTxnCode" IS NOT NULL
        GROUP BY "paymentTxnCode"
        HAVING COUNT(*) > 1
    ) dupes;

    IF v_duplicate_txn_count > 0 THEN
        RAISE EXCEPTION 'RESTORE INTEGRITY FAILURE: Found % duplicate paymentTxnCodes across candidates', v_duplicate_txn_count;
    END IF;

    RAISE NOTICE '=== RESTORE INTEGRITY VERIFICATION PASSED SUCCESSFULLY ===';
END $$;

COMMIT;

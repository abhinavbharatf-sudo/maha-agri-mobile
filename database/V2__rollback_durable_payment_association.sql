-- ============================================================================
-- MAHA-AGRI Government Digital Operations Platform
-- Rollback Migration: V2__rollback_durable_payment_association.sql
-- Target Database: PostgreSQL 16 (maha_agri_db)
-- Schemas: integration, edp
-- Description: Reverts V2 durable payment association safely.
--              Automatically creates pre-rollback archival tables before dropping
--              columns or tables, preventing accidental financial/audit data loss.
-- ============================================================================

-- 0. Pre-Rollback Automated Safety Snapshot Archival
DO $$
DECLARE
    v_ts text := to_char(CURRENT_TIMESTAMP, 'YYYYMMDD_HH24MISS');
BEGIN
    -- 0.1 Archive payment orders
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'integration' AND table_name = 'integ_payment_orders') THEN
        -- Dynamic timestamped immutable archival snapshot (guaranteed unique per rollback execution)
        EXECUTE format('CREATE TABLE "integration"."backup_integ_payment_orders_%s" AS SELECT *, CURRENT_TIMESTAMP AS "backedUpAt" FROM "integration"."integ_payment_orders"', v_ts);
        
        -- Deterministic latest snapshot table (recreated freshly on each run to prevent stale data)
        DROP TABLE IF EXISTS "integration"."backup_rollback_integ_payment_orders";
        CREATE TABLE "integration"."backup_rollback_integ_payment_orders" AS
            SELECT *, CURRENT_TIMESTAMP AS "backedUpAt" FROM "integration"."integ_payment_orders";
            
        RAISE NOTICE 'Archived integ_payment_orders -> integration.backup_integ_payment_orders_% and integration.backup_rollback_integ_payment_orders', v_ts;
    END IF;

    -- 0.2 Archive candidate payment and activation state
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'edp' AND table_name = 'edp_candidates' AND column_name = 'paymentTxnCode') THEN
        -- Dynamic timestamped immutable archival snapshot
        EXECUTE format('CREATE TABLE "edp"."backup_edp_candidate_payments_%s" AS SELECT "id", "candidateCode", "status", "isPaid", "isPortalActive", "paymentTxnCode", "paidAt", CURRENT_TIMESTAMP AS "backedUpAt" FROM "edp"."edp_candidates" WHERE "paymentTxnCode" IS NOT NULL OR "isPaid" = TRUE OR "paidAt" IS NOT NULL', v_ts);
        
        -- Deterministic latest snapshot table (recreated freshly on each run to prevent stale data)
        DROP TABLE IF EXISTS "edp"."backup_rollback_edp_candidate_payments";
        CREATE TABLE "edp"."backup_rollback_edp_candidate_payments" AS
            SELECT "id", "candidateCode", "status", "isPaid", "isPortalActive", "paymentTxnCode", "paidAt", CURRENT_TIMESTAMP AS "backedUpAt"
            FROM "edp"."edp_candidates"
            WHERE "paymentTxnCode" IS NOT NULL OR "isPaid" = TRUE OR "paidAt" IS NOT NULL;
            
        RAISE NOTICE 'Archived candidate payments -> edp.backup_edp_candidate_payments_% and edp.backup_rollback_edp_candidate_payments', v_ts;
    END IF;

    -- 0.3 Archive payment transactions with order bindings
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'integration' AND table_name = 'integ_payment_txns' AND column_name = 'orderCode') THEN
        -- Dynamic timestamped immutable archival snapshot
        EXECUTE format('CREATE TABLE "integration"."backup_integ_payment_txns_%s" AS SELECT *, CURRENT_TIMESTAMP AS "backedUpAt" FROM "integration"."integ_payment_txns"', v_ts);
        
        -- Deterministic latest snapshot table (recreated freshly on each run to prevent stale data)
        DROP TABLE IF EXISTS "integration"."backup_rollback_integ_payment_txns";
        CREATE TABLE "integration"."backup_rollback_integ_payment_txns" AS
            SELECT *, CURRENT_TIMESTAMP AS "backedUpAt" FROM "integration"."integ_payment_txns";
            
        RAISE NOTICE 'Archived integ_payment_txns -> integration.backup_integ_payment_txns_% and integration.backup_rollback_integ_payment_txns', v_ts;
    END IF;
END $$;


-- 1. Drop partial unique index on edp.edp_candidates
DROP INDEX IF EXISTS "edp"."uq_edp_candidates_paymentTxnCode";

-- 2. Drop columns from edp.edp_candidates
ALTER TABLE "edp"."edp_candidates"
    DROP COLUMN IF EXISTS "paymentTxnCode",
    DROP COLUMN IF EXISTS "paidAt";

-- 3. Drop foreign key constraint from integration.integ_payment_txns
ALTER TABLE "integration"."integ_payment_txns"
    DROP CONSTRAINT IF EXISTS "integ_payment_txns_orderId_fkey";

-- 4. Drop indexes from integration.integ_payment_txns
DROP INDEX IF EXISTS "integration"."integ_payment_txns_orderCode_idx";
DROP INDEX IF EXISTS "integration"."integ_payment_txns_candidateId_idx";
DROP INDEX IF EXISTS "integration"."integ_payment_txns_candidateCode_idx";

-- 5. Drop columns from integration.integ_payment_txns
ALTER TABLE "integration"."integ_payment_txns"
    DROP COLUMN IF EXISTS "orderId",
    DROP COLUMN IF EXISTS "orderCode",
    DROP COLUMN IF EXISTS "candidateId",
    DROP COLUMN IF EXISTS "candidateCode",
    DROP COLUMN IF EXISTS "currency",
    DROP COLUMN IF EXISTS "createdAt",
    DROP COLUMN IF EXISTS "updatedAt";

-- Restore original default status if rollback is applied
ALTER TABLE "integration"."integ_payment_txns"
    ALTER COLUMN "status" SET DEFAULT 'SUCCESS';

-- 6. Drop indexes and table integration.integ_payment_orders (Non-CASCADE safe drop)
DROP INDEX IF EXISTS "integration"."integ_payment_orders_candidateId_idx";
DROP INDEX IF EXISTS "integration"."integ_payment_orders_candidateCode_idx";
DROP TABLE IF EXISTS "integration"."integ_payment_orders";

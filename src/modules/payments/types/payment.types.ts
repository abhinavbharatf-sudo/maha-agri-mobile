/**
 * Module 08: Financial Ledger & Benefit Disbursement Engine TypeScript Types
 * Location: /src/modules/payments/types/payment.types.ts
 */

export type EntryType = 'STANDARD' | 'REVERSAL_ENTRY' | 'ADJUSTMENT' | 'REFUND';

export type BankAdapterType = 'PFMS' | 'NPCI_APB' | 'DIRECT_BANK_API' | 'MANUAL';

export type PaymentLifecycleStatus =
  | 'REQUESTED'
  | 'VERIFIED'
  | 'BATCH_CREATED'
  | 'APPROVED'
  | 'SENT_TO_BANK'
  | 'SUCCESS'
  | 'PARTIAL_FAILED'
  | 'CLOSED';

export type ItemDisbursalStatus = 'PENDING' | 'VALIDATED' | 'SENT_TO_BANK' | 'SUCCESS' | 'FAILED' | 'REFUNDED';

export interface LedgerAccount {
  id: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  currentBalance: number;
}

export interface JournalEntry {
  id: string;
  entryCode: string; // JRN-2026-00912
  entryType: EntryType;
  reversalOfEntryCode?: string;
  debitAccountCode: string;
  creditAccountCode: string;
  amount: number;
  narration: string;
  postedByName: string;
  isPosted: boolean;
  postedAt: string;
}

export interface DisbursementItem {
  id: string;
  itemCode: string; // DBT-2026-09012
  batchId: string;
  beneficiaryUppId: string;
  beneficiaryName: string;
  ifscCode: string;
  bankAccountNo: string;
  amount: number;
  status: ItemDisbursalStatus;
  bankReferenceNo?: string;
  failureReason?: string;
  disbursedAt?: string;
}

export interface DisbursementBatch {
  id: string;
  batchCode: string; // BATCH-2026-00048
  schemeCode: string;
  bankAdapter: BankAdapterType;
  totalBeneficiaries: number;
  totalAmount: number;
  status: PaymentLifecycleStatus;
  items: DisbursementItem[];
  approvedByName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReconciliationReport {
  id: string;
  reconciliationDate: string;
  totalSentAmount: number;
  totalSuccessAmount: number;
  totalFailedAmount: number;
  discrepancyCount: number;
  status: 'RECONCILED' | 'DISCREPANCY_FOUND';
  reconciledAt: string;
}

export interface PaymentAnalyticsMetrics {
  totalDisbursedRupees: number;
  activeBatches: number;
  successRatePercentage: number;
  failedDisbursals: number;
  reconciledTodayRupees: number;
}

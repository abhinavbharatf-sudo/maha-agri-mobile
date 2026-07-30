/**
 * MAHA-AGRIDOOT Payment Engine, Escrow & DBT Service (Phase 9)
 * Manages Double-Entry Wallet Ledgers, Escrow Settlements & PFMS Direct Benefit Transfers.
 */

export interface PaymentWallet {
  wallet_id: string;
  user_id: string;
  account_type: 'FARMER' | 'ENTREPRENEUR' | 'OFFICER';
  current_balance: number;
  is_locked: boolean;
}

export interface PaymentTransaction {
  transaction_id: string;
  txn_reference: string;
  from_wallet_id?: string;
  to_wallet_id?: string;
  amount: number;
  txn_type: 'SUBSIDY_DBT' | 'SERVICE_PAYMENT' | 'INCENTIVE_CREDIT' | 'REFUND';
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REVERSED';
  created_at: string;
}

export interface EscrowRecord {
  escrow_id: string;
  booking_id: string;
  amount: number;
  escrow_status: 'HELD' | 'RELEASED' | 'REFUNDED';
}

/**
 * Execute Double-Entry Wallet Transfer
 */
export function transferWalletFunds(
  senderWallet: PaymentWallet,
  receiverWallet: PaymentWallet,
  amount: number,
  type: PaymentTransaction['txn_type']
): { updatedSender: PaymentWallet; updatedReceiver: PaymentWallet; transaction: PaymentTransaction } {
  if (senderWallet.is_locked || receiverWallet.is_locked) {
    throw new Error('Transaction Failed: Account wallet is locked for security audit.');
  }

  if (senderWallet.current_balance < amount) {
    throw new Error('Transaction Failed: Insufficient balance in wallet.');
  }

  const updatedSender: PaymentWallet = {
    ...senderWallet,
    current_balance: senderWallet.current_balance - amount
  };

  const updatedReceiver: PaymentWallet = {
    ...receiverWallet,
    current_balance: receiverWallet.current_balance + amount
  };

  const transaction: PaymentTransaction = {
    transaction_id: `TXN_${Date.now()}`,
    txn_reference: `REF-2026-${Math.floor(100000 + Math.random() * 900000)}`,
    from_wallet_id: senderWallet.wallet_id,
    to_wallet_id: receiverWallet.wallet_id,
    amount: amount,
    txn_type: type,
    status: 'SUCCESS',
    created_at: new Date().toISOString()
  };

  return { updatedSender, updatedReceiver, transaction };
}

/**
 * Disburse PFMS Direct Benefit Transfer (DBT) Subsidy Grant
 */
export function disburseDbtGrant(
  farmerWallet: PaymentWallet,
  subsidyAmount: number
): { updatedWallet: PaymentWallet; transaction: PaymentTransaction } {
  const updatedWallet: PaymentWallet = {
    ...farmerWallet,
    current_balance: farmerWallet.current_balance + subsidyAmount
  };

  const transaction: PaymentTransaction = {
    transaction_id: `DBT_${Date.now()}`,
    txn_reference: `PFMS-DBT-${Math.floor(100000 + Math.random() * 900000)}`,
    to_wallet_id: farmerWallet.wallet_id,
    amount: subsidyAmount,
    txn_type: 'SUBSIDY_DBT',
    status: 'SUCCESS',
    created_at: new Date().toISOString()
  };

  return { updatedWallet, transaction };
}

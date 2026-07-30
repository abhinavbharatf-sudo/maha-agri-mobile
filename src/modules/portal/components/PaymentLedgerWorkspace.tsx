import React, { useState } from 'react';
import { DollarSign, ShieldAlert, CheckCircle2, ArrowRightLeft, Send } from 'lucide-react';
import { PaymentWallet, PaymentTransaction, disburseDbtGrant } from '../../payments/paymentLedgerService';

export const PaymentLedgerWorkspace: React.FC = () => {
  const [wallet, setWallet] = useState<PaymentWallet>({
    wallet_id: 'WLT_FMR_101',
    user_id: 'USR_FMR_101',
    account_type: 'FARMER',
    current_balance: 14500.00,
    is_locked: false
  });

  const [txns, setTxns] = useState<PaymentTransaction[]>([
    {
      transaction_id: 'TXN_001',
      txn_reference: 'REF-2026-990123',
      amount: 6000.00,
      txn_type: 'SUBSIDY_DBT',
      status: 'SUCCESS',
      created_at: '2026-07-28 10:15:00'
    }
  ]);

  const [dbtMsg, setDbtMsg] = useState<string | null>(null);

  const handleDisburseDbt = () => {
    const res = disburseDbtGrant(wallet, 6000.00);
    setWallet(res.updatedWallet);
    setTxns([res.transaction, ...txns]);
    setDbtMsg(`✅ Successfully disbursed ₹6,000.00 Direct Benefit Transfer (DBT) grant via PFMS! Transaction Ref: ${res.transaction.txn_reference}`);
  };

  return (
    <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-slate-900 text-white p-4 rounded-xl flex items-center justify-between shadow-md">
        <div>
          <div className="flex items-center space-x-2">
            <DollarSign className="w-6 h-6 text-amber-400" />
            <h2 className="text-base font-black tracking-tight">Payment Engine, Multi-Wallet Ledger & DBT (Chapter 17)</h2>
          </div>
          <p className="text-xs text-emerald-100 mt-1 font-medium">
            Double-Entry Accounting Ledgers, Escrow Service Settlements & PFMS Direct Benefit Transfer
          </p>
        </div>
      </div>

      {dbtMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold flex items-center justify-between shadow-sm">
          <span>{dbtMsg}</span>
          <button onClick={() => setDbtMsg(null)} className="text-slate-500 hover:text-slate-800">✕</button>
        </div>
      )}

      {/* Wallet Balance Card & Disburse Action */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">FARMER DOUBLE-ENTRY LEDGER BALANCE</span>
          <h3 className="text-2xl font-black text-slate-900 mt-0.5">₹{wallet.current_balance.toLocaleString('en-IN')}.00</h3>
          <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded mt-1 inline-block">NPCI Aadhaar Bank Seeding Verified</span>
        </div>

        <button
          onClick={handleDisburseDbt}
          className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 shadow-sm transition-all"
        >
          <Send className="w-4 h-4 text-amber-400" />
          <span>Disburse ₹6,000 DBT Grant</span>
        </button>
      </div>

      {/* Transaction History */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <h3 className="font-extrabold text-sm text-slate-900">Recent Double-Entry Financial Transactions</h3>
        <div className="space-y-2">
          {txns.map(t => (
            <div key={t.transaction_id} className="p-3 border border-slate-200 rounded-xl bg-slate-50 flex items-center justify-between">
              <div>
                <span className="font-mono font-bold text-xs text-emerald-800">{t.txn_reference}</span>
                <p className="text-[10px] text-slate-500 font-medium">Type: {t.txn_type} | Time: {t.created_at}</p>
              </div>

              <div className="text-right">
                <span className="font-black text-sm text-emerald-700">+₹{t.amount.toLocaleString('en-IN')}.00</span>
                <span className="block text-[9px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded mt-0.5">{t.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

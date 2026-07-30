/**
 * Financial Ledger & Benefit Disbursement Directory Component — Module 08
 * Location: /src/modules/payments/components/PaymentLedgerDirectory.tsx
 * Features:
 * - Real-Time Payment Analytics KPI Bar
 * - Layer 1: Immutable Double-Entry Journal Ledger (Reversal Entries Only)
 * - Layer 2: DBT Subsidy Disbursement Batch Manager (PFMS, NPCI, Bank Direct API)
 * - Daily Automated Reconciliation Engine Inspector
 * - Refund, Recovery & Adjustment Flow Manager
 */

import React, { useState } from 'react';
import {
  JournalEntry,
  DisbursementBatch,
  BankAdapterType,
  PaymentLifecycleStatus,
  ReconciliationReport
} from '../types/payment.types';
import { FinancialLedgerEngineService } from '../services/FinancialLedgerEngineService';
import { CreditCard, Lock, ShieldCheck, RefreshCw, ArrowRight, CheckCircle2, AlertTriangle, Building, Landmark, RotateCcw, FileText, Layers, Wallet, Play, Plus, Search, DollarSign } from 'lucide-react';

export const PaymentLedgerDirectory: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'DBT_BATCHES' | 'IMMUTABLE_LEDGER' | 'RECONCILIATION' | 'REFUNDS'>('DBT_BATCHES');
  const [selectedAdapter, setSelectedAdapter] = useState<BankAdapterType>('PFMS');
  const [reconciliationReport, setReconciliationReport] = useState<ReconciliationReport | null>(null);

  // Layer 1: Immutable Journal Entries
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([
    {
      id: 'jrn-1',
      entryCode: 'JRN-2026-00912',
      entryType: 'STANDARD',
      debitAccountCode: 'ACC-SUBSIDY-DISBURSED',
      creditAccountCode: 'ACC-STATE-POOL',
      amount: 485000.0,
      narration: 'Disbursement of Agriculture Soil Testing DBT Benefit for Batch #BATCH-2026-00048',
      postedByName: 'State Disbursal Officer',
      isPosted: true,
      postedAt: '2026-07-22T14:00:00Z',
    },
    {
      id: 'jrn-2',
      entryCode: 'JRN-2026-00913',
      entryType: 'REVERSAL_ENTRY',
      reversalOfEntryCode: 'JRN-2026-00910',
      debitAccountCode: 'ACC-STATE-POOL',
      creditAccountCode: 'ACC-SUBSIDY-DISBURSED',
      amount: 15000.0,
      narration: 'REVERSAL OF JRN-2026-00910: Failed bank transfer refund recovery',
      postedByName: 'Reconciliation Officer',
      isPosted: true,
      postedAt: '2026-07-22T16:30:00Z',
    },
  ]);

  // Layer 2: DBT Disbursement Batches
  const [batches, setBatches] = useState<DisbursementBatch[]>([
    {
      id: 'b-1',
      batchCode: 'BATCH-2026-00048',
      schemeCode: 'MAHA-AGRI',
      bankAdapter: 'PFMS',
      totalBeneficiaries: 124,
      totalAmount: 485000.0,
      status: 'APPROVED',
      approvedByName: 'State Administrator',
      createdAt: '2026-07-22T10:00:00Z',
      updatedAt: '2026-07-22T13:30:00Z',
      items: [
        {
          id: 'i-1',
          itemCode: 'DBT-2026-09012',
          batchId: 'b-1',
          beneficiaryUppId: 'UPP-000000125',
          beneficiaryName: 'Ankita Suresh Deshmukh',
          ifscCode: 'SBIN0001425',
          bankAccountNo: 'XXXX-XXXX-9012',
          amount: 4500.0,
          status: 'PENDING',
        },
      ],
    },
    {
      id: 'b-2',
      batchCode: 'BATCH-2026-00049',
      schemeCode: 'DRONE_SUBSIDY',
      bankAdapter: 'NPCI_APB',
      totalBeneficiaries: 45,
      totalAmount: 650000.0,
      status: 'SENT_TO_BANK',
      approvedByName: 'State Administrator',
      createdAt: '2026-07-22T11:00:00Z',
      updatedAt: '2026-07-22T15:00:00Z',
      items: [],
    },
    {
      id: 'b-3',
      batchCode: 'BATCH-2026-00050',
      schemeCode: 'PMEGP_GRANT',
      bankAdapter: 'DIRECT_BANK_API',
      totalBeneficiaries: 12,
      totalAmount: 1200000.0,
      status: 'SUCCESS',
      approvedByName: 'Regional Manager',
      createdAt: '2026-07-21T09:00:00Z',
      updatedAt: '2026-07-21T16:00:00Z',
      items: [],
    },
  ]);

  const analytics = FinancialLedgerEngineService.computeAnalytics(batches);

  const handleProcessDisbursal = (batch: DisbursementBatch) => {
    const { updatedBatch, gatewayResponse } = FinancialLedgerEngineService.processBankDisbursal(batch, selectedAdapter);

    // Also post Immutable Journal Entry to Layer 1 Ledger
    const journal = FinancialLedgerEngineService.postJournalEntry(
      'ACC-SUBSIDY-DISBURSED',
      'ACC-STATE-POOL',
      batch.totalAmount,
      `DBT Disbursal for Batch ${batch.batchCode} via ${selectedAdapter}`,
      'State Disbursal Officer'
    );

    setBatches(batches.map((b) => (b.id === batch.id ? updatedBatch : b)));
    setJournalEntries([journal, ...journalEntries]);
    alert(gatewayResponse);
  };

  const handleReversalEntry = (entry: JournalEntry) => {
    const reason = prompt('Enter Reversal Entry Reason (Accounting Correction):');
    if (!reason) return;

    const reversal = FinancialLedgerEngineService.createReversalEntry(entry, reason, 'Auditor');
    setJournalEntries([reversal, ...journalEntries]);
    alert(`Reversal Entry ${reversal.entryCode} Posted! Original entry remains immutable in audit log.`);
  };

  const handleRunReconciliation = () => {
    const report = FinancialLedgerEngineService.runDailyReconciliation(batches);
    setReconciliationReport(report);
    alert(`Daily Reconciliation Completed: ${report.status}`);
  };

  return (
    <div className="space-y-6 text-xs text-slate-900">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-blue-600">
              Module 08: Financial Ledger & Benefit Disbursement Engine
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-mono">
              v1.6.0-alpha Enterprise
            </span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 mt-0.5">Financial Ledger & DBT Subsidy Disbursal Workspace</h2>
          <p className="text-xs text-slate-500">
            Immutable Double-Entry Journal, DBT Batch Processing, Pluggable Bank Adapters & Daily Reconciliation
          </p>
        </div>

        {/* Bank Adapter Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700">Bank Gateway:</span>
          <select
            value={selectedAdapter}
            onChange={(e) => setSelectedAdapter(e.target.value as BankAdapterType)}
            className="bg-slate-900 text-white font-mono font-bold text-xs rounded-xl px-3 py-1.5 focus:outline-none cursor-pointer"
          >
            <option value="PFMS">🏛️ PFMS (Govt Financial Management)</option>
            <option value="NPCI_APB">💳 NPCI Aadhaar Payment Bridge</option>
            <option value="DIRECT_BANK_API">🏦 Bank Direct Host-to-Host API</option>
            <option value="MANUAL">📋 Manual Transfer Clearance</option>
          </select>
        </div>
      </div>

      {/* ─── REAL-TIME PAYMENT ANALYTICS KPI BAR ────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 text-center space-y-0.5 shadow-sm">
          <p className="text-[10px] text-slate-500 font-bold uppercase">Total Disbursed (Rupees)</p>
          <p className="text-xl font-black text-emerald-600 font-mono">
            ₹{analytics.totalDisbursedRupees.toLocaleString()}
          </p>
        </div>
        <div className="bg-blue-50/60 p-3.5 rounded-2xl border border-slate-200 text-center space-y-0.5 shadow-sm">
          <p className="text-[10px] text-slate-500 font-bold uppercase">Active DBT Batches</p>
          <p className="text-xl font-black text-blue-600">{analytics.activeBatches}</p>
        </div>
        <div className="bg-emerald-50/60 p-3.5 rounded-2xl border border-slate-200 text-center space-y-0.5 shadow-sm">
          <p className="text-[10px] text-slate-500 font-bold uppercase">Disbursal Success Rate</p>
          <p className="text-xl font-black text-emerald-700">{analytics.successRatePercentage}%</p>
        </div>
        <div className="bg-purple-50/60 p-3.5 rounded-2xl border border-slate-200 text-center space-y-0.5 shadow-sm">
          <p className="text-[10px] text-slate-500 font-bold uppercase">Reconciled Today</p>
          <p className="text-xl font-black text-purple-600 font-mono">
            ₹{analytics.reconciledTodayRupees.toLocaleString()}
          </p>
        </div>
        <div className="bg-slate-900 text-white p-3.5 rounded-2xl text-center space-y-0.5 shadow-sm">
          <p className="text-[10px] text-slate-400 font-bold uppercase">Ledger Audit Lock</p>
          <p className="text-xs font-mono font-bold text-blue-400 flex items-center justify-center gap-1 mt-1">
            <Lock className="w-3.5 h-3.5 text-amber-400" /> IMMUTABLE
          </p>
        </div>
      </div>

      {/* Workspace Tabs */}
      <div className="flex border-b border-slate-200 font-bold text-xs">
        <button
          onClick={() => setActiveTab('DBT_BATCHES')}
          className={`px-4 py-2 border-b-2 transition-all ${
            activeTab === 'DBT_BATCHES'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Layer 2: DBT Subsidy Batches ({batches.length})
        </button>
        <button
          onClick={() => setActiveTab('IMMUTABLE_LEDGER')}
          className={`px-4 py-2 border-b-2 transition-all ${
            activeTab === 'IMMUTABLE_LEDGER'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Layer 1: Immutable Double-Entry Ledger ({journalEntries.length})
        </button>
        <button
          onClick={() => setActiveTab('RECONCILIATION')}
          className={`px-4 py-2 border-b-2 transition-all ${
            activeTab === 'RECONCILIATION'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Daily Reconciliation Engine
        </button>
        <button
          onClick={() => setActiveTab('REFUNDS')}
          className={`px-4 py-2 border-b-2 transition-all ${
            activeTab === 'REFUNDS'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Refund, Recovery & Adjustment
        </button>
      </div>

      {/* TAB 1: LAYER 2 - DBT SUBSIDY BATCHES MANAGER */}
      {activeTab === 'DBT_BATCHES' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {batches.map((b) => (
            <div key={b.id} className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4 shadow-sm hover:shadow-md transition-all">
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-mono font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-[11px]">
                    {b.batchCode}
                  </span>
                  <span className="text-[10px] font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 font-bold ml-1">
                    {b.schemeCode}
                  </span>
                </div>

                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                    b.status === 'SUCCESS'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                      : 'bg-blue-100 text-blue-800 border-blue-200'
                  }`}
                >
                  {b.status}
                </span>
              </div>

              <div>
                <p className="text-xl font-black font-mono text-slate-900">₹{b.totalAmount.toLocaleString()}</p>
                <p className="text-xs text-slate-600 mt-0.5">
                  Beneficiaries: <strong>{b.totalBeneficiaries} Profiles</strong>
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                  Gateway Adapter: <strong className="text-slate-800">{b.bankAdapter}</strong>
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] text-slate-500 font-mono">
                  Approved: {b.approvedByName || 'Pending Approval'}
                </span>

                {b.status !== 'SUCCESS' && (
                  <button
                    onClick={() => handleProcessDisbursal(b)}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl text-xs flex items-center gap-1 shadow"
                  >
                    <Play className="w-3 h-3" />
                    <span>Disburse via {selectedAdapter}</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: LAYER 1 - IMMUTABLE DOUBLE-ENTRY LEDGER */}
      {activeTab === 'IMMUTABLE_LEDGER' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-5">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Layer 1: Immutable Double-Entry Journal Audit Log</h3>
              <p className="text-xs text-slate-500">Strict Double-Entry Bookkeeping — No edits or deletes allowed. Reversal entries only.</p>
            </div>

            <button
              onClick={() => {
                const entry = FinancialLedgerEngineService.postJournalEntry(
                  'ACC-SUBSIDY-DISBURSED',
                  'ACC-STATE-POOL',
                  50000.0,
                  'Manual Entry for Agri Machinery Grant',
                  'Auditor'
                );
                setJournalEntries([entry, ...journalEntries]);
              }}
              className="px-3 py-1.5 bg-blue-600 text-white font-bold rounded-xl text-xs flex items-center gap-1 shadow"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Post Journal Entry</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono uppercase text-[10px]">
                  <th className="p-3">Entry Code</th>
                  <th className="p-3">Entry Type</th>
                  <th className="p-3">Debit Account (Dr)</th>
                  <th className="p-3">Credit Account (Cr)</th>
                  <th className="p-3 text-right">Amount (₹)</th>
                  <th className="p-3">Narration / Reversal Link</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {journalEntries.map((j) => (
                  <tr key={j.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-mono font-bold text-blue-700">{j.entryCode}</td>
                    <td className="p-3">
                      <span
                        className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                          j.entryType === 'REVERSAL_ENTRY'
                            ? 'bg-amber-100 text-amber-800 border-amber-200'
                            : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        }`}
                      >
                        {j.entryType}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-[11px] text-slate-700">{j.debitAccountCode}</td>
                    <td className="p-3 font-mono text-[11px] text-slate-700">{j.creditAccountCode}</td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900">₹{j.amount.toLocaleString()}</td>
                    <td className="p-3 max-w-xs text-slate-600">{j.narration}</td>
                    <td className="p-3 text-right">
                      {j.entryType !== 'REVERSAL_ENTRY' && (
                        <button
                          onClick={() => handleReversalEntry(j)}
                          className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold rounded-lg text-[10px] flex items-center gap-1 ml-auto"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Post Reversal</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: DAILY RECONCILIATION ENGINE */}
      {activeTab === 'RECONCILIATION' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4 shadow-sm">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Automated Daily Reconciliation Engine</h3>
              <p className="text-xs text-slate-500">Audits Sent, Success, Failed, and Pending Bank Disbursals</p>
            </div>

            <button
              onClick={handleRunReconciliation}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded-xl text-xs flex items-center gap-2 shadow"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Run Daily Reconciliation</span>
            </button>
          </div>

          {reconciliationReport ? (
            <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-3 font-mono">
              <div className="flex justify-between items-center text-xs">
                <span className="text-blue-400 font-bold">Reconciliation Date: {reconciliationReport.reconciliationDate}</span>
                <span className="text-emerald-400 font-bold bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                  {reconciliationReport.status}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center pt-2">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <p className="text-[10px] text-slate-400">Total Sent</p>
                  <p className="text-base font-black text-white">₹{reconciliationReport.totalSentAmount.toLocaleString()}</p>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <p className="text-[10px] text-slate-400">Total Success</p>
                  <p className="text-base font-black text-emerald-400">₹{reconciliationReport.totalSuccessAmount.toLocaleString()}</p>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <p className="text-[10px] text-slate-400">Total Discrepancies</p>
                  <p className="text-base font-black text-amber-400">{reconciliationReport.discrepancyCount}</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic">Click 'Run Daily Reconciliation' to execute automated audit check.</p>
          )}
        </div>
      )}

      {/* TAB 4: REFUND, RECOVERY & ADJUSTMENT */}
      {activeTab === 'REFUNDS' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4 shadow-sm">
          <h3 className="text-sm font-extrabold text-slate-900 border-b border-slate-100 pb-2">
            Refund, Recovery & Adjustment Engine
          </h3>
          <p className="text-xs text-slate-600">
            Handles wrong bank account transfers, duplicate payments, or citizen recovery entries.
          </p>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex justify-between items-center text-xs">
            <div>
              <p className="font-bold text-slate-900">Duplicate Subsidy Transfer Recovery Flow</p>
              <p className="text-slate-500 text-[11px]">Recovery Account: ACC-REFUND-RECOVERY • Current Balance: ₹45,000</p>
            </div>
            <button
              onClick={() => alert('Initiated Subsidy Recovery Flow')}
              className="px-3 py-1.5 bg-amber-600 text-white font-bold rounded-xl text-xs shadow"
            >
              Initiate Recovery Entry
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

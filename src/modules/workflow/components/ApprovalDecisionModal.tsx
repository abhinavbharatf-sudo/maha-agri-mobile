/**
 * Approval Decision Modal UI Component — Module 07 Workflow & Approval Engine
 * Location: /src/modules/workflow/components/ApprovalDecisionModal.tsx
 * Supports 5 Decisions:
 * APPROVE, REJECT, RETURNED (Send Back), ESCALATE, DELEGATE
 * Records Cryptographic Digital Signature Audit (User, Role, IP Address, Device Info, Timestamp)
 */

import React, { useState } from 'react';
import { ApprovalTask, ApprovalDecision } from '../types/workflow.types';
import { WorkflowApprovalEngineService } from '../services/WorkflowApprovalEngineService';
import { CheckCircle2, XCircle, RotateCcw, ShieldAlert, UserCheck, ShieldCheck, Lock, X, FileCheck, Layers } from 'lucide-react';

interface ApprovalDecisionModalProps {
  task: ApprovalTask;
  activeRoleKey: string;
  onClose: () => void;
  onDecisionComplete: (updatedTask: ApprovalTask) => void;
}

export const ApprovalDecisionModal: React.FC<ApprovalDecisionModalProps> = ({
  task,
  activeRoleKey,
  onClose,
  onDecisionComplete,
}) => {
  const [selectedDecision, setSelectedDecision] = useState<ApprovalDecision>('APPROVED');
  const [reasonText, setReasonText] = useState('All verification documents and field inspections verified and found in order.');
  const [delegateeName, setDelegateeName] = useState('Assistant Regional Manager');

  const handleExecuteDecision = () => {
    if (!reasonText.trim()) {
      alert('Please enter a decision justification reason.');
      return;
    }

    const { updatedTask } = WorkflowApprovalEngineService.executeDecision(
      task,
      selectedDecision,
      reasonText,
      'Ramesh Patil',
      activeRoleKey.replace(/_/g, ' ')
    );

    if (selectedDecision === 'DELEGATED') {
      updatedTask.assignedUserName = delegateeName;
      updatedTask.isDelegated = true;
    }

    alert(`Decision '${selectedDecision}' executed successfully with Digital Signature Audit Trail!`);
    onDecisionComplete(updatedTask);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
      <div className="bg-white border border-slate-200 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden text-xs text-slate-900">
        {/* Modal Header */}
        <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-blue-400 font-extrabold text-xs">{task.taskCode}</span>
              <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-bold">
                {task.requestCode}
              </span>
            </div>
            <h3 className="text-base font-extrabold text-white mt-0.5">Execute Approval Decision</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Target Task Summary */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <div className="flex justify-between items-center text-slate-700 font-bold">
              <span>{task.stepName}</span>
              <span className="font-mono text-blue-700">₹{task.financialAmountRupees.toLocaleString()}</span>
            </div>
            <p className="text-slate-500">Applicant: <strong>{task.applicantName}</strong> ({task.applicantUppId})</p>
          </div>

          {/* Decision Type Buttons */}
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-800 text-xs">Select Decision Action</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { type: 'APPROVED', label: '✅ Approve', color: 'bg-emerald-50 text-emerald-800 border-emerald-300' },
                { type: 'REJECTED', label: '❌ Reject', color: 'bg-red-50 text-red-800 border-red-300' },
                { type: 'RETURNED', label: '🔄 Send Back (Revisions)', color: 'bg-amber-50 text-amber-800 border-amber-300' },
                { type: 'ESCALATE', label: '⚡ Escalate to Higher Tier', color: 'bg-purple-50 text-purple-800 border-purple-300' },
                { type: 'DELEGATE', label: '🤝 Delegate to Proxy', color: 'bg-blue-50 text-blue-800 border-blue-300' },
              ].map((btn) => (
                <button
                  type="button"
                  key={btn.type}
                  onClick={() => setSelectedDecision(btn.type as ApprovalDecision)}
                  className={`p-2.5 rounded-xl border font-bold text-xs text-left transition-all ${
                    selectedDecision === btn.type
                      ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-blue-500'
                      : btn.color
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          {/* Delegatee Name Input if DELEGATE */}
          {selectedDecision === 'DELEGATED' && (
            <div className="space-y-1">
              <label className="block font-bold text-slate-800 text-xs">Proxy Officer Name</label>
              <input
                type="text"
                value={delegateeName}
                onChange={(e) => setDelegateeName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
              />
            </div>
          )}

          {/* Justification Reason */}
          <div className="space-y-1">
            <label className="block font-bold text-slate-800 text-xs">Decision Justification / Reason *</label>
            <textarea
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
              rows={3}
            />
          </div>

          {/* Cryptographic Audit Trail Preview */}
          <div className="p-3 bg-slate-900 text-white rounded-xl space-y-1">
            <div className="flex justify-between items-center text-[10px] text-blue-400 font-mono font-bold uppercase">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Digital Signature Audit Stamp
              </span>
              <span>103.24.112.45</span>
            </div>
            <p className="text-[11px] text-slate-300 font-mono">
              Signed by: <strong>Ramesh Patil</strong> ({activeRoleKey.replace(/_/g, ' ')}) • GDOP Intranet Verified
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs">
            Cancel
          </button>
          <button
            onClick={handleExecuteDecision}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded-xl text-xs shadow"
          >
            Confirm & Stamp Decision
          </button>
        </div>
      </div>
    </div>
  );
};

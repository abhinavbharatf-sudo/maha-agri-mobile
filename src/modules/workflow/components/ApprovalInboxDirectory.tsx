/**
 * Role-Adaptive Approval Inbox & Workflow Orchestrator — Module 07
 * Location: /src/modules/workflow/components/ApprovalInboxDirectory.tsx
 * Features:
 * - 5 Inbox Views (Pending, Delegated, Escalated, Returned, Completed)
 * - Proxy Delegation Manager (Officer Absence Proxy Routing)
 * - SLA Escalation Matrix Inspector (24h, 48h, 72h, 96h)
 * - Parallel & Conditional Branching Rules Visualizer
 */

import React, { useState } from 'react';
import { ApprovalTask, ApprovalInboxFilterView, DelegationRecord } from '../types/workflow.types';
import { WorkflowApprovalEngineService } from '../services/WorkflowApprovalEngineService';
import { ApprovalDecisionModal } from './ApprovalDecisionModal';
import { Shield, Clock, AlertTriangle, CheckCircle2, UserCheck, Layers, GitBranch, ArrowRight, RefreshCw, FileText, UserPlus, Filter, XCircle, Search, Award } from 'lucide-react';

interface ApprovalInboxDirectoryProps {
  activeRoleKey?: string;
}

export const ApprovalInboxDirectory: React.FC<ApprovalInboxDirectoryProps> = ({
  activeRoleKey = 'SUPER_ADMIN',
}) => {
  const [activeInboxView, setActiveInboxView] = useState<ApprovalInboxFilterView>('PENDING');
  const [selectedTaskForDecision, setSelectedTaskForDecision] = useState<ApprovalTask | null>(null);
  const [showDelegationModal, setShowDelegationModal] = useState(false);

  // Delegation Manager State
  const [delegations, setDelegations] = useState<DelegationRecord[]>(WorkflowApprovalEngineService.ACTIVE_DELEGATIONS);
  const [newDelegateeName, setNewDelegateeName] = useState('Suresh Agridoot (Field Staff)');
  const [newReason, setNewReason] = useState('On Field Inspection Tour in Wardha');

  // Initial Enterprise Approval Tasks Queue
  const [tasks, setTasks] = useState<ApprovalTask[]>([
    {
      id: 'apt-1',
      taskCode: 'APT-2026-00910',
      instanceId: 'wfi-101',
      requestCode: 'MA-REQ-000154',
      caseCode: 'CASE-2026-0048',
      applicantUppId: 'UPP-000000125',
      applicantName: 'Ankita Suresh Deshmukh',
      stepName: 'Soil Testing Lab Verification & Subsidy Clearance',
      approverRole: 'DISTRICT_COORDINATOR',
      assignedUserName: 'Ramesh Patil',
      financialAmountRupees: 45000.0, // < 50,000 (District Only)
      decision: 'PENDING',
      isDelegated: false,
      slaDeadline: '2026-07-24T18:00:00Z',
      isEscalated: false,
      createdAt: '2026-07-22T10:00:00Z',
    },
    {
      id: 'apt-2',
      taskCode: 'APT-2026-00911',
      instanceId: 'wfi-102',
      requestCode: 'MA-REQ-000155',
      caseCode: 'CASE-2026-0049',
      applicantUppId: 'UPP-000000124',
      applicantName: 'Sunil Dattatray Patil',
      stepName: 'Drone Spraying High-Value Subsidy Sanction',
      approverRole: 'STATE_ADMIN',
      assignedUserName: 'State Administrator',
      financialAmountRupees: 650000.0, // > 5,00,000 (State Level Tier)
      decision: 'PENDING',
      isDelegated: true,
      delegatedFromUserName: 'Ramesh Patil',
      slaDeadline: '2026-07-23T12:00:00Z',
      isEscalated: false,
      createdAt: '2026-07-22T12:00:00Z',
    },
    {
      id: 'apt-3',
      taskCode: 'APT-2026-00912',
      instanceId: 'wfi-103',
      requestCode: 'MA-REQ-000156',
      caseCode: 'CASE-2026-0050',
      applicantUppId: 'UPP-000000126',
      applicantName: 'Vikram Rajendra Shinde',
      stepName: 'EDP Entrepreneur Capacity Grant Approval',
      approverRole: 'REGIONAL_MANAGER',
      assignedUserName: 'Regional Manager',
      financialAmountRupees: 120000.0,
      decision: 'ESCALATED',
      isDelegated: false,
      slaDeadline: '2026-07-22T08:00:00Z',
      isEscalated: true,
      escalationLevel: 'REGIONAL_MANAGER',
      createdAt: '2026-07-20T09:00:00Z',
    },
    {
      id: 'apt-4',
      taskCode: 'APT-2026-00913',
      instanceId: 'wfi-104',
      requestCode: 'MA-REQ-000153',
      caseCode: 'CASE-2026-0047',
      applicantUppId: 'UPP-000000123',
      applicantName: 'Ramesh Balaji Gokhale',
      stepName: 'PMEGP Subsidy Initial Verification',
      approverRole: 'DISTRICT_COORDINATOR',
      assignedUserName: 'Ramesh Patil',
      financialAmountRupees: 35000.0,
      decision: 'RETURNED',
      decisionReason: 'Missing 7/12 Land Record attachment; sent back for citizen update.',
      isDelegated: false,
      slaDeadline: '2026-07-25T10:00:00Z',
      isEscalated: false,
      createdAt: '2026-07-21T11:00:00Z',
    },
  ]);

  const filteredTasks = tasks.filter((t) => {
    switch (activeInboxView) {
      case 'PENDING':
        return t.decision === 'PENDING' && !t.isDelegated;
      case 'DELEGATED':
        return t.isDelegated;
      case 'ESCALATED':
        return t.isEscalated || t.decision === 'ESCALATED';
      case 'RETURNED':
        return t.decision === 'RETURNED';
      case 'COMPLETED':
        return t.decision === 'APPROVED' || t.decision === 'REJECTED';
    }
  });

  const handleAddDelegation = () => {
    const newRecord: DelegationRecord = {
      id: `del-${Date.now()}`,
      delegatorUserId: 'u-101',
      delegatorName: 'Ramesh Patil',
      delegateeUserId: 'u-103',
      delegateeName: newDelegateeName,
      startDate: new Date().toISOString().split('T')[0],
      endDate: '2026-07-31',
      reason: newReason,
      isActive: true,
    };

    setDelegations([...delegations, newRecord]);
    setShowDelegationModal(false);
    alert(`Active Delegation set: Forwarding approvals to ${newDelegateeName}.`);
  };

  return (
    <div className="space-y-6 text-xs text-slate-900">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-blue-600">
              Module 07: Workflow & Approval Engine
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-mono">
              v1.5.0-alpha Enterprise
            </span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 mt-0.5">Role-Adaptive Approval Inbox & Orchestrator</h2>
          <p className="text-xs text-slate-500">
            Process Engine Transitions, Approval Decision Engine, Proxy Delegations & SLA Escalation Matrix
          </p>
        </div>

        <button
          onClick={() => setShowDelegationModal(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow transition-all"
        >
          <UserPlus className="w-4 h-4" />
          <span>+ Manage Proxy Delegation</span>
        </button>
      </div>

      {/* SLA Escalation Matrix & Delegation Inspector Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Configurable SLA Escalation Matrix */}
        <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 space-y-2 shadow-sm">
          <div className="flex justify-between items-center text-xs font-bold text-blue-400">
            <span className="flex items-center gap-1.5 font-mono">
              <Clock className="w-4 h-4 text-amber-400" /> Configurable SLA Escalation Matrix
            </span>
            <span className="text-[10px] text-slate-400">Auto-Escalates</span>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-mono">
            {WorkflowApprovalEngineService.ESCALATION_MATRIX.map((m, idx) => (
              <div key={idx} className="bg-slate-950 p-2 rounded-xl border border-slate-800 space-y-0.5">
                <span className="text-amber-400 font-bold">{m.slaHours} Hours</span>
                <p className="text-slate-300 font-sans text-[9px] font-bold">{m.actionType.replace('_', ' ')}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Active Proxy Delegation Indicator */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2 shadow-sm">
          <div className="flex justify-between items-center text-xs font-bold text-slate-900">
            <span className="flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-emerald-600" /> Active Proxy Delegation Rules
            </span>
            <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              {delegations.filter((d) => d.isActive).length} Active Proxy
            </span>
          </div>

          {delegations.map((d) => (
            <div key={d.id} className="p-2 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
              <div>
                <p className="font-bold text-slate-900">Forwarding to: {d.delegateeName}</p>
                <p className="text-[10px] text-slate-500 font-mono">Reason: {d.reason}</p>
              </div>
              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                Active until {d.endDate}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Role-Adaptive Approval Inbox Tabs */}
      <div className="flex border-b border-slate-200 font-bold text-xs">
        {[
          { key: 'PENDING', label: 'My Pending Approvals', count: tasks.filter((t) => t.decision === 'PENDING' && !t.isDelegated).length },
          { key: 'DELEGATED', label: 'Delegated to Me', count: tasks.filter((t) => t.isDelegated).length },
          { key: 'ESCALATED', label: 'Escalated Tasks', count: tasks.filter((t) => t.isEscalated).length },
          { key: 'RETURNED', label: 'Returned / Send Back', count: tasks.filter((t) => t.decision === 'RETURNED').length },
          { key: 'COMPLETED', label: 'Completed Audit Trail', count: tasks.filter((t) => t.decision === 'APPROVED' || t.decision === 'REJECTED').length },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveInboxView(tab.key as ApprovalInboxFilterView)}
            className={`px-4 py-2 border-b-2 transition-all flex items-center gap-1.5 ${
              activeInboxView === tab.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <span>{tab.label}</span>
            <span className="text-[10px] font-mono font-bold bg-slate-100 px-1.5 py-0.2 rounded text-slate-700">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Inbox Tasks Cards Queue */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTasks.map((t) => {
          const tier = WorkflowApprovalEngineService.evaluateRequiredApproverRole(t.financialAmountRupees);
          return (
            <div
              key={t.id}
              className={`bg-white p-5 rounded-2xl border space-y-4 shadow-sm hover:shadow-md transition-all ${
                t.isEscalated
                  ? 'border-l-4 border-l-purple-600 border-slate-200'
                  : t.isDelegated
                  ? 'border-l-4 border-l-blue-600 border-slate-200'
                  : 'border-slate-200'
              }`}
            >
              {/* Card Header */}
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-mono font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-[11px]">
                    {t.taskCode}
                  </span>
                  <span className="text-[10px] font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 font-bold ml-1">
                    {t.caseCode}
                  </span>
                </div>

                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                    t.decision === 'APPROVED'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                      : t.decision === 'RETURNED'
                      ? 'bg-amber-100 text-amber-800 border-amber-200'
                      : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {t.decision}
                </span>
              </div>

              {/* Step & Financial Tier */}
              <div>
                <h3 className="text-base font-extrabold text-slate-900">{t.stepName}</h3>
                <p className="text-xs text-slate-600 mt-0.5 font-medium">
                  Applicant: <strong>{t.applicantName}</strong> ({t.applicantUppId})
                </p>
                <div className="p-2 bg-slate-50 rounded-xl border border-slate-100 mt-2 flex justify-between items-center text-[11px]">
                  <span className="text-slate-500 font-mono">Financial Amount:</span>
                  <span className="font-mono font-bold text-slate-900 text-xs">₹{t.financialAmountRupees.toLocaleString()}</span>
                </div>
                <p className="text-[10px] text-purple-700 font-bold mt-1">Tier: {tier.tier}</p>
              </div>

              {/* Digital Signature Audit Stamp if Completed */}
              {t.signatureAudit && (
                <div className="p-2.5 bg-slate-900 text-white rounded-xl space-y-0.5 text-[10px] font-mono">
                  <p className="text-blue-400 font-bold">Digital Signature Audit Stamp:</p>
                  <p>Signed: {t.signatureAudit.userName} ({t.signatureAudit.userRole})</p>
                  <p className="text-slate-400">IP: {t.signatureAudit.ipAddress} • {t.signatureAudit.decidedAt}</p>
                </div>
              )}

              {/* Action Button */}
              <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                <span className="text-[10px] text-slate-500">
                  Approver: <strong className="text-slate-800">{t.assignedUserName}</strong>
                </span>

                {t.decision === 'PENDING' && (
                  <button
                    onClick={() => setSelectedTaskForDecision(t)}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-xs shadow transition-colors"
                  >
                    Execute Decision
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Decision Modal Trigger */}
      {selectedTaskForDecision && (
        <ApprovalDecisionModal
          task={selectedTaskForDecision}
          activeRoleKey={activeRoleKey}
          onClose={() => setSelectedTaskForDecision(null)}
          onDecisionComplete={(updated) => {
            setTasks(tasks.map((t) => (t.id === updated.id ? updated : t)));
            setSelectedTaskForDecision(null);
          }}
        />
      )}

      {/* Delegation Manager Modal */}
      {showDelegationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden text-xs text-slate-900 space-y-4 p-5">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="text-base font-extrabold text-slate-900">Manage Proxy Delegation</h3>
              <button onClick={() => setShowDelegationModal(false)} className="text-slate-400 hover:text-slate-700">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="block font-bold text-slate-800">Delegate Approvals To (Proxy Officer)</label>
              <input
                type="text"
                value={newDelegateeName}
                onChange={(e) => setNewDelegateeName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
              />

              <label className="block font-bold text-slate-800 pt-2">Reason for Absence / Proxy Routing</label>
              <textarea
                value={newReason}
                onChange={(e) => setNewReason(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs"
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button onClick={() => setShowDelegationModal(false)} className="px-3 py-1.5 bg-slate-200 rounded-xl font-bold">
                Cancel
              </button>
              <button onClick={handleAddDelegation} className="px-4 py-1.5 bg-blue-600 text-white font-extrabold rounded-xl shadow">
                Save Proxy Delegation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Universal Service Request Detail View UI Component (Enhanced Enterprise)
 * Location: /src/modules/requests/components/ServiceRequestDetailView.tsx
 * Displays Request State Progression Bar, Case Abstraction Layer, Universal Verification Checklist,
 * 4-Tier SLA Engine, and Embedded Universal Timeline Component.
 */

import React, { useState } from 'react';
import { ServiceRequest, ServiceRequestStatus, ChecklistItem } from '../types/service_request.types';
import { ServiceRequestEngineService } from '../services/ServiceRequestEngineService';
import { UniversalTimelineUI } from '../../../core/components/UniversalTimelineUI';
import { ArrowLeft, Clock, AlertTriangle, CheckCircle2, RefreshCw, UserCheck, Shield, Wrench, FileText, ArrowRight, User, CheckSquare, Layers3 } from 'lucide-react';

interface ServiceRequestDetailViewProps {
  request: ServiceRequest;
  onBack: () => void;
}

export const ServiceRequestDetailView: React.FC<ServiceRequestDetailViewProps> = ({ request: initialRequest, onBack }) => {
  const [request, setRequest] = useState<ServiceRequest>(initialRequest);
  const [checklist, setChecklist] = useState<ChecklistItem[]>(
    initialRequest.checklist || [
      { id: 'ck1', label: 'Farmer Geotagged Photo Verification', isCompleted: true },
      { id: 'ck2', label: 'Soil Sample QR Code Scan', isCompleted: true },
      { id: 'ck3', label: 'Lab Sample Receipt Generation', isCompleted: false },
      { id: 'ck4', label: 'Coordinator Signature Verification', isCompleted: false },
    ]
  );
  const [transitioning, setTransitioning] = useState(false);
  const [targetStatus, setTargetStatus] = useState<ServiceRequestStatus>('ASSIGNED');
  const [assigneeName, setAssigneeName] = useState(request.assignedToName || 'Suresh Agridoot');

  const statusLifecycleSteps: { status: ServiceRequestStatus; label: string }[] = [
    { status: 'SUBMITTED', label: '1. Submitted' },
    { status: 'ASSIGNED', label: '2. Assigned' },
    { status: 'FIELD_VISIT', label: '3. Field Visit' },
    { status: 'LAB_VERIFICATION', label: '4. Lab Check' },
    { status: 'APPROVED', label: '5. Approved' },
    { status: 'COMPLETED', label: '6. Completed' },
  ];

  const toggleChecklist = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isCompleted: !item.isCompleted } : item))
    );
  };

  const handleExecuteStatusTransition = () => {
    const { updatedRequest } = ServiceRequestEngineService.transitionStatus(
      request,
      targetStatus,
      'Field inspection report verified and status updated',
      assigneeName
    );

    setRequest(updatedRequest);
    setTransitioning(false);
    alert(`Service Request Status Updated to: ${targetStatus}`);
  };

  return (
    <div className="space-y-6 text-xs text-slate-900">
      {/* Detail Header Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-extrabold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200 text-xs">
                {request.requestCode}
              </span>
              {request.caseInfo && (
                <span className="text-xs font-mono text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded border border-purple-200 font-bold">
                  {request.caseInfo.caseCode}
                </span>
              )}
              {request.isOverdue && (
                <span className="text-[10px] font-bold px-2 py-0.5 bg-red-900 text-white rounded border border-red-950 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-amber-400" /> EXPIRED SLA
                </span>
              )}
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 mt-1">{request.serviceName}</h2>
          </div>
        </div>

        <button
          onClick={() => setTransitioning(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Update Status / Assign</span>
        </button>
      </div>

      {/* Status Transition Control */}
      {transitioning && (
        <div className="bg-blue-50 p-5 rounded-2xl border border-blue-200 space-y-3">
          <h3 className="text-sm font-extrabold text-blue-950">Execute Status Transition / Staff Assignment</h3>
          <p className="text-xs text-blue-800">
            Update status for Request <strong>{request.requestCode}</strong> ({request.serviceName}).
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <select
              value={targetStatus}
              onChange={(e) => setTargetStatus(e.target.value as ServiceRequestStatus)}
              className="bg-white border border-blue-300 text-xs font-bold rounded-xl px-3 py-1.5 focus:outline-none"
            >
              <option value="ASSIGNED">2. ASSIGNED (To Field Staff)</option>
              <option value="FIELD_VISIT">3. FIELD_VISIT (Verification)</option>
              <option value="LAB_VERIFICATION">4. LAB_VERIFICATION (Agri Lab)</option>
              <option value="APPROVED">5. APPROVED (Coordinator)</option>
              <option value="COMPLETED">6. COMPLETED (Dispatched)</option>
            </select>

            <input
              type="text"
              placeholder="Assigned Staff Name..."
              value={assigneeName}
              onChange={(e) => setAssigneeName(e.target.value)}
              className="bg-white border border-blue-300 rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none"
            />

            <button
              onClick={handleExecuteStatusTransition}
              className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl text-xs shadow"
            >
              Confirm Status Transition
            </button>
            <button
              onClick={() => setTransitioning(false)}
              className="px-3 py-1.5 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Lifecycle Progression Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3 shadow-sm">
        <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
          Request Processing Lifecycle Progression
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          {statusLifecycleSteps.map((step, idx) => {
            const isCurrent = request.status === step.status;
            return (
              <div
                key={idx}
                className={`p-2.5 rounded-xl border text-center font-bold text-xs space-y-1 transition-all ${
                  isCurrent
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-300'
                    : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}
              >
                <div className="text-[10px] font-mono opacity-80">{step.label}</div>
                {isCurrent && <span className="text-[9px] bg-blue-800 px-1.5 py-0.2 rounded font-mono">ACTIVE</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Split Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Case Layer, Universal Checklist & SLA Summary */}
        <div className="space-y-4">
          {/* Case Layer Card */}
          {request.caseInfo && (
            <div className="bg-purple-50 p-4 rounded-2xl border border-purple-200 space-y-2 shadow-sm">
              <div className="flex justify-between items-center text-purple-900 font-bold">
                <span className="flex items-center gap-1.5">
                  <Layers3 className="w-4 h-4 text-purple-600" /> Case Management Layer
                </span>
                <span className="font-mono text-xs bg-purple-200 px-2 py-0.5 rounded text-purple-900">
                  {request.caseInfo.caseCode}
                </span>
              </div>
              <p className="text-xs text-purple-800">
                Case Type: <strong>{request.caseInfo.caseType}</strong> • Status: <strong>{request.caseInfo.status}</strong>
              </p>
            </div>
          )}

          {/* Universal Verification Checklist Component */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4 text-blue-600" /> Universal Verification Checklist
              </span>
              <span className="text-xs font-mono font-bold text-blue-600">
                {checklist.filter((c) => c.isCompleted).length} / {checklist.length}
              </span>
            </h3>

            <div className="space-y-2">
              {checklist.map((item) => (
                <div
                  key={item.id}
                  onClick={() => toggleChecklist(item.id)}
                  className={`p-2.5 rounded-xl border cursor-pointer flex items-center gap-2.5 transition-colors ${
                    item.isCompleted ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={item.isCompleted}
                    onChange={() => {}}
                    className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                  />
                  <span className="font-bold text-xs">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Applicant & SLA Summary */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              Applicant & SLA Summary
            </h3>

            <div className="space-y-2 text-xs text-slate-700">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Applicant Name:</span>
                <span className="font-bold text-slate-900">{request.applicantName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Permanent UPP ID:</span>
                <span className="font-mono font-bold text-blue-700">{request.applicantUppId}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Request Source:</span>
                <span className="font-mono font-bold text-purple-700">{request.requestSource}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Location:</span>
                <span className="font-bold text-slate-900">{request.district}, {request.taluka}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Assigned Staff:</span>
                <span className="font-bold text-slate-900">{request.assignedToName || 'Unassigned'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">SLA Deadline:</span>
                <span className="font-mono font-bold text-slate-900">
                  {new Date(request.slaDeadline).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Universal Timeline Engine Embedded */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              Universal Request Activity Stream & History
            </h3>
            <UniversalTimelineUI entityType="SERVICE_REQUEST" entityId={request.id} />
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Universal Service Request Directory UI Component (Enhanced Enterprise)
 * Location: /src/modules/requests/components/ServiceRequestDirectory.tsx
 * Features:
 * - Request Source Badges (Mobile App, Call Center, Portal, Office, API)
 * - 4-Level Advanced SLA Badges (Target, Warning, Critical, Expired)
 * - Case Abstraction Layer (CASE-2026-0048)
 * - Standard Service Catalog (SRV001–SRV004)
 */

import React, { useState } from 'react';
import { ServiceRequest, ServiceCode, ServiceRequestStatus, RequestSource, SlaStatusLevel } from '../types/service_request.types';
import { ServiceRequestEngineService } from '../services/ServiceRequestEngineService';
import { Search, Filter, Plus, ArrowRight, Clock, AlertTriangle, CheckCircle2, Shield, Wrench, FileText, FlaskConical, Smartphone, Laptop, PhoneCall, Building } from 'lucide-react';

interface ServiceRequestDirectoryProps {
  onSelectRequest: (req: ServiceRequest) => void;
}

export const ServiceRequestDirectory: React.FC<ServiceRequestDirectoryProps> = ({ onSelectRequest }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedServiceFilter, setSelectedServiceFilter] = useState<ServiceCode | 'ALL'>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<ServiceRequestStatus | 'ALL'>('ALL');
  const [selectedSourceFilter, setSelectedSourceFilter] = useState<RequestSource | 'ALL'>('ALL');

  const [requests, setRequests] = useState<ServiceRequest[]>([
    {
      id: 'r1',
      requestCode: 'MA-REQ-000154',
      serviceCode: 'SRV001',
      serviceName: 'Soil Testing Service',
      applicantUppId: 'UPP-000000125',
      applicantName: 'Ankita Suresh Deshmukh',
      caseInfo: {
        caseId: 'c-101',
        caseCode: 'CASE-2026-0048',
        caseType: 'SOIL_TESTING_CASE',
        status: 'OPEN',
        createdDate: '2026-07-22T10:00:00Z',
      },
      requestSource: 'MOBILE_APP',
      status: 'LAB_VERIFICATION',
      priority: 'HIGH',
      district: 'Pune District',
      taluka: 'Haveli',
      village: 'Manjari',
      slaDeadline: '2026-07-24T18:00:00Z',
      slaLevel: 'TARGET_SLA',
      isOverdue: false,
      checklist: [
        { id: 'ck1', label: 'Farmer Geotagged Photo', isCompleted: true },
        { id: 'ck2', label: 'Soil Sample QR Code Scan', isCompleted: true },
        { id: 'ck3', label: 'Lab Receipt Generated', isCompleted: false },
      ],
      assignedToName: 'Pune Agri Testing Lab',
      createdAt: '2026-07-22T10:00:00Z',
      updatedAt: '2026-07-22T14:00:00Z',
    },
    {
      id: 'r2',
      requestCode: 'MA-REQ-000155',
      serviceCode: 'SRV002',
      serviceName: 'Drone Spraying Drive',
      applicantUppId: 'UPP-000000124',
      applicantName: 'Sunil Dattatray Patil',
      caseInfo: {
        caseId: 'c-102',
        caseCode: 'CASE-2026-0049',
        caseType: 'DRONE_SPRAYING_CASE',
        status: 'IN_PROGRESS',
        createdDate: '2026-07-22T12:00:00Z',
      },
      requestSource: 'CALL_CENTER',
      status: 'ASSIGNED',
      priority: 'HIGH',
      district: 'Wardha District',
      taluka: 'Arvi',
      village: 'Wadona',
      slaDeadline: '2026-07-23T12:00:00Z',
      slaLevel: 'WARNING_SLA',
      isOverdue: false,
      checklist: [
        { id: 'ck1', label: 'Pilot Drone License Verified', isCompleted: true },
        { id: 'ck2', label: 'Acreage GPS Boundary Mapped', isCompleted: true },
      ],
      assignedToName: 'Suresh Agridoot',
      createdAt: '2026-07-22T12:00:00Z',
      updatedAt: '2026-07-22T13:00:00Z',
    },
    {
      id: 'r3',
      requestCode: 'MA-REQ-000156',
      serviceCode: 'SRV003',
      serviceName: 'EDP Skill Registration',
      applicantUppId: 'UPP-000000126',
      applicantName: 'Vikram Rajendra Shinde',
      caseInfo: {
        caseId: 'c-103',
        caseCode: 'CASE-2026-0050',
        caseType: 'SKILL_TRAINING_CASE',
        status: 'ESCALATED',
        createdDate: '2026-07-20T09:00:00Z',
      },
      requestSource: 'TALUKA_OFFICE',
      status: 'FIELD_VISIT',
      priority: 'CRITICAL',
      district: 'Nagpur District',
      taluka: 'Katol',
      slaDeadline: '2026-07-22T08:00:00Z',
      slaLevel: 'EXPIRED_SLA',
      isOverdue: true,
      checklist: [
        { id: 'ck1', label: 'Candidate Interview Completed', isCompleted: false },
      ],
      assignedToName: 'Ramesh Patil',
      createdAt: '2026-07-20T09:00:00Z',
      updatedAt: '2026-07-21T15:00:00Z',
    },
  ]);

  const filteredRequests = requests.filter((r) => {
    const matchesSearch =
      r.requestCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.applicantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.applicantUppId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.caseInfo && r.caseInfo.caseCode.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesService = selectedServiceFilter === 'ALL' || r.serviceCode === selectedServiceFilter;
    const matchesStatus = selectedStatusFilter === 'ALL' || r.status === selectedStatusFilter;
    const matchesSource = selectedSourceFilter === 'ALL' || r.requestSource === selectedSourceFilter;

    return matchesSearch && matchesService && matchesStatus && matchesSource;
  });

  const getSourceIcon = (source: RequestSource) => {
    switch (source) {
      case 'MOBILE_APP': return <Smartphone className="w-3 h-3 text-blue-600" />;
      case 'PORTAL_WEBSITE': return <Laptop className="w-3 h-3 text-purple-600" />;
      case 'CALL_CENTER': return <PhoneCall className="w-3 h-3 text-emerald-600" />;
      case 'TALUKA_OFFICE': return <Building className="w-3 h-3 text-amber-600" />;
      default: return <FileText className="w-3 h-3 text-slate-500" />;
    }
  };

  const getSlaBadge = (level: SlaStatusLevel) => {
    switch (level) {
      case 'TARGET_SLA':
        return <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded border border-emerald-200">Target SLA (On Track)</span>;
      case 'WARNING_SLA':
        return <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded border border-amber-200">Warning SLA (&lt;80% time)</span>;
      case 'CRITICAL_SLA':
        return <span className="text-[10px] font-bold px-2 py-0.5 bg-red-100 text-red-700 rounded border border-red-200">Critical SLA (&lt;95% time)</span>;
      case 'EXPIRED_SLA':
        return <span className="text-[10px] font-bold px-2 py-0.5 bg-red-900 text-white rounded border border-red-950 flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-amber-400" /> Expired & Escalated</span>;
    }
  };

  return (
    <div className="space-y-6 text-xs text-slate-900">
      {/* Directory Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-blue-600">
            Module 04: Universal Service Request Engine
          </span>
          <h2 className="text-xl font-extrabold text-slate-900 mt-0.5">Universal Service Requests Directory</h2>
          <p className="text-xs text-slate-500">Case Abstraction Layer, 4-Tier SLA Engine & Request Source Analytics</p>
        </div>

        <button
          onClick={() => {
            const reqCode = ServiceRequestEngineService.generateRequestCode();
            alert(`Created Service Request: ${reqCode}`);
          }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>+ Create Service Request</span>
        </button>
      </div>

      {/* Standard Service Catalog Cards Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { code: 'SRV001', name: 'Soil Testing', icon: FlaskConical, desc: '48hr SLA • Agri Lab' },
          { code: 'SRV002', name: 'Drone Spraying', icon: Wrench, desc: '24hr SLA • Tech Innovation' },
          { code: 'SRV003', name: 'EDP Skill Reg.', icon: FileText, desc: '72hr SLA • Capacity' },
          { code: 'SRV004', name: 'PMEGP Subsidy', icon: Shield, desc: '120hr SLA • Govt Aid' },
        ].map((sc) => (
          <div
            key={sc.code}
            onClick={() => setSelectedServiceFilter(sc.code as ServiceCode)}
            className={`p-3 rounded-2xl border cursor-pointer transition-all space-y-1 ${
              selectedServiceFilter === sc.code
                ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-300'
                : 'bg-white text-slate-900 border-slate-200 hover:border-blue-400'
            }`}
          >
            <div className="flex justify-between items-center">
              <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                selectedServiceFilter === sc.code ? 'bg-blue-800 text-white' : 'bg-slate-100 text-blue-700'
              }`}>
                {sc.code}
              </span>
              <sc.icon className="w-4 h-4" />
            </div>
            <p className="font-bold text-xs">{sc.name}</p>
            <p className={`text-[10px] ${selectedServiceFilter === sc.code ? 'text-blue-100' : 'text-slate-500'}`}>
              {sc.desc}
            </p>
          </div>
        ))}
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search Request (MA-REQ-000155), Case (CASE-2026-0048), UPP ID, or Name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-600"
          />
        </div>

        <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 font-bold">
          {(['ALL', 'SUBMITTED', 'ASSIGNED', 'FIELD_VISIT', 'LAB_VERIFICATION', 'COMPLETED'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                selectedStatusFilter === st ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Service Request Cards Queue */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRequests.map((r) => (
          <div
            key={r.id}
            onClick={() => onSelectRequest(r)}
            className={`bg-white p-5 rounded-2xl border cursor-pointer space-y-4 shadow-sm hover:shadow-md transition-all group ${
              r.isOverdue ? 'border-l-4 border-l-red-600 border-slate-200' : 'border-slate-200 hover:border-blue-500'
            }`}
          >
            {/* Header: Request Code, Case Link & SLA Status */}
            <div className="flex justify-between items-start">
              <div>
                <span className="font-mono font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-[11px]">
                  {r.requestCode}
                </span>
                {r.caseInfo && (
                  <span className="text-[10px] font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 font-bold ml-1">
                    {r.caseInfo.caseCode}
                  </span>
                )}
              </div>

              {getSlaBadge(r.slaLevel)}
            </div>

            {/* Service & Applicant Name */}
            <div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                {getSourceIcon(r.requestSource)}
                <span className="font-mono font-bold text-[10px]">{r.requestSource.replace('_', ' ')}</span>
              </div>

              <h3 className="text-base font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">
                {r.serviceName}
              </h3>
              <p className="text-xs text-slate-600 mt-0.5 font-medium">
                Applicant: <strong>{r.applicantName}</strong> ({r.applicantUppId})
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Location: {r.district}, {r.taluka}
              </p>
            </div>

            {/* Checklist Progress */}
            {r.checklist && (
              <div className="p-2 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="font-bold text-slate-700">Verification Checklist</span>
                  <span className="font-mono text-blue-600 font-bold">
                    {r.checklist.filter((c) => c.isCompleted).length} / {r.checklist.length} Completed
                  </span>
                </div>
              </div>
            )}

            {/* Assigned Staff & Footer */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[10px] text-slate-500">
                Assigned: <strong className="text-slate-800">{r.assignedToName || 'Unassigned'}</strong>
              </span>

              <div className="flex items-center gap-1 text-blue-600 font-bold text-xs group-hover:translate-x-0.5 transition-transform">
                <span>View Details</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

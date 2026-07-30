/**
 * Mission Board UI Component — Mission Execution Engine (MEE) (Enhanced Enterprise)
 * Location: /src/modules/mission/components/MissionBoard.tsx
 * Features:
 * - Real-Time Mission Analytics Dashboard KPI Bar
 * - Mission Templates Auto-Applier (Soil Testing vs Drone Spraying)
 * - Offline Conflict Resolution Controls (Keep Server, Keep Local, Merge, Review)
 * - Mission Retry & Escalation Engine
 */

import React, { useState } from 'react';
import { Mission, MissionStatus, ConflictResolutionMode } from '../types/mission.types';
import { MissionExecutionEngineService } from '../services/MissionExecutionEngineService';
import { Target, MapPin, CheckCircle2, Clock, Wifi, WifiOff, RefreshCw, Camera, QrCode, FileCheck, ArrowRight, Play, CheckSquare, ShieldCheck, UserCheck, AlertTriangle, AlertCircle, RotateCcw, BarChart3, Layers3 } from 'lucide-react';

interface MissionBoardProps {
  onSelectMission: (mission: Mission) => void;
}

export const MissionBoard: React.FC<MissionBoardProps> = ({ onSelectMission }) => {
  const [isOnDuty, setIsOnDuty] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('TPL-SOIL-01');
  const [conflictMode, setConflictMode] = useState<ConflictResolutionMode>('MERGE');
  const [hasConflict, setHasConflict] = useState(true);

  const [missions, setMissions] = useState<Mission[]>([
    {
      id: 'm1',
      missionCode: 'MSN-2026-00048',
      requestCode: 'MA-REQ-000154',
      caseCode: 'CASE-2026-0048',
      applicantUppId: 'UPP-000000125',
      applicantName: 'Ankita Suresh Deshmukh',
      templateCode: 'TPL-SOIL-01',
      serviceName: 'Soil Testing Service (Geotagged Sample Collection)',
      assignedStaffId: 'st-01',
      assignedStaffName: 'Suresh Agridoot',
      status: 'IN_PROGRESS',
      district: 'Pune District',
      taluka: 'Haveli',
      village: 'Manjari',
      targetAddress: 'Gat No. 142/A, Near Manjari Agri Research Station',
      gpsLatitude: 18.5204,
      gpsLongitude: 73.8567,
      tasks: [
        { id: 't1', taskName: 'Reach Farmer Field Location', taskSequence: 1, isCompleted: true },
        { id: 't2', taskName: 'Capture Geotagged Soil Sample Photo', taskSequence: 2, isCompleted: true },
        { id: 't3', taskName: 'Scan QR Code on Soil Sample Container', taskSequence: 3, isCompleted: false },
        { id: 't4', taskName: 'Obtain Digital Signature from Farmer', taskSequence: 4, isCompleted: false },
      ],
      scheduledDate: '2026-07-23T10:00:00Z',
      createdAt: '2026-07-22T10:00:00Z',
      updatedAt: '2026-07-23T09:30:00Z',
    },
    {
      id: 'm2',
      missionCode: 'MSN-2026-00049',
      requestCode: 'MA-REQ-000155',
      caseCode: 'CASE-2026-0049',
      applicantUppId: 'UPP-000000124',
      applicantName: 'Sunil Dattatray Patil',
      templateCode: 'TPL-DRONE-01',
      serviceName: 'Drone Spraying Drive (5 Acres Spray Verification)',
      assignedStaffId: 'st-01',
      assignedStaffName: 'Suresh Agridoot',
      status: 'SCHEDULED',
      district: 'Wardha District',
      taluka: 'Arvi',
      village: 'Wadona',
      targetAddress: 'Cotton Field, Wadona Village',
      scheduledDate: '2026-07-23T14:00:00Z',
      tasks: [
        { id: 't1', taskName: 'Inspect Drone Pilot DGCA License', taskSequence: 1, isCompleted: false },
        { id: 't2', taskName: 'Verify Spraying Chemical Batch & Dilution', taskSequence: 2, isCompleted: false },
        { id: 't3', taskName: 'Map Acreage Boundary via Live GPS', taskSequence: 3, isCompleted: false },
      ],
      createdAt: '2026-07-22T12:00:00Z',
      updatedAt: '2026-07-22T12:00:00Z',
    },
    {
      id: 'm3',
      missionCode: 'MSN-2026-00050',
      requestCode: 'MA-REQ-000156',
      caseCode: 'CASE-2026-0050',
      applicantUppId: 'UPP-000000126',
      applicantName: 'Vikram Rajendra Shinde',
      templateCode: 'TPL-SOIL-01',
      serviceName: 'EDP Field Verification Drive',
      assignedStaffId: 'st-02',
      assignedStaffName: 'Ramesh Patil',
      status: 'FAILED',
      retryCount: 2,
      district: 'Nagpur District',
      taluka: 'Katol',
      village: 'Katol City',
      targetAddress: 'Shop No 14, Main Market, Katol',
      scheduledDate: '2026-07-22T08:00:00Z',
      tasks: [
        { id: 't1', taskName: 'Verify Business Premises', taskSequence: 1, isCompleted: true },
        { id: 't2', taskName: 'Obtain Land Lease Deed', taskSequence: 2, isCompleted: false },
      ],
      createdAt: '2026-07-20T09:00:00Z',
      updatedAt: '2026-07-22T11:00:00Z',
    }
  ]);

  const analytics = MissionExecutionEngineService.computeAnalytics(missions);

  const handleRetryMission = (missionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setMissions(prev =>
      prev.map(m => {
        if (m.id === missionId) {
          const retried = MissionExecutionEngineService.retryMission(m, 'Reassigned Field Tech');
          alert(`Mission ${m.missionCode} queued for Retry (Attempt ${retried.retryCount}).`);
          return retried;
        }
        return m;
      })
    );
  };

  const handleCreateMissionFromTemplate = () => {
    const tpl = MissionExecutionEngineService.MISSION_TEMPLATES[selectedTemplate];
    const newMsnCode = MissionExecutionEngineService.generateMissionCode();

    const newMission: Mission = {
      id: `m-${Date.now()}`,
      missionCode: newMsnCode,
      requestCode: 'MA-REQ-000157',
      caseCode: 'CASE-2026-0051',
      applicantUppId: 'UPP-000000127',
      applicantName: 'Ramesh Balaji Gokhale',
      templateCode: tpl.templateCode,
      serviceName: tpl.templateName,
      assignedStaffId: 'st-01',
      assignedStaffName: 'Suresh Agridoot',
      status: 'SCHEDULED',
      district: 'Pune District',
      taluka: 'Haveli',
      targetAddress: 'Village Field Spot #12',
      tasks: tpl.defaultTasks.map((tName, i) => ({
        id: `t-${i}`,
        taskName: tName,
        taskSequence: i + 1,
        isCompleted: false
      })),
      scheduledDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setMissions([newMission, ...missions]);
    alert(`Created Mission ${newMsnCode} using Template ${tpl.templateCode}!`);
  };

  return (
    <div className="space-y-6 text-xs text-slate-900">
      {/* Banner & Duty Control */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-blue-600">
              Module 05: Mission Execution Engine (MEE)
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-mono">
              v1.3.0-alpha Enterprise
            </span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 mt-0.5">Field Personnel Mission Execution Board</h2>
          <p className="text-xs text-slate-500">Live GPS Geofencing, Cryptographic Evidence Validation & Conflict Resolution</p>
        </div>

        {/* Duty Status & Network Toggle Bar */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsOffline(!isOffline)}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 border transition-all ${
              isOffline
                ? 'bg-amber-500 text-white border-amber-600 shadow'
                : 'bg-emerald-50 text-emerald-800 border-emerald-300'
            }`}
          >
            {isOffline ? <WifiOff className="w-4 h-4" /> : <Wifi className="w-4 h-4" />}
            <span>{isOffline ? 'Offline Mode Active' : 'Online Connected'}</span>
          </button>

          <button
            onClick={() => setIsOnDuty(!isOnDuty)}
            className={`px-4 py-1.5 rounded-xl font-extrabold text-xs flex items-center gap-1.5 shadow transition-all ${
              isOnDuty
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>{isOnDuty ? 'ON DUTY (Active Field)' : 'OFF DUTY'}</span>
          </button>
        </div>
      </div>

      {/* ─── REAL-TIME MISSION ANALYTICS KPI BAR ────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          { label: 'Total Missions', val: analytics.totalMissions, color: 'text-slate-900', bg: 'bg-white' },
          { label: 'Completed', val: analytics.completed, color: 'text-emerald-600', bg: 'bg-emerald-50/50' },
          { label: 'Pending', val: analytics.pending, color: 'text-blue-600', bg: 'bg-blue-50/50' },
          { label: 'Failed', val: analytics.failed, color: 'text-red-600', bg: 'bg-red-50/50' },
          { label: 'Offline Queued', val: analytics.offlineQueued, color: 'text-amber-600', bg: 'bg-amber-50/50' },
          { label: 'Overdue', val: analytics.overdue, color: 'text-rose-600', bg: 'bg-rose-50/50' },
          { label: 'Avg Time (m)', val: `${analytics.avgCompletionTimeMinutes}m`, color: 'text-purple-600', bg: 'bg-purple-50/50' },
          { label: 'Evidence Score', val: `${analytics.evidenceScorePercentage}%`, color: 'text-emerald-700', bg: 'bg-emerald-50' },
        ].map((kpi, idx) => (
          <div key={idx} className={`${kpi.bg} p-3 rounded-2xl border border-slate-200 text-center space-y-0.5 shadow-sm`}>
            <p className="text-[10px] text-slate-500 font-bold uppercase">{kpi.label}</p>
            <p className={`text-lg font-black ${kpi.color}`}>{kpi.val}</p>
          </div>
        ))}
      </div>

      {/* Template Auto-Applier & Conflict Resolution Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Mission Template Auto-Applier */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2 shadow-sm">
          <div className="flex justify-between items-center text-xs font-bold text-slate-900">
            <span className="flex items-center gap-1.5">
              <Layers3 className="w-4 h-4 text-blue-600" /> Mission Template Engine
            </span>
            <span className="text-[10px] font-mono text-slate-400">Pre-configured Rules</span>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className="flex-1 bg-slate-50 border border-slate-200 text-xs font-bold rounded-xl px-3 py-1.5 focus:outline-none"
            >
              <option value="TPL-SOIL-01">🌱 Soil Sample Collection Template (TPL-SOIL-01)</option>
              <option value="TPL-DRONE-01">🚁 Drone Spraying Verification Template (TPL-DRONE-01)</option>
            </select>

            <button
              onClick={handleCreateMissionFromTemplate}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shrink-0 shadow"
            >
              + Create from Template
            </button>
          </div>
        </div>

        {/* Offline Conflict Resolution Engine */}
        {hasConflict && (
          <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 space-y-2 shadow-sm">
            <div className="flex justify-between items-center text-xs font-bold text-amber-900">
              <span className="flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" /> Offline Conflict Resolution Engine
              </span>
              <button onClick={() => setHasConflict(false)} className="text-[10px] text-amber-700 hover:underline">
                Dismiss
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-[11px] text-amber-800">Resolution Mode:</span>
              <select
                value={conflictMode}
                onChange={(e) => setConflictMode(e.target.value as ConflictResolutionMode)}
                className="bg-white border border-amber-300 text-xs font-bold rounded-xl px-2 py-1 text-amber-900 focus:outline-none"
              >
                <option value="KEEP_SERVER">Keep Server (Authoritative)</option>
                <option value="KEEP_LOCAL">Keep Local (Override Server)</option>
                <option value="MERGE">Merge Non-Conflicting Fields</option>
                <option value="MANUAL_REVIEW">Manual Review (Escalate to District Coord)</option>
              </select>

              <button
                onClick={() => {
                  const res = MissionExecutionEngineService.resolveOfflineConflict(
                    { id: 'q1', missionCode: 'MSN-2026-00048', payloadJson: {}, syncStatus: 'CONFLICT', retryCount: 1, queuedAt: '' },
                    conflictMode
                  );
                  alert(`Resolved Conflict: ${res.actionTaken}`);
                  setHasConflict(false);
                }}
                className="px-3 py-1 bg-amber-700 hover:bg-amber-800 text-white font-bold rounded-xl text-xs shrink-0 shadow"
              >
                Resolve Conflict
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mission Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {missions.map((m) => (
          <div
            key={m.id}
            onClick={() => onSelectMission(m)}
            className={`bg-white p-5 rounded-2xl border cursor-pointer space-y-4 shadow-sm hover:shadow-md transition-all group ${
              m.status === 'FAILED'
                ? 'border-l-4 border-l-red-600 border-slate-200'
                : 'border-slate-200 hover:border-blue-500'
            }`}
          >
            {/* Header: Mission Code, Template & Status */}
            <div className="flex justify-between items-start">
              <div>
                <span className="font-mono font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-[11px]">
                  {m.missionCode}
                </span>
                {m.templateCode && (
                  <span className="text-[10px] font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 font-bold ml-1">
                    {m.templateCode}
                  </span>
                )}
              </div>

              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                  m.status === 'FAILED'
                    ? 'bg-red-100 text-red-800 border-red-200'
                    : m.status === 'IN_PROGRESS'
                    ? 'bg-blue-100 text-blue-800 border-blue-200'
                    : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                {m.status}
              </span>
            </div>

            {/* Service & Farmer Name */}
            <div>
              <h3 className="text-base font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">
                {m.serviceName}
              </h3>
              <p className="text-xs text-slate-600 mt-0.5 font-medium">
                Farmer: <strong>{m.applicantName}</strong> ({m.applicantUppId})
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-red-500" /> {m.targetAddress}
              </p>
            </div>

            {/* Task Progression Counter */}
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
              <div className="flex justify-between items-center text-[10px] font-bold">
                <span className="text-slate-700">Mission Sub-Task Progress</span>
                <span className="text-blue-600 font-mono">
                  {m.tasks.filter((t) => t.isCompleted).length} / {m.tasks.length} Completed
                </span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-blue-600 h-full rounded-full transition-all"
                  style={{ width: `${(m.tasks.filter((t) => t.isCompleted).length / m.tasks.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Retry Action or Execute */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[10px] text-slate-500 font-mono">
                Assigned: <strong className="text-slate-800">{m.assignedStaffName}</strong>
              </span>

              {m.status === 'FAILED' ? (
                <button
                  onClick={(e) => handleRetryMission(m.id, e)}
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl flex items-center gap-1 shadow"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Retry Mission ({m.retryCount || 0}/3)</span>
                </button>
              ) : (
                <div className="flex items-center gap-1 text-blue-600 font-bold text-xs group-hover:translate-x-0.5 transition-transform">
                  <span>Execute Mission</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

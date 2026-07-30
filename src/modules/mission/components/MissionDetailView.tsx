/**
 * Mission Detail View UI Component — Mission Execution Engine (MEE) (Enhanced Enterprise)
 * Location: /src/modules/mission/components/MissionDetailView.tsx
 * Features:
 * - Evidence Validation Engine Rules (<5m GPS, <2min Photo Age, Signature, QR Code)
 * - Task Breakdown with Real-Time Validation Badges
 * - Embedded Universal Timeline UI Component
 */

import React, { useState } from 'react';
import { Mission, MissionTask, EvidenceBundle, EvidenceValidationRules } from '../types/mission.types';
import { MissionExecutionEngineService } from '../services/MissionExecutionEngineService';
import { UniversalTimelineUI } from '../../../core/components/UniversalTimelineUI';
import { ArrowLeft, MapPin, CheckCircle2, Clock, Camera, QrCode, FileCheck, RefreshCw, Lock, ShieldCheck, CheckSquare, Layers3, AlertTriangle, AlertCircle, XCircle } from 'lucide-react';

interface MissionDetailViewProps {
  mission: Mission;
  onBack: () => void;
}

export const MissionDetailView: React.FC<MissionDetailViewProps> = ({ mission: initialMission, onBack }) => {
  const [mission, setMission] = useState<Mission>(initialMission);
  const [tasks, setTasks] = useState<MissionTask[]>(initialMission.tasks);
  const [evidence, setEvidence] = useState<EvidenceBundle | undefined>(initialMission.evidence);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Simulation State Inputs for Evidence Capture
  const [simulatedGpsAccuracy, setSimulatedGpsAccuracy] = useState<number>(3.2); // 3.2m
  const [simulatedPhotoAgeMins, setSimulatedPhotoAgeMins] = useState<number>(0.5); // 0.5 mins
  const [simulatedQr, setSimulatedQr] = useState<string>('QR-SOIL-MAHA-90124');
  const [simulatedSignature, setSimulatedSignature] = useState<string>('SIG-FARMER-8901');

  const activeRules: EvidenceValidationRules = mission.validationRules || {
    maxGpsAccuracyMeters: 5.0,
    maxPhotoAgeMinutes: 2.0,
    requireSignature: true,
    requireQrCode: true,
  };

  const toggleTask = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, isCompleted: !t.isCompleted, completedAt: new Date().toISOString() } : t))
    );
  };

  const handleCaptureEvidenceBundle = () => {
    const photoTime = new Date(Date.now() - simulatedPhotoAgeMins * 60 * 1000).toISOString();

    const bundle = MissionExecutionEngineService.validateAndCaptureEvidence(
      mission.id,
      18.5204,
      73.8567,
      simulatedGpsAccuracy,
      'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?w=600&auto=format&fit=crop&q=60',
      photoTime,
      simulatedQr || undefined,
      simulatedSignature || undefined,
      activeRules
    );

    setEvidence(bundle);
    setValidationErrors(bundle.validationErrors || []);

    if (bundle.validationPassed) {
      const completed = MissionExecutionEngineService.completeMission(mission, bundle);
      setMission(completed);
      alert('Cryptographic Evidence Bundle Passed All Validation Rules! Mission Completed.');
    } else {
      alert(`Evidence Validation Failed with ${bundle.validationErrors?.length} rule error(s).`);
    }
  };

  return (
    <div className="space-y-6 text-xs text-slate-900">
      {/* Header Bar */}
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
                {mission.missionCode}
              </span>
              <span className="text-xs font-mono text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded border border-purple-200 font-bold">
                {mission.caseCode}
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                  mission.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                }`}
              >
                {mission.status}
              </span>
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 mt-1">{mission.serviceName}</h2>
          </div>
        </div>

        <button
          onClick={handleCaptureEvidenceBundle}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow transition-all"
        >
          <Camera className="w-4 h-4" />
          <span>Validate & Capture Evidence</span>
        </button>
      </div>

      {/* Validation Rules Card */}
      <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1">
          <span className="text-[10px] font-mono text-blue-400 font-extrabold uppercase tracking-wider">
            Template Evidence Validation Rules
          </span>
          <p className="text-xs text-slate-300 font-bold">
            GPS Accuracy &lt; {activeRules.maxGpsAccuracyMeters}m • Photo Age &lt; {activeRules.maxPhotoAgeMinutes}m • Signature Required ({activeRules.requireSignature ? 'Yes' : 'No'}) • QR Scan Required ({activeRules.requireQrCode ? 'Yes' : 'No'})
          </p>
        </div>

        {/* Evidence Simulator Controls */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800 text-[11px]">
          <div className="flex items-center gap-1">
            <span className="text-slate-400">GPS Acc:</span>
            <input
              type="number"
              step="0.5"
              value={simulatedGpsAccuracy}
              onChange={(e) => setSimulatedGpsAccuracy(parseFloat(e.target.value))}
              className="w-14 bg-slate-800 text-emerald-400 font-mono font-bold px-1.5 py-0.5 rounded text-center"
            />
            <span className="text-slate-500">m</span>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-slate-400">Photo Age:</span>
            <input
              type="number"
              step="0.5"
              value={simulatedPhotoAgeMins}
              onChange={(e) => setSimulatedPhotoAgeMins(parseFloat(e.target.value))}
              className="w-14 bg-slate-800 text-amber-400 font-mono font-bold px-1.5 py-0.5 rounded text-center"
            />
            <span className="text-slate-500">m</span>
          </div>
        </div>
      </div>

      {/* Validation Error Alert */}
      {validationErrors.length > 0 && (
        <div className="bg-red-50 p-4 rounded-2xl border border-red-200 space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-red-900">
            <XCircle className="w-4 h-4 text-red-600" />
            <span>Evidence Validation Failed ({validationErrors.length} Rule Violation/s):</span>
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-xs text-red-800 pl-2">
            {validationErrors.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Split Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Sub-Tasks & Cryptographic Evidence Bundle */}
        <div className="space-y-4">
          {/* Sub-Task Checklist */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4 text-blue-600" /> Mission Sub-Tasks
              </span>
              <span className="text-xs font-mono font-bold text-blue-600">
                {tasks.filter((t) => t.isCompleted).length} / {tasks.length}
              </span>
            </h3>

            <div className="space-y-2">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => toggleTask(task.id)}
                  className={`p-2.5 rounded-xl border cursor-pointer flex items-center gap-2.5 transition-colors ${
                    task.isCompleted ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={task.isCompleted}
                    onChange={() => {}}
                    className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                  />
                  <span className="font-bold text-xs">{task.taskName}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Cryptographic Evidence Viewer */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> Cryptographic Evidence Bundle
              </span>
              {evidence && (
                <span
                  className={`text-[9px] font-bold px-2 py-0.5 rounded font-mono ${
                    evidence.validationPassed
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {evidence.validationPassed ? 'PASSED RULES' : 'FAILED RULES'}
                </span>
              )}
            </h3>

            {evidence ? (
              <div className="space-y-2 text-xs">
                <div className="p-2 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <p className="font-bold text-slate-900 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-red-500" /> Geotagged Coordinates
                  </p>
                  <p className="font-mono text-[10px] text-slate-600">
                    Lat: {evidence.gpsLatitude} • Lng: {evidence.gpsLongitude} (±{evidence.gpsAccuracyMeters}m)
                  </p>
                </div>

                <div className="p-2 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <p className="font-bold text-slate-900 flex items-center gap-1">
                    <QrCode className="w-3 h-3 text-purple-600" /> Scanned QR Data
                  </p>
                  <p className="font-mono text-[10px] text-purple-700 font-bold">{evidence.qrCodeData || 'N/A'}</p>
                </div>

                <div className="p-2 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <p className="font-bold text-slate-900 flex items-center gap-1">
                    <FileCheck className="w-3 h-3 text-blue-600" /> Digital Signature
                  </p>
                  <p className="font-mono text-[10px] text-blue-700 font-bold">{evidence.digitalSignatureUrl || 'N/A'}</p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">No evidence bundle captured yet. Click 'Validate & Capture Evidence' to test.</p>
            )}
          </div>
        </div>

        {/* Right Column: Universal Timeline Engine Embedded */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              Mission Execution Activity Stream & Timeline
            </h3>
            <UniversalTimelineUI entityType="MISSION" entityId={mission.id} />
          </div>
        </div>
      </div>
    </div>
  );
};

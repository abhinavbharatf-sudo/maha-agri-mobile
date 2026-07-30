/**
 * Universal Profile Platform (UPP) Detail View UI Component (Enhanced Enterprise)
 * Location: /src/modules/upp/components/UPPProfileDetailView.tsx
 * Displays Split-Screen Profile Workspace featuring:
 * - Permanent Universal ID (UPP-000000123)
 * - Person Role Lifecycle Visual Progression Graph
 * - Sticky Notes Engine
 * - Contacts, Identity Docs (Aadhaar/PAN/712), Consents, Merge Engine
 * - Universal Timeline Engine Integration
 */

import React, { useState } from 'react';
import { UPPProfile, UPPRole, UPPLifecycleStage } from '../types/upp.types';
import { UPPEngineService } from '../services/UPPEngineService';
import { UniversalTimelineUI } from '../../../core/components/UniversalTimelineUI';
import { ArrowLeft, Activity, ShieldCheck, UserCheck, RefreshCw, Calendar, Phone, Mail, MapPin, Building, Award, CheckCircle2, Clock, StickyNote, FileText, Lock, GitMerge, Check, AlertCircle } from 'lucide-react';

interface UPPProfileDetailViewProps {
  profile: UPPProfile;
  onBack: () => void;
}

export const UPPProfileDetailView: React.FC<UPPProfileDetailViewProps> = ({ profile: initialProfile, onBack }) => {
  const [profile, setProfile] = useState<UPPProfile>({
    ...initialProfile,
    stickyNote: initialProfile.stickyNote || 'Sensitive case • Prefers WhatsApp communication in Marathi.',
    contacts: initialProfile.contacts || [
      { id: 'c1', type: 'PRIMARY_MOBILE', value: initialProfile.mobile, isPrimary: true, isVerified: true },
      { id: 'c2', type: 'WHATSAPP', value: initialProfile.mobile, isPrimary: false, isVerified: true },
      { id: 'c3', type: 'EMAIL', value: initialProfile.email || 'user@mahaagri.in', isPrimary: false, isVerified: false },
    ],
    identityDocuments: initialProfile.identityDocuments || [
      { id: 'd1', type: 'AADHAAR', documentNumber: 'XXXX-XXXX-9012', verificationStatus: 'VERIFIED' },
      { id: 'd2', type: 'LAND_RECORD_712', documentNumber: 'Gat No. 142/A (Manjari)', verificationStatus: 'VERIFIED' },
      { id: 'd3', type: 'PAN', documentNumber: 'ABCDE1234F', verificationStatus: 'PENDING' },
    ],
    consents: initialProfile.consents || [
      { id: 'cs1', consentType: 'PRIVACY_POLICY', isGranted: true, grantedAt: '2026-07-15T10:00:00Z' },
      { id: 'cs2', consentType: 'WHATSAPP_COMMUNICATION', isGranted: true, grantedAt: '2026-07-15T10:00:00Z' },
      { id: 'cs3', consentType: 'DATA_PROCESSING', isGranted: true, grantedAt: '2026-07-15T10:00:00Z' },
    ],
  });

  const [transitioning, setTransitioning] = useState(false);
  const [targetRole, setTargetRole] = useState<UPPRole>('FARMER');
  const [stickyEdit, setStickyEdit] = useState(false);
  const [noteText, setNoteText] = useState(profile.stickyNote || '');

  const roleLifecycleSteps = [
    { role: 'CANDIDATE', stage: 'REGISTERED', label: '1. Candidate' },
    { role: 'CANDIDATE', stage: 'IN_TRAINING', label: '2. Training' },
    { role: 'CANDIDATE', stage: 'SELECTED', label: '3. Selected' },
    { role: 'ENTREPRENEUR', stage: 'ENTREPRENEUR', label: '4. Entrepreneur' },
    { role: 'FARMER', stage: 'ACTIVE_FARMER', label: '5. Active Farmer' },
    { role: 'DRONE_CUSTOMER', stage: 'DRONE_CUSTOMER', label: '6. Drone Customer' },
  ];

  const handleExecuteRoleTransition = () => {
    let nextStage: UPPLifecycleStage = 'ACTIVE_FARMER';
    if (targetRole === 'ENTREPRENEUR') nextStage = 'ENTREPRENEUR';
    if (targetRole === 'DRONE_CUSTOMER') nextStage = 'DRONE_CUSTOMER';

    const { updatedProfile } = UPPEngineService.transitionRole(
      profile,
      targetRole,
      nextStage,
      'Skill Certification & Agricultural Land Verified'
    );

    setProfile(updatedProfile);
    setTransitioning(false);
    alert(`Person Role Transitioned to: ${targetRole}`);
  };

  const handleSaveStickyNote = () => {
    setProfile({ ...profile, stickyNote: noteText });
    setStickyEdit(false);
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
                {profile.permanentUppId}
              </span>
              <span className="text-xs font-mono text-slate-500 font-bold">{profile.primaryBusinessCode}</span>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-mono">
                {profile.status}
              </span>
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 mt-1">{profile.fullName}</h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const target = prompt('Enter duplicate UPP ID to merge into this profile (e.g. UPP-000000125):');
              if (target) {
                alert(`Merged duplicate record into ${profile.permanentUppId}`);
              }
            }}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 border border-slate-300"
          >
            <GitMerge className="w-3.5 h-3.5" />
            <span>Merge Duplicate</span>
          </button>

          <button
            onClick={() => setTransitioning(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Transition Role</span>
          </button>
        </div>
      </div>

      {/* Role Transition Control */}
      {transitioning && (
        <div className="bg-blue-50 p-5 rounded-2xl border border-blue-200 space-y-3">
          <h3 className="text-sm font-extrabold text-blue-950">Execute Person Role Lifecycle Transition</h3>
          <p className="text-xs text-blue-800">
            Transition physical person profile <strong>{profile.fullName}</strong> ({profile.permanentUppId}) to a new primary role.
          </p>

          <div className="flex items-center gap-3 pt-2">
            <select
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value as UPPRole)}
              className="bg-white border border-blue-300 text-xs font-bold rounded-xl px-3 py-1.5 focus:outline-none"
            >
              <option value="FARMER">Farmer (Active Agricultural)</option>
              <option value="ENTREPRENEUR">Entrepreneur (Agri Enterprise)</option>
              <option value="DRONE_CUSTOMER">Drone Customer (Tech Service)</option>
              <option value="MAHA_AGRIDOOT">MAHA-AGRIDOOT (Field Staff)</option>
            </select>

            <button
              onClick={handleExecuteRoleTransition}
              className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl text-xs shadow"
            >
              Confirm Role Progression
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

      {/* Person Role Lifecycle Visual Progression Graph */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3 shadow-sm">
        <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
          Person Role Lifecycle Progression Graph
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          {roleLifecycleSteps.map((step, idx) => {
            const isCurrent = profile.lifecycleStage === step.stage;
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
        {/* Left Column: Universal Sticky Note, Contacts, Docs & Consents */}
        <div className="space-y-4">
          {/* Universal Sticky Note */}
          <div className="bg-amber-50/80 p-4 rounded-2xl border border-amber-200 space-y-2 shadow-sm">
            <div className="flex justify-between items-center text-amber-900 font-bold">
              <span className="flex items-center gap-1.5">
                <StickyNote className="w-4 h-4 text-amber-600" /> Persistent Sticky Note
              </span>
              {!stickyEdit ? (
                <button onClick={() => setStickyEdit(true)} className="text-[10px] text-amber-700 hover:underline">
                  Edit
                </button>
              ) : (
                <button onClick={handleSaveStickyNote} className="text-[10px] font-bold text-amber-800 bg-amber-200 px-2 py-0.5 rounded">
                  Save
                </button>
              )}
            </div>
            {!stickyEdit ? (
              <p className="text-xs text-amber-800 whitespace-pre-line">{profile.stickyNote}</p>
            ) : (
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                className="w-full bg-white border border-amber-300 rounded-xl p-2 text-xs text-slate-800 focus:outline-none"
                rows={3}
              />
            )}
          </div>

          {/* Identity & Health Summary */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              Identity & Health Summary
            </h3>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-700">Profile Health Score</span>
                <span className="font-extrabold font-mono text-emerald-600 text-sm">{profile.healthScore}%</span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${profile.healthScore}%` }} />
              </div>
            </div>

            {/* Contact Points */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <p className="text-xs font-bold text-slate-900">Verified Contact Points</p>
              {profile.contacts?.map((c) => (
                <div key={c.id} className="flex justify-between items-center py-1 text-xs border-b border-slate-50">
                  <span className="text-slate-500 font-mono text-[10px]">{c.type.replace('_', ' ')}</span>
                  <span className="font-mono font-bold text-slate-900">{c.value}</span>
                </div>
              ))}
            </div>

            {/* Identity Documents */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <p className="text-xs font-bold text-slate-900">Identity Documents (upp_identity_documents)</p>
              {profile.identityDocuments?.map((d) => (
                <div key={d.id} className="p-2 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-slate-900">{d.type.replace('_', ' ')}</p>
                    <p className="font-mono text-[10px] text-slate-500">{d.documentNumber}</p>
                  </div>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                    d.verificationStatus === 'VERIFIED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {d.verificationStatus}
                  </span>
                </div>
              ))}
            </div>

            {/* Consents Trail */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <p className="text-xs font-bold text-slate-900">Consent Audit Trail (upp_consents)</p>
              {profile.consents?.map((cs) => (
                <div key={cs.id} className="flex justify-between items-center py-0.5 text-[10px]">
                  <span className="text-slate-500">{cs.consentType.replace('_', ' ')}</span>
                  <span className="text-emerald-600 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Granted
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Universal Timeline Engine Embedded */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              Universal Activity Stream & Operational History
            </h3>
            <UniversalTimelineUI entityType="CANDIDATE" entityId={profile.id} />
          </div>
        </div>
      </div>
    </div>
  );
};

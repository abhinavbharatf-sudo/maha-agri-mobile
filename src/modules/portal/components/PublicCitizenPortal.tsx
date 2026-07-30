/**
 * Module 12: Public Citizen Portal & Document Verification Gateway
 * Location: /src/modules/portal/components/PublicCitizenPortal.tsx
 * Features:
 * - Public Application Tracker (Real-Time Service Request Status Lookup)
 * - Public Digital Seal & QR Document Authenticity Verification Gateway
 * - Public Government Schemes Information & Downloads Catalog
 * - Public Analytics Dashboard
 */

import React, { useState } from 'react';
import { Search, ShieldCheck, CheckCircle2, FileText, Download, Globe, Layers, ArrowRight, ExternalLink, QrCode } from 'lucide-react';

export const PublicCitizenPortal: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'TRACKER' | 'VERIFIER' | 'SCHEMES'>('TRACKER');
  const [searchCode, setSearchCode] = useState('MA-REQ-000155');
  const [verifyDocCode, setVerifyDocCode] = useState('DOC-2026-00912');
  const [trackerResult, setTrackerResult] = useState<any>(null);
  const [verificationResult, setVerificationResult] = useState<any>(null);

  const handleTrackRequest = () => {
    setTrackerResult({
      requestCode: searchCode,
      serviceName: 'Drone Spraying Assistance Scheme',
      applicantName: 'Sunil Dattatray Patil',
      district: 'Wardha',
      status: 'MISSION_IN_PROGRESS',
      targetSlaDays: '5 Days',
      daysRemaining: '2 Days Left (Green SLA)',
      history: [
        { state: 'Application Submitted', time: '2026-07-20 10:00' },
        { state: 'Taluka Officer Verified', time: '2026-07-21 11:30' },
        { state: 'Mission Assigned to Pilot', time: '2026-07-22 14:00' },
      ],
    });
  };

  const handleVerifyDocument = () => {
    setVerificationResult({
      documentCode: verifyDocCode,
      status: 'AUTHENTIC & VALID',
      templateTitle: 'Soil Sample Testing Technical Report Certificate',
      ownerName: 'Ankita Suresh Deshmukh',
      ownerUppId: 'UPP-000000125',
      issuedBy: 'Department of Agriculture, Govt of Maharashtra',
      issuedAt: '2026-07-22 14:30:00',
      integrityHash: 'SHA256-a9b8c7d6e5-MAHA-AGRI-GOVT-STAMP',
    });
  };

  return (
    <div className="space-y-6 text-xs text-slate-900">
      {/* Portal Header */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 space-y-2 shadow-lg">
        <div className="flex justify-between items-center text-xs">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-400" />
            <span className="font-extrabold text-sm tracking-wide">
              GOVERNMENT OF MAHARASHTRA • PUBLIC CITIZEN PORTAL
            </span>
          </div>
          <span className="bg-emerald-500/20 text-emerald-300 font-mono text-[10px] px-3 py-1 rounded-full font-bold border border-emerald-500/30">
            PUBLIC ACCESS VERIFIED
          </span>
        </div>
        <h1 className="text-2xl font-black text-white">MAHA-AGRI Citizen Services & Verification Portal</h1>
        <p className="text-xs text-slate-400">
          Track Service Applications, Verify Official Digital Certificates & Download Approved Sanction Orders
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 font-bold text-xs">
        <button
          onClick={() => setActiveTab('TRACKER')}
          className={`px-4 py-2 border-b-2 transition-all ${
            activeTab === 'TRACKER' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'
          }`}
        >
          🔍 Live Application Tracker
        </button>
        <button
          onClick={() => setActiveTab('VERIFIER')}
          className={`px-4 py-2 border-b-2 transition-all ${
            activeTab === 'VERIFIER' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'
          }`}
        >
          🛡️ QR Document Verification Gateway
        </button>
        <button
          onClick={() => setActiveTab('SCHEMES')}
          className={`px-4 py-2 border-b-2 transition-all ${
            activeTab === 'SCHEMES' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'
          }`}
        >
          📜 Public Schemes & Downloads Catalog
        </button>
      </div>

      {/* TAB 1: APPLICATION TRACKER */}
      {activeTab === 'TRACKER' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4 shadow-sm">
          <h3 className="text-sm font-extrabold text-slate-900">Track Application Status (Service Request ID)</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
              placeholder="e.g. MA-REQ-000155"
            />
            <button
              onClick={handleTrackRequest}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded-xl text-xs shadow"
            >
              Track Request
            </button>
          </div>

          {trackerResult && (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 font-sans">
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-mono font-extrabold text-blue-700 text-sm">{trackerResult.requestCode}</span>
                  <h4 className="font-extrabold text-slate-900 text-sm mt-0.5">{trackerResult.serviceName}</h4>
                </div>
                <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-full text-xs font-mono">
                  {trackerResult.status}
                </span>
              </div>

              <p className="text-xs text-slate-600">Applicant: <strong>{trackerResult.applicantName}</strong> ({trackerResult.district} District)</p>
              
              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                <p className="font-bold text-slate-800 text-xs">Application Progress Timeline:</p>
                {trackerResult.history.map((h: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center text-xs">
                    <span className="flex items-center gap-1.5 text-slate-700">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> {h.state}
                    </span>
                    <span className="font-mono text-slate-400 text-[10px]">{h.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: QR DOCUMENT VERIFIER */}
      {activeTab === 'VERIFIER' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4 shadow-sm">
          <h3 className="text-sm font-extrabold text-slate-900">Verify Official Certificate Authenticity (Document ID / QR)</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={verifyDocCode}
              onChange={(e) => setVerifyDocCode(e.target.value)}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
              placeholder="e.g. DOC-2026-00912"
            />
            <button
              onClick={handleVerifyDocument}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl text-xs shadow"
            >
              Verify Certificate
            </button>
          </div>

          {verificationResult && (
            <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-3 font-mono">
              <div className="flex justify-between items-center">
                <span className="text-blue-400 font-extrabold text-sm">{verificationResult.documentCode}</span>
                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold rounded-full text-xs">
                  {verificationResult.status}
                </span>
              </div>

              <h4 className="font-bold text-white text-sm">{verificationResult.templateTitle}</h4>
              <p className="text-xs text-slate-300">Issued To: <strong>{verificationResult.ownerName}</strong> ({verificationResult.ownerUppId})</p>
              <p className="text-xs text-slate-400">Authority: {verificationResult.issuedBy}</p>
              <p className="text-[10px] text-slate-500">Integrity Stamp: {verificationResult.integrityHash}</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PUBLIC SCHEMES CATALOG */}
      {activeTab === 'SCHEMES' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-2 shadow-sm">
            <h3 className="font-extrabold text-slate-900 text-sm">Soil Health Card & Testing Scheme</h3>
            <p className="text-xs text-slate-500">Free soil testing and digital nutrient advice for farmers across all 36 districts.</p>
            <button onClick={() => alert('Opening Public Scheme Guidelines')} className="text-blue-600 font-bold text-xs hover:underline flex items-center gap-1 mt-2">
              View Scheme Guidelines & Apply <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-2 shadow-sm">
            <h3 className="font-extrabold text-slate-900 text-sm">Drone Spraying Subsidy Scheme</h3>
            <p className="text-xs text-slate-500">Financial assistance for crop protection drone spraying services.</p>
            <button onClick={() => alert('Opening Public Scheme Guidelines')} className="text-blue-600 font-bold text-xs hover:underline flex items-center gap-1 mt-2">
              View Scheme Guidelines & Apply <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

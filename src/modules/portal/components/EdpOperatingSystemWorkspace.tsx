import React, { useState } from 'react';
import { Award, ShieldAlert, CheckCircle2, Search, ArrowRight, RefreshCw, QrCode, MapPin } from 'lucide-react';
import { EdpApplicant, EdpAsset, inspectAndCommissionAsset, calculateEntrepreneurRiskScore } from '../../edp/edpService';

export const EdpOperatingSystemWorkspace: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'applicants' | 'assets' | 'cohorts'>('applicants');

  const [applicants] = useState<EdpApplicant[]>([
    {
      applicant_id: 'EDP_101',
      application_number: 'EDP-2026-WD-0045',
      full_name: 'Vikas Tukaram Gawande',
      mobile_number: '9823011223',
      assigned_district_id: 'DIST_WARDHA',
      assigned_taluka_id: 'TAL_WARDHA',
      entrepreneur_type: 'DRONE_SPECIALIST',
      current_stage: 'ACTIVE_OPERATIONS',
      risk_score_level: 'LOW'
    },
    {
      applicant_id: 'EDP_102',
      application_number: 'EDP-2026-NG-0089',
      full_name: 'Pooja Suresh Deshmukh',
      mobile_number: '9765412389',
      assigned_district_id: 'DIST_NAGPUR',
      assigned_taluka_id: 'TAL_NAGPUR_RURAL',
      entrepreneur_type: 'AGRI_GENERAL',
      current_stage: 'ASSET_PROCUREMENT',
      risk_score_level: 'MEDIUM'
    }
  ]);

  const [assets, setAssets] = useState<EdpAsset[]>([
    {
      asset_id: 'AST_01',
      applicant_id: 'EDP_101',
      serial_number: 'AST-DRN-2026-88',
      asset_type: 'Agri Drone 10L Hexacopter',
      stage: 'INSPECTED',
      inspection_latitude: 20.7453,
      inspection_longitude: 78.6022
    }
  ]);

  const [inspectionMsg, setInspectionMsg] = useState<string | null>(null);

  const handleInspectAsset = (asset: EdpAsset) => {
    try {
      const updated = inspectAndCommissionAsset(asset, 20.7453, 78.6022, 20.7453, 78.6022);
      setAssets(assets.map(a => a.asset_id === asset.asset_id ? updated : a));
      setInspectionMsg(`✅ Asset ${asset.serial_number} successfully geotagged & commissioned!`);
    } catch (err: any) {
      setInspectionMsg(`❌ ${err.message}`);
    }
  };

  return (
    <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-900 text-white p-4 rounded-xl flex items-center justify-between shadow-md">
        <div>
          <div className="flex items-center space-x-2">
            <Award className="w-6 h-6 text-amber-400" />
            <h2 className="text-base font-black tracking-tight">EDP-AGRI Entrepreneur Operating System (Chapter 11)</h2>
          </div>
          <p className="text-xs text-emerald-100 mt-1 font-medium">
            17-Stage Candidate Lifecycle, 8-Stage Geotagged Asset Engine & AI Risk Scoring
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('applicants')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'applicants' ? 'bg-amber-400 text-slate-900 shadow-sm' : 'bg-emerald-700 text-emerald-100 hover:bg-emerald-600'
            }`}
          >
            Applicants (17 Stages)
          </button>
          <button
            onClick={() => setActiveTab('assets')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'assets' ? 'bg-amber-400 text-slate-900 shadow-sm' : 'bg-emerald-700 text-emerald-100 hover:bg-emerald-600'
            }`}
          >
            Asset Lifecycle (8 Stages)
          </button>
        </div>
      </div>

      {inspectionMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-lg text-xs font-bold flex items-center justify-between">
          <span>{inspectionMsg}</span>
          <button onClick={() => setInspectionMsg(null)} className="text-xs text-slate-500 hover:text-slate-700">✕</button>
        </div>
      )}

      {/* Main Workspace Body */}
      {activeTab === 'applicants' ? (
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-slate-900">Registered Entrepreneur Candidates</h3>
            <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">Total: {applicants.length} Candidates</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 font-extrabold uppercase text-[10px]">
                  <th className="p-2.5">App Number</th>
                  <th className="p-2.5">Candidate Name</th>
                  <th className="p-2.5">Type</th>
                  <th className="p-2.5">District / Taluka</th>
                  <th className="p-2.5">Current Lifecycle Stage</th>
                  <th className="p-2.5">AI Risk Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {applicants.map(app => (
                  <tr key={app.applicant_id} className="hover:bg-slate-50 font-medium">
                    <td className="p-2.5 font-mono text-emerald-700 font-bold">{app.application_number}</td>
                    <td className="p-2.5 font-bold text-slate-900">{app.full_name}</td>
                    <td className="p-2.5"><span className="bg-blue-50 text-blue-800 px-2 py-0.5 rounded text-[10px] font-bold">{app.entrepreneur_type}</span></td>
                    <td className="p-2.5 text-slate-600">Wardha / Wardha</td>
                    <td className="p-2.5"><span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">{app.current_stage}</span></td>
                    <td className="p-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                        app.risk_score_level === 'LOW' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {app.risk_score_level} RISK
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-slate-900">Machinery & Asset Lifecycle (Geotag Verification)</h3>
            <span className="text-xs bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded-full">8-Stage Engine</span>
          </div>

          <div className="space-y-3">
            {assets.map(asset => (
              <div key={asset.asset_id} className="p-3 border border-slate-200 rounded-xl bg-slate-50 flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-xs text-slate-900">{asset.serial_number}</span>
                    <span className="bg-emerald-100 text-emerald-800 font-bold text-[10px] px-2 py-0.5 rounded">{asset.stage}</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 font-semibold">{asset.asset_type}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 flex items-center">
                    <MapPin className="w-3 h-3 mr-1 text-slate-400" /> Lat: {asset.inspection_latitude || 'Not Checked'}, Lng: {asset.inspection_longitude || 'Not Checked'}
                  </p>
                </div>

                {asset.stage !== 'COMMISSIONED' && (
                  <button
                    onClick={() => handleInspectAsset(asset)}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-all"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Geotag & Commission</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

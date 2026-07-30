/**
 * Universal Profile Platform (UPP) Directory UI Component
 * Location: /src/modules/upp/components/UPPProfileDirectory.tsx
 * Displays profiles with Permanent Universal IDs (UPP-000000123), Role Badges,
 * Health Scores, Filter Controls, and Lifecycle Progression.
 */

import React, { useState } from 'react';
import { UPPProfile, UPPRole } from '../types/upp.types';
import { UPPEngineService } from '../services/UPPEngineService';
import { Search, Filter, UserCheck, ShieldCheck, Activity, ChevronRight, Eye, ArrowRight, UserPlus, Sparkles, CheckCircle2 } from 'lucide-react';

interface UPPProfileDirectoryProps {
  onSelectProfile: (profile: UPPProfile) => void;
}

export const UPPProfileDirectory: React.FC<UPPProfileDirectoryProps> = ({ onSelectProfile }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<UPPRole | 'ALL'>('ALL');

  // Mock initial enterprise UPP profiles
  const [profiles, setProfiles] = useState<UPPProfile[]>([
    {
      id: '1',
      permanentUppId: 'UPP-000000124',
      primaryBusinessCode: 'MA-CAN-000154',
      fullName: 'Sunil Dattatray Patil',
      mobile: '+91 98220 11223',
      email: 'sunil.patil@mahaagri.in',
      gender: 'Male',
      currentPrimaryRole: 'CANDIDATE',
      lifecycleStage: 'IN_TRAINING',
      healthScore: 85,
      isVerified: true,
      isFlaggedDuplicate: false,
      district: 'Pune District',
      taluka: 'Haveli',
      village: 'Manjari',
      assignedCoordinatorName: 'Ramesh Patil',
      createdAt: '2026-07-15T10:00:00Z',
      updatedAt: '2026-07-22T14:00:00Z',
    },
    {
      id: '2',
      permanentUppId: 'UPP-000000125',
      primaryBusinessCode: 'MA-FAR-002340',
      fullName: 'Ankita Suresh Deshmukh',
      mobile: '+91 94230 44556',
      gender: 'Female',
      currentPrimaryRole: 'FARMER',
      lifecycleStage: 'ACTIVE_FARMER',
      healthScore: 95,
      isVerified: true,
      isFlaggedDuplicate: false,
      district: 'Wardha District',
      taluka: 'Arvi',
      village: 'Wadona',
      assignedCoordinatorName: 'Suresh Agridoot',
      createdAt: '2026-06-10T09:00:00Z',
      updatedAt: '2026-07-20T11:00:00Z',
    },
    {
      id: '3',
      permanentUppId: 'UPP-000000126',
      primaryBusinessCode: 'MA-ENT-000088',
      fullName: 'Vikram Rajendra Shinde',
      mobile: '+91 99700 88990',
      gender: 'Male',
      currentPrimaryRole: 'ENTREPRENEUR',
      lifecycleStage: 'ENTREPRENEUR',
      healthScore: 70,
      isVerified: false,
      isFlaggedDuplicate: false,
      district: 'Nagpur District',
      taluka: 'Katol',
      assignedCoordinatorName: 'Ramesh Patil',
      createdAt: '2026-07-01T12:00:00Z',
      updatedAt: '2026-07-18T16:00:00Z',
    },
  ]);

  const filteredProfiles = profiles.filter((p) => {
    const matchesSearch =
      p.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.permanentUppId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.primaryBusinessCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.mobile.includes(searchQuery);

    const matchesRole = selectedRoleFilter === 'ALL' || p.currentPrimaryRole === selectedRoleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6 text-xs text-slate-900">
      {/* Directory Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-blue-600">
            Universal Profile Platform (UPP)
          </span>
          <h2 className="text-xl font-extrabold text-slate-900 mt-0.5">Central Profile Directory</h2>
          <p className="text-xs text-slate-500">Permanent Universal IDs (UPP-000000123) & Dynamic Person Role Progression</p>
        </div>

        <button
          onClick={() => {
            const newUppId = UPPEngineService.generatePermanentUppId();
            alert(`Created new UPP Profile: ${newUppId}`);
          }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow transition-all self-start md:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>+ Register New Profile</span>
        </button>
      </div>

      {/* Search & Role Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by Permanent ID (UPP-000000123), Name, Mobile, or Role Code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-600"
          />
        </div>

        <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 font-bold">
          {(['ALL', 'CANDIDATE', 'FARMER', 'ENTREPRENEUR', 'MAHA_AGRIDOOT'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setSelectedRoleFilter(r)}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                selectedRoleFilter === r ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Profiles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProfiles.map((p) => (
          <div
            key={p.id}
            onClick={() => onSelectProfile(p)}
            className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-blue-500 cursor-pointer space-y-4 shadow-sm hover:shadow-md transition-all group"
          >
            {/* Header: Permanent ID & Business Code */}
            <div className="flex justify-between items-start">
              <div>
                <span className="font-mono font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-[11px]">
                  {p.permanentUppId}
                </span>
                <p className="text-[10px] text-slate-400 font-mono mt-1">{p.primaryBusinessCode}</p>
              </div>

              <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">
                {p.currentPrimaryRole}
              </span>
            </div>

            {/* Person Name & Location */}
            <div>
              <h3 className="text-base font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">
                {p.fullName}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {p.district} • {p.taluka} {p.village ? `(${p.village})` : ''}
              </p>
            </div>

            {/* Health Score & Verification Status */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-xs font-bold text-slate-700">Health: {p.healthScore}%</span>
              </div>

              {p.isVerified ? (
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Verified
                </span>
              ) : (
                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  Unverified
                </span>
              )}
            </div>

            {/* Action Footer */}
            <div className="pt-2 border-t border-slate-100 flex justify-end text-blue-600 font-bold text-xs group-hover:translate-x-0.5 transition-transform">
              <span>View Profile Details</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

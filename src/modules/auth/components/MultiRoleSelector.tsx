/**
 * MultiRoleSelector & Post-Login Workspace Switcher Component
 * Abhinav Bharat Foundation Digital Ecosystem
 *
 * Displays Workspace Cards for Root Super Admin & Multi-Platform Users:
 * 1. Root Control Center (/root/control-center)
 * 2. Abhinav Bharat Enterprise (/abf/dashboard)
 * 3. MAHA-AGRI Government Platform (/maha-agri/dashboard)
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Layers, ChevronRight, Sprout, Building2 } from 'lucide-react';
import type { MahaAgriRole } from '../types/auth.types';

interface MultiRoleSelectorProps {
  roles: MahaAgriRole[];
  onSelectRole: (role: MahaAgriRole) => void;
  loading?: boolean;
}

export const MultiRoleSelector: React.FC<MultiRoleSelectorProps> = ({
  roles,
  onSelectRole,
  loading = false,
}) => {
  const navigate = useNavigate();
  const isRootAdmin = roles.some((r) => r.key === 'ROOT_SUPER_ADMIN' || r.name.includes('Root'));

  return (
    <div className="w-full space-y-4">
      <div className="text-center mb-5">
        <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-2 text-purple-700 shadow-sm">
          <Layers className="w-6 h-6" />
        </div>
        <h2 className="text-base sm:text-lg font-black text-slate-900">Select Active Workspace</h2>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          Select which enterprise platform workspace to launch.
        </p>
      </div>

      <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
        {/* ROOT SUPER ADMIN SPECIAL OPTION */}
        {isRootAdmin && (
          <button
            onClick={() => navigate('/root/control-center')}
            disabled={loading}
            className="w-full flex items-center justify-between p-3.5 bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 border border-purple-800 hover:border-purple-500 rounded-xl shadow-md transition-all text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-900/60 text-purple-300 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-purple-300 transition-colors">
                  🛡️ ABF Root Control Center
                </h3>
                <p className="text-[11px] text-purple-300/80">Global Ecosystem Governance & Registry</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-purple-400 group-hover:translate-x-0.5 transition-all" />
          </button>
        )}

        {/* 🏛️ ABF ENTERPRISE WORKSPACE */}
        <button
          onClick={() => {
            const role = roles.find((r) => r.key.includes('ABF') || r.key === 'SUPER_ADMIN') || roles[0];
            onSelectRole(role);
            navigate('/abf/dashboard');
          }}
          disabled={loading}
          className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-blue-500 rounded-xl shadow-xs transition-all text-left group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-blue-900 transition-colors">
                🏛️ Abhinav Bharat Foundation Enterprise
              </h3>
              <p className="text-[11px] text-slate-500">Internal Governance, HRMS, CRM & Office</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
        </button>

        {/* 🌾 MAHA-AGRI GOVERNMENT WORKSPACE */}
        <button
          onClick={() => {
            const role = roles.find((r) => r.key.includes('MAHA') || r.key === 'STATE_ADMIN') || roles[0];
            onSelectRole(role);
            navigate('/maha-agri/dashboard');
          }}
          disabled={loading}
          className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-emerald-500 rounded-xl shadow-xs transition-all text-left group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
              <Sprout className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-emerald-900 transition-colors">
                🌾 MAHA-AGRI Government Platform
              </h3>
              <p className="text-[11px] text-slate-500">Farmer 360, Soil Testing Labs & EDP Lifecycle</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
        </button>
      </div>
    </div>
  );
};

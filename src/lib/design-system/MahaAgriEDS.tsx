// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Enterprise Design System (EDS v1.0)
// Centralized Reusable Design Language & Enterprise Component Library
// Standardized across Dashboard, Farmer, Soil, Lab, Finance, Drone, GIS, MIS
// ============================================================================

import React, { useState } from 'react';
import {
  Users, Activity, FlaskConical, Send, GraduationCap, DollarSign,
  Bell, FileText, Lock, TrendingUp, Compass, CheckCircle2, RefreshCw, Search,
  Award, Briefcase, ChevronRight, Phone, MapPin, Calendar, Clock,
  FileCheck, AlertCircle, PlayCircle, QrCode, Building2, Sparkles, Check,
  ChevronDown, ArrowUpRight, ArrowDownRight, Menu, Grid, Info, Filter,
  FileSpreadsheet, FileDown, Layers, Settings, ShieldAlert, BarChart3, PieChart,
  Server, Zap, AlertTriangle, UserCheck, Crosshair, Map, Download, CheckSquare,
  ArrowRight, ShieldCheck, Database, HardDrive, Cpu, Radio, Mail, Sliders
} from 'lucide-react';

// ============================================================================
// 1. DESIGN SYSTEM TOKENS
// ============================================================================
export const EDSTokens = {
  colors: {
    bg: 'bg-slate-100',
    cardBg: 'bg-white',
    sidebarBg: 'bg-white',
    headerBg: 'bg-white',
    primary: 'bg-emerald-700 hover:bg-emerald-800 text-white',
    primaryText: 'text-emerald-700',
    primaryBorder: 'border-emerald-700',
    secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-800',
    accentBlue: 'bg-blue-600 text-white',
    accentAmber: 'bg-amber-500 text-white',
    accentRose: 'bg-rose-600 text-white',
    textMain: 'text-slate-900',
    textMuted: 'text-slate-500',
    border: 'border-slate-200',
    borderDark: 'border-slate-300',
  },
  typography: {
    fontSans: 'font-sans',
    fontMono: 'font-mono',
    titleMain: 'text-base font-black text-slate-900 leading-none',
    titleSection: 'text-sm font-extrabold text-slate-900',
    labelSmall: 'text-[10px] font-bold uppercase tracking-wider text-slate-400',
    valueKpi: 'text-xl font-black text-slate-900 leading-none',
  },
  shadows: {
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
  },
  radii: {
    card: 'rounded-xl',
    button: 'rounded-lg',
    badge: 'rounded-full',
  }
};

// ============================================================================
// 2. REUSABLE STATUS BADGES (EDSStatusBadge)
// ============================================================================
export interface EDSStatusBadgeProps {
  status: 'COMPLETED' | 'IN_PROGRESS' | 'IN_TRANSIT' | 'PENDING' | 'REJECTED' | 'WARNING' | 'CRITICAL' | string;
  label?: string;
}

export const EDSStatusBadge: React.FC<EDSStatusBadgeProps> = ({ status, label }) => {
  const displayLabel = label || status.replace('_', ' ');
  let colorClasses = 'bg-slate-100 text-slate-700 border-slate-200';

  switch (status.toUpperCase()) {
    case 'COMPLETED':
    case 'ONLINE':
    case 'ON_TRACK':
    case 'ACTIVE':
      colorClasses = 'bg-emerald-100 text-emerald-800 border-emerald-200';
      break;
    case 'IN_PROGRESS':
    case 'IN_TRANSIT':
      colorClasses = 'bg-blue-100 text-blue-800 border-blue-200';
      break;
    case 'PENDING':
    case 'WARNING':
    case 'PENDING_APPROVAL':
      colorClasses = 'bg-amber-100 text-amber-800 border-amber-200';
      break;
    case 'REJECTED':
    case 'CRITICAL':
    case 'SLA_BREACH':
      colorClasses = 'bg-rose-100 text-rose-800 border-rose-200';
      break;
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${colorClasses}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 animate-pulse"></span>
      <span>{displayLabel}</span>
    </span>
  );
};

// ============================================================================
// 3. REUSABLE EXECUTIVE KPI CARD (EDSKpiCard)
// ============================================================================
export interface EDSKpiCardProps {
  title: string;
  value: string;
  comparison?: string;
  achievementPct?: string;
  icon?: React.ComponentType<{ className?: string }>;
  sparklinePath?: string;
  sparkColor?: string;
  borderColor?: string;
}

export const EDSKpiCard: React.FC<EDSKpiCardProps> = ({
  title,
  value,
  comparison,
  achievementPct,
  icon: Icon = Activity,
  sparklinePath = 'M0 25 Q 15 10, 30 20 T 60 15 T 90 5 T 120 12',
  sparkColor = '#059669',
  borderColor = 'border-slate-200'
}) => {
  return (
    <div className={`bg-white p-3.5 rounded-xl border ${borderColor} shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between`}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-tight truncate">{title}</span>
        <Icon className="w-4 h-4 text-slate-400" />
      </div>
      <h3 className="text-xl font-black text-slate-900 mt-1 leading-none">{value}</h3>
      
      <div className="mt-2 flex items-center justify-between text-[10px]">
        {comparison && (
          <span className="text-emerald-700 font-bold flex items-center">
            <ArrowUpRight className="w-3 h-3 mr-0.5" />
            {comparison}
          </span>
        )}
        {achievementPct && (
          <span className="font-bold text-slate-500">{achievementPct}</span>
        )}
      </div>

      <div className="w-full h-6 mt-2 pt-1 border-t border-slate-100">
        <svg viewBox="0 0 120 30" className="w-full h-full overflow-visible">
          <path d={sparklinePath} fill="none" stroke={sparkColor} strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
};

// ============================================================================
// 4. REUSABLE ENTERPRISE DATA GRID (EDSDataGrid)
// ============================================================================
export interface EDSColumn {
  key: string;
  header: string;
  render?: (row: any) => React.ReactNode;
}

export interface EDSDataGridProps {
  title: string;
  subtitle?: string;
  columns: EDSColumn[];
  data: any[];
  showExport?: boolean;
  totalsRow?: Record<string, any>;
}

export const EDSDataGrid: React.FC<EDSDataGridProps> = ({
  title,
  subtitle,
  columns,
  data,
  showExport = true,
  totalsRow
}) => {
  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-black text-slate-900 text-sm">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500 font-medium">{subtitle}</p>}
        </div>
        {showExport && (
          <div className="flex items-center space-x-2">
            <button className="flex items-center space-x-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-3 py-1.5 rounded-lg font-bold transition-colors">
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              <span>Export Excel</span>
            </button>
            <button className="flex items-center space-x-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-3 py-1.5 rounded-lg font-bold transition-colors">
              <FileDown className="w-4 h-4 text-emerald-700" />
              <span>PDF</span>
            </button>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
              {columns.map((col) => (
                <th key={col.key} className="py-2.5 px-3">{col.header}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
            {data.map((row, rIdx) => (
              <tr key={rIdx} className="hover:bg-slate-50 transition-colors">
                {columns.map((col) => (
                  <td key={col.key} className="py-2.5 px-3">
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
            {totalsRow && (
              <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-400">
                {columns.map((col) => (
                  <td key={col.key} className="py-3 px-3">
                    {totalsRow[col.key] || ''}
                  </td>
                ))}
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ============================================================================
// 5. REUSABLE WORKFLOW STEPPER (EDSWorkflowStepper)
// ============================================================================
export interface EDSWorkflowStep {
  title: string;
  time: string;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'PENDING' | string;
  description: string;
}

export const EDSWorkflowStepper: React.FC<{ steps: EDSWorkflowStep[] }> = ({ steps }) => {
  return (
    <div className="relative border-l-2 border-slate-200 ml-3 space-y-5">
      {steps.map((step, idx) => (
        <div key={idx} className="ml-6 relative">
          <div className={`w-3.5 h-3.5 rounded-full absolute -left-[31px] top-0 border-2 border-white shadow-sm ${
            step.status.includes('COMPLETED') ? 'bg-emerald-600' :
            step.status.includes('IN_PROGRESS') ? 'bg-blue-600' : 'bg-slate-300'
          }`}></div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900">{step.title}</h4>
              <span className="text-[10px] text-slate-400 font-medium">{step.time}</span>
            </div>
            <p className="text-[11px] text-slate-600">{step.description}</p>
            <EDSStatusBadge status={step.status} />
          </div>
        </div>
      ))}
    </div>
  );
};

// ============================================================================
// 6. REUSABLE TOP COMMAND HEADER (EDSHeader)
// ============================================================================
export const EDSHeader: React.FC<{
  title: string;
  subtitle: string;
  activeRole: string;
  onRoleChange?: (role: string) => void;
}> = ({ title, subtitle, activeRole, onRoleChange }) => {
  const [showRoles, setShowRoles] = useState(false);

  return (
    <header className="bg-white border-b border-slate-200 px-5 py-2.5 flex items-center justify-between sticky top-0 z-50 shadow-sm">
      {/* Official Government Crest & Title */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 via-emerald-600 to-emerald-800 p-0.5 shadow-sm flex items-center justify-center">
          <div className="w-full h-full rounded-full bg-white flex items-center justify-center font-black text-emerald-800 text-base">
            म
          </div>
        </div>
        <div>
          <h1 className="font-black text-base tracking-tight text-slate-900 leading-none">
            {title}
          </h1>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">{subtitle}</p>
        </div>
      </div>

      {/* User Context & Role */}
      <div className="flex items-center space-x-4">
        <div className="relative">
          <button
            onClick={() => setShowRoles(!showRoles)}
            className="flex items-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold transition-colors"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            <span>Role: {activeRole.replace('_', ' ')}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
          </button>

          {showRoles && onRoleChange && (
            <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-300 rounded-xl shadow-2xl p-2 z-50 space-y-1">
              <div className="text-[10px] font-bold text-slate-400 px-2 py-1 uppercase tracking-wider">
                Approved Enterprise Roles
              </div>
              {[
                { key: 'AGRICULTURE_COMMISSIONER', label: 'Agriculture Commissioner' },
                { key: 'PRINCIPAL_SECRETARY', label: 'Principal Secretary' },
                { key: 'JOINT_DIRECTOR', label: 'Joint Director Agriculture' },
                { key: 'DISTRICT_COLLECTOR', label: 'District Collector' },
                { key: 'SOIL_CHEMIST', label: 'Soil Chemist' },
              ].map((r) => (
                <button
                  key={r.key}
                  onClick={() => {
                    onRoleChange(r.key);
                    setShowRoles(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors ${
                    activeRole === r.key ? 'bg-emerald-50 text-emerald-800 font-bold' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span>{r.label}</span>
                  {activeRole === r.key && <Check className="w-4 h-4 text-emerald-700" />}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2 border-l border-slate-200 pl-3">
          <div className="w-8 h-8 rounded-full bg-emerald-800 text-white font-bold flex items-center justify-center text-xs shadow-sm">
            MA
          </div>
          <div className="hidden lg:block text-left">
            <span className="text-xs font-bold text-slate-900 block leading-tight">Operations Officer</span>
            <span className="text-[10px] text-slate-500 font-semibold block leading-tight">MAHA-AGRI Digital Platform</span>
          </div>
        </div>
      </div>
    </header>
  );
};

// ============================================================================
// 7. REUSABLE FOOTER (EDSFooter)
// ============================================================================
export const EDSFooter: React.FC = () => (
  <footer className="bg-white border-t border-slate-200 px-6 py-2.5 text-xs text-slate-500 flex flex-col md:flex-row items-center justify-between gap-3 shadow-inner">
    <div>
      <span>© 2026 MAHA-AGRI Platform. All rights reserved.</span>
      <span className="ml-2 font-bold text-slate-700">Enterprise Design System v1.0</span>
    </div>
    <div>
      <span>Designed & Developed for <strong>Department of Agriculture, Government of Maharashtra</strong></span>
    </div>
  </footer>
);

// Helper Icon
const HourglassIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 22h14M5 2h14M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2" />
  </svg>
);

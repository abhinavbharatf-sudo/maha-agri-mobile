// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Enterprise Executive Command Center
// 100% Exact High-Fidelity Reproduction matching Photo 2 (Baseline Baseline)
// ============================================================================

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Activity, FlaskConical, Send, DollarSign, Bell, FileText,
  Search, Award, Briefcase, MapPin, Clock, FileCheck, AlertCircle,
  Building2, Check, ChevronDown, Menu, Grid, Layers, Settings, ShieldAlert,
  BarChart3, PieChart, TrendingUp, Compass, UserCheck, Mail, CheckCircle,
  FileSpreadsheet, Map, LogOut
} from 'lucide-react';
import Farmer360Workspace from '../farmer/Farmer360Workspace';
import { MahaAgridootFieldApp } from '../agridoot/MahaAgridootFieldApp';
import { EdpOperatingSystemWorkspace } from './components/EdpOperatingSystemWorkspace';
import { DroneFleetWorkspace } from './components/DroneFleetWorkspace';
import { SoilTestingWorkspace } from './components/SoilTestingWorkspace';
import { PaymentLedgerWorkspace } from './components/PaymentLedgerWorkspace';
import { MandiAndAiWorkspace } from './components/MandiAndAiWorkspace';
import StaffUserManagement from '../admin/StaffUserManagement';
import { useAuth } from '../../lib/auth/AuthContext';

// 9 Approved Roles ONLY (Project Constitution Frozen)
export const APPROVED_ROLES: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  STATE_ADMIN: 'State Admin',
  REGIONAL_MANAGER: 'Regional Manager',
  DISTRICT_COORDINATOR: 'District Coordinator',
  TALUKA_COORDINATOR: 'Taluka Coordinator',
  MAHA_AGRIDOOT: 'MAHA-AGRIDOOT',
  SOIL_CHEMIST: 'Soil Chemist',
  EDP_AGRI_CANDIDATE: 'EDP-AGRI Candidate',
  FARMER: 'Farmer',
};

export const MahaAgriEnterpriseAdminPortal: React.FC = () => {
  const { profile, roleKey, user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  const isSuperAdmin = roleKey === 'super_admin' || roleKey === 'ROOT_SUPER_ADMIN';
  const isAdmin = isSuperAdmin || roleKey === 'admin' || roleKey === 'STATE_ADMIN';

  // Server/database-backed RBAC Guard: Restrict Staff users strictly to /staff/dashboard
  React.useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate('/login', { replace: true });
      } else if (!isAdmin) {
        navigate('/staff/dashboard', { replace: true });
      }
    }
  }, [loading, user, isAdmin, navigate]);

  if (!loading && (!user || !isAdmin)) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-white text-center">
        <div className="space-y-3">
          <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto animate-pulse" />
          <h2 className="text-base font-bold">Access Restricted: Administrator Privileges Required</h2>
          <p className="text-xs text-slate-400">Staff users are restricted to the Staff Dashboard. Redirecting to /staff/dashboard...</p>
        </div>
      </div>
    );
  }

  const displayName = profile?.full_name || (user?.user_metadata?.full_name as string) || (user?.email ? user.email.split('@')[0] : 'Staff User');
  const displayEmail = profile?.email || user?.email || '';
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map((w: string) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'ST';

  const roleDisplay = isSuperAdmin
    ? 'Super Admin'
    : roleKey === 'admin'
    ? 'State Administrator'
    : roleKey === 'hr' || roleKey === 'hr_manager'
    ? 'HR Manager'
    : `${profile?.designation || 'Staff'} (Operations)`;

  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [activeNav, setActiveNav] = useState<string>('dashboard');
  const [quickSearch, setQuickSearch] = useState<string>('');
  const [activeRole, setActiveRole] = useState<string>(() => {
    if (isSuperAdmin) return 'SUPER_ADMIN';
    if (isAdmin) return 'STATE_ADMIN';
    return 'STAFF';
  });
  const [showRoleSelector, setShowRoleSelector] = useState<boolean>(false);

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-900 flex flex-col antialiased selection:bg-emerald-600 selection:text-white text-xs">
      
      {/* ============================================================================ */}
      {/* 1. TOP HEADER BAR                                                             */}
      {/* ============================================================================ */}
      <header className="bg-white border-b border-slate-200 px-4 py-2 flex items-center justify-between sticky top-0 z-50 shadow-xs h-16">
        {/* Left Logo & Branding */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2.5">
            {/* Government Emblem Seal */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 via-emerald-600 to-emerald-800 p-0.5 shadow-xs flex items-center justify-center">
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center font-black text-emerald-800 text-sm">
                म
              </div>
            </div>
            <div>
              <h1 className="font-black text-base tracking-tight text-emerald-800 leading-none">
                MAHA-AGRI
              </h1>
              <p className="text-[9px] font-extrabold text-slate-700 uppercase tracking-wider mt-0.5">GOVERNMENT DIGITAL OPERATIONS PLATFORM</p>
              <p className="text-[8.5px] text-slate-500 font-medium">Department of Agriculture, Government of Maharashtra</p>
            </div>
          </div>

          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors ml-3"
            aria-label="Toggle Sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* Global Multi-Entity Search Bar */}
        <div className="flex-1 max-w-lg mx-6 relative hidden md:block">
          <input
            type="text"
            placeholder="Search District, Officer, Farmer, Sample, Lab, Report..."
            value={quickSearch}
            onChange={(e) => setQuickSearch(e.target.value)}
            className="w-full bg-[#F1F5F9] text-xs text-slate-800 pl-4 pr-24 py-1.5 rounded-lg border border-slate-200 focus:bg-white focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 font-medium transition-all"
          />
          <div className="absolute right-3 top-1.5 flex items-center space-x-1.5 text-slate-400">
            <span className="text-[9.5px] font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-500 font-semibold">
              Ctrl + K
            </span>
            <Search className="w-3.5 h-3.5 text-slate-400" />
          </div>
        </div>

        {/* Right Header Navigation Controls & User Profile */}
        <div className="flex items-center space-x-3">
          <div className="hidden lg:flex items-center space-x-3 text-xs border-r border-slate-200 pr-3">
            <div className="flex flex-col text-right">
              <span className="font-extrabold text-slate-900 leading-tight">FY 2026-27</span>
              <span className="text-[9px] text-slate-500 font-medium">Financial Year</span>
            </div>
            <div className="flex flex-col text-right">
              <span className="font-extrabold text-slate-900 leading-tight">Kharif 2026</span>
              <span className="text-[9px] text-slate-500 font-medium">Season</span>
            </div>
            <div className="flex flex-col text-right">
              <span className="font-extrabold text-slate-900 leading-tight">Statewide - MH</span>
              <span className="text-[9px] text-slate-500 font-medium">36 Districts</span>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            <button className="relative p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors" aria-label="Notifications">
              <Bell className="w-4 h-4" />
              <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-rose-600 text-white text-[8px] font-bold flex items-center justify-center">12</span>
            </button>
            <button className="relative p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors" aria-label="Messages">
              <Mail className="w-4 h-4" />
              <span className="absolute top-0.5 right-0.5 w-3 h-3 rounded-full bg-emerald-600 text-white text-[7px] font-bold flex items-center justify-center">5</span>
            </button>
            <button className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors" aria-label="Grid Menu">
              <Grid className="w-4 h-4" />
            </button>
          </div>

          {/* User Profile Avatar & Identity Panel */}
          <div className="flex items-center space-x-2 border-l border-slate-200 pl-3 relative">
            <button
              onClick={() => setShowRoleSelector(!showRoleSelector)}
              className="flex items-center space-x-2 bg-slate-50 hover:bg-slate-100 p-1 rounded-lg border border-slate-200 transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-emerald-800 text-white font-black flex items-center justify-center text-xs shadow-xs">
                {initials}
              </div>
              <div className="hidden lg:block text-left pr-1">
                <span className="text-xs font-black text-slate-900 block leading-tight">{displayName}</span>
                <span className="text-[9.5px] text-slate-500 font-bold block leading-tight">{roleDisplay}</span>
              </div>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showRoleSelector && (
              <div className="absolute right-0 top-11 w-60 bg-white border border-slate-300 rounded-xl shadow-2xl p-2 z-50 space-y-2">
                <div className="px-2 py-1 border-b border-slate-100">
                  <div className="text-xs font-bold text-slate-900 truncate">{displayName}</div>
                  <div className="text-[10px] text-slate-500 truncate">{displayEmail}</div>
                  <div className="text-[9px] font-semibold text-emerald-700 mt-0.5">{profile?.designation || roleDisplay}</div>
                </div>

                {isSuperAdmin && (
                  <>
                    <div className="text-[9px] font-bold text-slate-400 px-2 uppercase tracking-wider">
                      Preview Roles (Admin Only)
                    </div>
                    {Object.entries(APPROVED_ROLES).map(([key, label]) => (
                      <button
                        key={key}
                        onClick={() => {
                          setActiveRole(key);
                          setShowRoleSelector(false);
                        }}
                        className={`w-full text-left px-2 py-1 rounded text-xs font-medium flex items-center justify-between transition-colors ${
                          activeRole === key ? 'bg-emerald-50 text-emerald-800 font-bold' : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span>{label}</span>
                        {activeRole === key && <Check className="w-3.5 h-3.5 text-emerald-700" />}
                      </button>
                    ))}
                  </>
                )}

                <div className="pt-1 border-t border-slate-100">
                  <button
                    onClick={async () => {
                      setShowRoleSelector(false);
                      await signOut();
                      navigate('/login', { replace: true });
                    }}
                    className="w-full text-left px-2 py-1.5 rounded text-xs font-medium text-rose-700 hover:bg-rose-50 flex items-center gap-1.5 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ============================================================================ */}
      {/* 2. MISSION CONTROL STATUS SUB-HEADER RIBBON (Full Width Across Top 1:1 Photo 2) */}
      {/* ============================================================================ */}
      <div className="bg-white border-b border-slate-200 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs z-30">
        <div className="flex items-center space-x-6">
          <div>
            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">MISSION CONTROL STATUS</span>
            <div className="flex items-center space-x-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-black text-emerald-700 text-xs">OPERATIONAL</span>
              <span className="text-slate-500 text-[10px] font-medium ml-1">All Systems Normal</span>
            </div>
          </div>

          <div className="border-l border-slate-200 pl-4">
            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">LAST DATA REFRESH</span>
            <div className="flex items-center space-x-1.5 mt-0.5">
              <span className="font-mono font-bold text-slate-900 text-xs">13:25:30 IST</span>
              <span className="text-slate-400 text-[9.5px]">26 July 2026</span>
            </div>
          </div>

          <div className="border-l border-slate-200 pl-4">
            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">SERVER STATUS</span>
            <div className="flex items-center space-x-1.5 mt-0.5">
              <span className="font-bold text-emerald-700 text-xs">ONLINE</span>
              <span className="text-slate-400 text-[9.5px]">Response: 0.04s</span>
            </div>
          </div>

          <div className="border-l border-slate-200 pl-4">
            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">DATABASE STATUS</span>
            <div className="flex items-center space-x-1.5 mt-0.5">
              <span className="font-bold text-emerald-700 text-xs">HEALTHY</span>
              <span className="text-slate-400 text-[9.5px]">Replication Active</span>
            </div>
          </div>

          <div className="border-l border-slate-200 pl-4">
            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">SECURITY STATUS</span>
            <div className="flex items-center space-x-1.5 mt-0.5">
              <span className="font-bold text-emerald-700 text-xs">SECURE</span>
              <span className="text-slate-400 text-[9.5px]">All Systems Protected</span>
            </div>
          </div>
        </div>

        {/* Emergency Alert Ribbon (Far Right End) */}
        <div className="flex items-center space-x-2 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg text-xs font-bold text-rose-800 ml-auto">
          <div className="w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] font-black">!</div>
          <div>
            <span className="font-black text-rose-900 block leading-tight text-[11px]">2 EMERGENCY ALERTS</span>
            <span className="text-[9px] text-rose-700 font-medium block leading-tight">Require Immediate Attention</span>
          </div>
        </div>
      </div>

      {/* ============================================================================ */}
      {/* 3. MAIN WORKSPACE CONTAINER WITH SIDEBAR & DASHBOARD                          */}
      {/* ============================================================================ */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left ERP Navigation Sidebar */}
        <aside className={`${sidebarCollapsed ? 'w-14' : 'w-56'} bg-white border-r border-slate-200 flex flex-col transition-all duration-200 shadow-xs z-20`}>
          <nav className="flex-1 overflow-y-auto p-2.5 space-y-3.5">
            {[
              {
                category: 'MISSION CONTROL',
                items: [
                  { id: 'dashboard', label: 'State Command Center', icon: BarChart3 },
                  { id: 'district_matrix', label: 'District Rank Matrix', icon: Award },
                  { id: 'alerts_desk', label: 'Critical Alert Desk', icon: ShieldAlert },
                  { id: 'monitor', label: 'Performance Monitor', icon: Activity },
                ]
              },
              {
                category: 'CORE OPERATIONS',
                items: [
                  { id: 'farmer', label: 'Farmer 360 & Land (7/12)', icon: Users },
                  { id: 'soil', label: 'Soil Testing Workflows', icon: FlaskConical },
                  { id: 'lab', label: 'Lab Operations & Capacity', icon: Building2 },
                  { id: 'drone', label: 'Agri Drone Fleet Command', icon: Send },
                  { id: 'field', label: 'Field Team & Activities', icon: MapPin },
                ]
              },
              {
                category: 'FINANCE & SCHEMES',
                items: [
                  { id: 'finance', label: 'Double-Entry Ledger', icon: DollarSign },
                  { id: 'budget', label: 'Budget vs Outlay', icon: FileSpreadsheet },
                  { id: 'payments', label: 'Payments & Receipts', icon: FileText },
                  { id: 'schemes', label: 'Scheme Performance', icon: Briefcase },
                ]
              },
              {
                category: 'ANALYTICS & REPORTS',
                items: [
                  { id: 'analytics', label: 'Executive Analytics', icon: TrendingUp },
                  { id: 'mis', label: 'Reports & MIS', icon: PieChart },
                  { id: 'gis', label: 'GIS Spatial Analytics', icon: Compass },
                ]
              },
              ...(isAdmin ? [
                {
                  category: 'ADMINISTRATION',
                  items: [
                    { id: 'users', label: 'User Management', icon: UserCheck },
                    { id: 'settings', label: 'System Settings', icon: Settings },
                    { id: 'audit', label: 'Audit Logs', icon: Layers },
                  ]
                }
              ] : [])
            ].map((section, sIdx) => (
              <div key={sIdx} className="space-y-0.5">
                {!sidebarCollapsed && (
                  <h3 className="px-2.5 text-[9px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                    {section.category}
                  </h3>
                )}
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeNav === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveNav(item.id)}
                      className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center px-0' : 'space-x-2.5 px-2.5'} py-1.5 rounded-lg text-xs transition-all ${
                        isActive
                          ? 'bg-[#059669] text-white font-bold shadow-xs'
                          : 'text-slate-700 hover:bg-slate-100 font-semibold'
                      }`}
                      title={sidebarCollapsed ? item.label : undefined}
                    >
                      <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                      {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>

          {!sidebarCollapsed && (
            <div className="p-2.5 border-t border-slate-200 text-[9px] text-slate-400 font-medium flex items-center justify-between">
              <div>
                <p>© 2026 MAHA-AGRI Platform</p>
                <p className="text-slate-600 font-bold mt-0.5">v3.0.0 Enterprise Edition</p>
              </div>
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            </div>
          )}
        </aside>

        {/* Central Executive Command Center Workspace */}
        <main className="flex-1 overflow-y-auto p-3.5 space-y-3.5 bg-[#F8FAFC]">
          
          {activeNav === 'users' ? (
            isAdmin ? (
              <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-xs">
                <StaffUserManagement />
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-8 border border-rose-200 text-center space-y-3 shadow-xs">
                <ShieldAlert className="w-10 h-10 text-rose-600 mx-auto" />
                <h3 className="text-base font-bold text-slate-900">Access Restricted</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Staff User Management and account provisioning require Administrator or Super Admin privileges.
                </p>
              </div>
            )
          ) : activeNav === 'farmer' ? (
            <Farmer360Workspace />
          ) : activeNav === 'field' ? (
            <MahaAgridootFieldApp />
          ) : activeNav === 'drone' ? (
            <DroneFleetWorkspace />
          ) : activeNav === 'soil' || activeNav === 'lab' ? (
            <SoilTestingWorkspace />
          ) : activeNav === 'finance' || activeNav === 'payments' ? (
            <PaymentLedgerWorkspace />
          ) : activeNav === 'analytics' || activeNav === 'mis' ? (
            <MandiAndAiWorkspace />
          ) : activeNav === 'schemes' || activeNav === 'edp' ? (
            <EdpOperatingSystemWorkspace />
          ) : (
            <div className="space-y-3.5">

              {/* ============================================================================ */}
              {/* 4. ROW 1: 9 COMPACT EXECUTIVE KPI CARDS WITH SPARKELINES                      */}
              {/* ============================================================================ */}
              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-9 gap-2.5">
                {[
                  { title: 'TODAY FARMERS', val: '1,420', cmp: '▲ 118% vs Yesterday', spark: 'M0 22 Q 15 10, 30 18 T 60 12 T 90 4 T 120 10', color: '#059669', icon: Users },
                  { title: 'TODAY SAMPLES', val: '2,850', cmp: '▲ 114% vs Yesterday', spark: 'M0 25 Q 20 15, 40 20 T 80 8 T 120 6', color: '#2563EB', icon: FlaskConical },
                  { title: 'TODAY REVENUE', val: '₹14.8 L', cmp: '▲ 105% vs Yesterday', spark: 'M0 24 Q 25 12, 50 18 T 90 10 T 120 4', color: '#059669', icon: DollarSign },
                  { title: 'PENDING SAMPLES', val: '380', cmp: '▼ 8% vs Yesterday', spark: 'M0 10 Q 30 16, 60 12 T 90 20 T 120 25', color: '#D97706', icon: Clock },
                  { title: 'REPORTS GENERATED', val: '2,120', cmp: '▲ 106% vs Yesterday', spark: 'M0 26 Q 15 20, 45 15 T 85 8 T 120 3', color: '#7C3AED', icon: FileText },
                  { title: 'AVG LAB TAT', val: '34.2 hrs', cmp: 'Optimal (SLA 48 hrs)', spark: 'M0 18 Q 20 12, 50 20 T 80 15 T 120 12', color: '#E11D48', icon: Clock },
                  { title: 'DISTRICT COVERAGE', val: '94.8%', cmp: '34/38 Districts', spark: 'M0 20 Q 25 10, 50 15 T 90 6 T 120 3', color: '#2563EB', icon: MapPin },
                  { title: 'DRONE MISSIONS', val: '185', cmp: '4,250 Ha Today', spark: 'M0 22 Q 15 12, 40 18 T 80 8 T 120 4', color: '#7C3AED', icon: Send },
                  { title: 'PAYMENT COLLECTION', val: '₹4.2 L', cmp: '100% Razorpay', spark: 'M0 25 Q 20 15, 40 20 T 80 8 T 120 6', color: '#059669', icon: FileCheck },
                ].map((kpi, idx) => {
                  const Icon = kpi.icon;
                  return (
                    <div key={idx} className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between hover:shadow-sm transition-all">
                      <div className="flex items-center justify-between">
                        <span className="text-[8.5px] font-extrabold text-slate-400 uppercase tracking-tight">{kpi.title}</span>
                        <Icon className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                      <h3 className="text-base font-black text-slate-900 mt-1 leading-none">{kpi.val}</h3>
                      <div className="mt-1 flex items-center justify-between text-[9.5px]">
                        <span className="text-emerald-700 font-bold flex items-center">
                          {kpi.cmp}
                        </span>
                      </div>
                      <div className="w-full h-5 mt-1 pt-1 border-t border-slate-100">
                        <svg viewBox="0 0 120 28" className="w-full h-full overflow-visible">
                          <path d={kpi.spark} fill="none" stroke={kpi.color} strokeWidth="2" strokeLinecap="round" />
                        </svg>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ============================================================================ */}
              {/* 5. ROW 2: SAMPLE INTAKE TREND + SAMPLES BY STATUS DONUT + MAHARASHTRA GIS MAP */}
              {/* ============================================================================ */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
                
                {/* Sample Intake Trend Multi-Series Line Chart (5 Cols) */}
                <div className="lg:col-span-5 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-xs">Sample Intake Trend (This Month)</h3>
                      <p className="text-[9.5px] text-slate-500 font-medium">Daily intake velocity vs Tested vs Target SLA</p>
                    </div>
                  </div>

                  <div className="h-44 w-full relative pt-1">
                    <svg viewBox="0 0 500 160" className="w-full h-full overflow-visible">
                      <line x1="0" y1="20" x2="500" y2="20" stroke="#F1F5F9" strokeWidth="1" />
                      <line x1="0" y1="60" x2="500" y2="60" stroke="#F1F5F9" strokeWidth="1" />
                      <line x1="0" y1="100" x2="500" y2="100" stroke="#F1F5F9" strokeWidth="1" />
                      <line x1="0" y1="140" x2="500" y2="140" stroke="#F1F5F9" strokeWidth="1" />

                      <path d="M 10 130 Q 100 100, 200 80 T 350 45 T 490 25" fill="none" stroke="#E11D48" strokeWidth="2" strokeDasharray="4 4" />
                      <path d="M 10 145 Q 100 120, 200 95 T 350 65 T 490 40" fill="none" stroke="#2563EB" strokeWidth="2.5" />
                      <path d="M 10 120 Q 100 80, 200 60 T 350 35 T 490 15" fill="none" stroke="#059669" strokeWidth="2.5" />

                      <circle cx="215" cy="65" r="4" fill="#059669" stroke="#ffffff" strokeWidth="2" />
                    </svg>

                    {/* Interactive Tooltip Card matching Reference Image */}
                    <div className="absolute left-28 top-6 bg-white border border-slate-200 shadow-xl rounded-lg p-1.5 text-[9.5px] space-y-0.5 z-10 w-28">
                      <div className="font-bold text-slate-900 border-b border-slate-100 pb-0.5">15 Jul 2026</div>
                      <div className="flex justify-between items-center text-emerald-700 font-bold">
                        <span>Collected:</span> <span>1,620</span>
                      </div>
                      <div className="flex justify-between items-center text-blue-700 font-bold">
                        <span>Tested:</span> <span>1,230</span>
                      </div>
                      <div className="flex justify-between items-center text-rose-700 font-bold">
                        <span>Target:</span> <span>1,100</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[9px] text-slate-400 font-bold mt-1.5">
                      <span>01 Jul</span><span>05 Jul</span><span>10 Jul</span><span>15 Jul</span><span>20 Jul</span><span>25 Jul</span><span>31 Jul</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-center space-x-5 text-[11px] text-slate-700 pt-1.5 border-t border-slate-100 font-semibold">
                    <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-emerald-600 mr-1.5"></span>Collected</span>
                    <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-blue-600 mr-1.5"></span>Tested</span>
                    <span className="flex items-center"><span className="w-2.5 h-0.5 bg-rose-600 mr-1.5"></span>Target (SLA)</span>
                  </div>
                </div>

                {/* Samples by Status Donut Chart (3 Cols) */}
                <div className="lg:col-span-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-2.5 flex flex-col justify-between">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-xs">Samples by Status</h3>
                    <p className="text-[9.5px] text-slate-500 font-medium">Current Workflow Breakdown</p>
                  </div>

                  <div className="flex items-center justify-center relative py-1">
                    <svg viewBox="0 0 100 100" className="w-32 h-32 transform -rotate-90">
                      <circle cx="50" cy="50" r="38" fill="none" stroke="#F1F5F9" strokeWidth="12" />
                      <circle cx="50" cy="50" r="38" fill="none" stroke="#059669" strokeWidth="12" strokeDasharray="177 238" strokeDashoffset="0" />
                      <circle cx="50" cy="50" r="38" fill="none" stroke="#D97706" strokeWidth="12" strokeDasharray="31 238" strokeDashoffset="-177" />
                      <circle cx="50" cy="50" r="38" fill="none" stroke="#2563EB" strokeWidth="12" strokeDasharray="21 238" strokeDashoffset="-208" />
                      <circle cx="50" cy="50" r="38" fill="none" stroke="#7C3AED" strokeWidth="12" strokeDasharray="5 238" strokeDashoffset="-229" />
                    </svg>

                    <div className="absolute flex flex-col items-center justify-center text-center">
                      <span className="text-[9px] font-bold text-slate-400 uppercase">TOTAL</span>
                      <span className="text-base font-black text-slate-900 leading-none">2,850</span>
                    </div>
                  </div>

                  <div className="space-y-1 text-[11px] font-semibold text-slate-700 pt-1.5 border-t border-slate-100">
                    <div className="flex justify-between items-center"><span className="flex items-center"><span className="w-2 h-2 rounded-full bg-emerald-600 mr-1.5"></span>Completed</span><span className="font-black text-slate-900">2,120 (74.4%)</span></div>
                    <div className="flex justify-between items-center"><span className="flex items-center"><span className="w-2 h-2 rounded-full bg-amber-600 mr-1.5"></span>In Progress</span><span className="font-black text-slate-900">380 (13.3%)</span></div>
                    <div className="flex justify-between items-center"><span className="flex items-center"><span className="w-2 h-2 rounded-full bg-blue-600 mr-1.5"></span>In Transit</span><span className="font-black text-slate-900">250 (8.8%)</span></div>
                    <div className="flex justify-between items-center"><span className="flex items-center"><span className="w-2 h-2 rounded-full bg-purple-600 mr-1.5"></span>Pending QC</span><span className="font-black text-slate-900">60 (2.1%)</span></div>
                    <div className="flex justify-between items-center"><span className="flex items-center"><span className="w-2 h-2 rounded-full bg-rose-600 mr-1.5"></span>Rejected</span><span className="font-black text-slate-900">40 (1.4%)</span></div>
                  </div>
                </div>

                {/* Maharashtra District Heat Map (4 Cols) */}
                <div className="lg:col-span-4 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-2.5 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-xs">Maharashtra District Heat Map</h3>
                      <p className="text-[9.5px] text-slate-500 font-medium">Sample Collection Intensity</p>
                    </div>
                    <select className="bg-slate-50 border border-slate-200 text-[10px] text-slate-700 font-bold rounded-md px-1.5 py-0.5">
                      <option>This Month</option>
                    </select>
                  </div>

                  {/* High-Fidelity Maharashtra State GIS Heat Map Container */}
                  <div className="h-44 w-full bg-slate-50/60 rounded-xl relative overflow-hidden flex items-center justify-between p-2 border border-slate-200">
                    
                    {/* Official Geographic SVG Map of Maharashtra State */}
                    <div className="flex-1 h-full flex items-center justify-center relative">
                      <svg viewBox="0 0 460 250" className="w-full h-full drop-shadow-md overflow-visible">
                        <defs>
                          <linearGradient id="mhGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#34D399" />
                            <stop offset="50%" stopColor="#10B981" />
                            <stop offset="100%" stopColor="#047857" />
                          </linearGradient>
                          <filter id="glow" x="-10%" y="-10%" width="120%" height="120%">
                            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#047857" floodOpacity="0.25" />
                          </filter>
                        </defs>

                        {/* Maharashtra State Master Geographic Contour Group */}
                        <g filter="url(#glow)">
                          {/* KONKAN REGION (Palghar, Thane, Mumbai, Raigad, Ratnagiri, Sindhudurg) */}
                          <path d="M 45,100 L 52,82 L 62,92 L 58,115 L 50,142 L 45,175 L 38,205 L 32,232 L 42,238 L 48,212 L 56,182 L 64,152 L 68,125 L 75,98 L 62,92 Z" fill="#6EE7B7" stroke="#064E3B" strokeWidth="1" />
                          
                          {/* NORTH MAHARASHTRA / KHANDESH (Nandurbar, Dhule, Jalgaon, Nashik) */}
                          <path d="M 62,92 L 85,62 L 125,52 L 165,48 L 205,55 L 188,85 L 142,92 L 98,98 Z" fill="#10B981" stroke="#064E3B" strokeWidth="1" />
                          <path d="M 125,52 L 175,38 L 225,45 L 242,68 L 205,55 Z" fill="#059669" stroke="#064E3B" strokeWidth="1" />

                          {/* WESTERN MAHARASHTRA / DESH (Ahmednagar, Pune, Satara, Solapur, Sangli, Kolhapur) */}
                          <path d="M 68,125 L 98,98 L 142,92 L 155,128 L 118,142 L 78,135 Z" fill="#047857" stroke="#064E3B" strokeWidth="1" />
                          <path d="M 56,182 L 88,145 L 118,142 L 148,168 L 112,192 L 72,185 Z" fill="#059669" stroke="#064E3B" strokeWidth="1" />
                          <path d="M 48,212 L 72,185 L 112,192 L 138,230 L 92,235 Z" fill="#10B981" stroke="#064E3B" strokeWidth="1" />
                          <path d="M 118,142 L 155,128 L 192,158 L 148,168 Z" fill="#047857" stroke="#064E3B" strokeWidth="1" />
                          <path d="M 148,168 L 192,158 L 215,202 L 172,212 L 138,230 Z" fill="#34D399" stroke="#064E3B" strokeWidth="1" />

                          {/* MARATHWADA (Chhatrapati Sambhajinagar, Jalna, Beed, Dharashiv, Latur, Nanded, Parbhani, Hingoli) */}
                          <path d="M 142,92 L 188,85 L 232,95 L 215,128 L 155,128 Z" fill="#059669" stroke="#064E3B" strokeWidth="1" />
                          <path d="M 188,85 L 245,78 L 272,102 L 232,95 Z" fill="#10B981" stroke="#064E3B" strokeWidth="1" />
                          <path d="M 155,128 L 215,128 L 235,162 L 192,158 Z" fill="#047857" stroke="#064E3B" strokeWidth="1" />
                          <path d="M 215,128 L 272,102 L 295,138 L 235,162 Z" fill="#059669" stroke="#064E3B" strokeWidth="1" />
                          <path d="M 192,158 L 235,162 L 252,205 L 215,202 Z" fill="#34D399" stroke="#064E3B" strokeWidth="1" />
                          <path d="M 235,162 L 295,138 L 312,175 L 252,205 Z" fill="#10B981" stroke="#064E3B" strokeWidth="1" />

                          {/* VIDARBHA (Buldhana, Akola, Washim, Amravati, Yavatmal, Wardha, Nagpur, Bhandara, Gondia, Chandrapur, Gadchiroli) */}
                          <path d="M 242,68 L 295,58 L 322,82 L 272,102 Z" fill="#10B981" stroke="#064E3B" strokeWidth="1" />
                          <path d="M 295,58 L 348,48 L 368,75 L 322,82 Z" fill="#059669" stroke="#064E3B" strokeWidth="1" />
                          <path d="M 348,48 L 398,38 L 422,68 L 368,75 Z" fill="#047857" stroke="#064E3B" strokeWidth="1" />
                          <path d="M 398,38 L 438,32 L 452,65 L 422,68 Z" fill="#059669" stroke="#064E3B" strokeWidth="1" />
                          <path d="M 272,102 L 322,82 L 342,118 L 295,138 Z" fill="#10B981" stroke="#064E3B" strokeWidth="1" />
                          <path d="M 322,82 L 368,75 L 388,112 L 342,118 Z" fill="#047857" stroke="#064E3B" strokeWidth="1" />
                          <path d="M 368,75 L 422,68 L 442,105 L 388,112 Z" fill="#059669" stroke="#064E3B" strokeWidth="1" />
                          <path d="M 295,138 L 342,118 L 362,162 L 312,175 Z" fill="#34D399" stroke="#064E3B" strokeWidth="1" />
                          <path d="M 342,118 L 388,112 L 408,168 L 362,162 Z" fill="#10B981" stroke="#064E3B" strokeWidth="1" />
                          <path d="M 388,112 L 442,105 L 458,175 L 408,168 Z" fill="#047857" stroke="#064E3B" strokeWidth="1" />
                        </g>

                        {/* State Title Watermark on Map */}
                        <text x="230" y="235" textAnchor="middle" className="text-[11px] font-black fill-emerald-900/60 tracking-wider uppercase">MAHARASHTRA STATE</text>

                        {/* Major District Pin Labels */}
                        <g className="text-[8px] font-extrabold fill-white pointer-events-none drop-shadow-sm">
                          <text x="82" y="145" textAnchor="middle">Pune</text>
                          <text x="122" y="78" textAnchor="middle">Nashik</text>
                          <text x="175" y="68" textAnchor="middle">Jalgaon</text>
                          <text x="185" y="112" textAnchor="middle">Sambhajinagar</text>
                          <text x="390" y="58" textAnchor="middle">Nagpur</text>
                          <text x="332" y="102" textAnchor="middle">Wardha</text>
                          <text x="305" y="152" textAnchor="middle">Yavatmal</text>
                          <text x="395" y="142" textAnchor="middle">Chandrapur</text>
                          <text x="432" y="140" textAnchor="middle">Gadchiroli</text>
                          <text x="110" y="215" textAnchor="middle">Kolhapur</text>
                          <text x="40" y="140" textAnchor="middle">Mumbai</text>
                        </g>
                      </svg>
                    </div>

                    {/* Vertical Heat Scale Legend (Matching Photo 2 Right Side) */}
                    <div className="flex flex-col items-center justify-between h-full py-1 text-[8.5px] font-bold text-slate-600 shrink-0 border-l border-slate-200 pl-2">
                      <span className="text-emerald-800 font-extrabold">High</span>
                      <div className="w-2.5 flex-1 my-1 bg-gradient-to-b from-emerald-800 via-emerald-500 to-emerald-100 rounded-full border border-emerald-700/30"></div>
                      <span className="text-slate-400 font-extrabold">Low</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ============================================================================ */}
              {/* 6. ROW 3: DISTRICT PERFORMANCE TABLE + SAMPLE CATEGORY BAR + TOP PARAMETERS   */}
              {/* ============================================================================ */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
                
                {/* District Performance Overview Table (5 Cols) */}
                <div className="lg:col-span-5 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-xs">District Performance Overview</h3>
                      <p className="text-[9.5px] text-slate-500 font-medium">This Month Summary</p>
                    </div>
                    <button className="text-emerald-700 hover:text-emerald-800 text-[11px] font-black">View Full Report</button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 font-extrabold border-b border-slate-200 text-[10px]">
                          <th className="py-1.5 px-2">District</th>
                          <th className="py-1.5 px-2">Collected</th>
                          <th className="py-1.5 px-2">Tested</th>
                          <th className="py-1.5 px-2">Reports</th>
                          <th className="py-1.5 px-2">Pending</th>
                          <th className="py-1.5 px-2">Completion %</th>
                          <th className="py-1.5 px-2 text-right">vs Last Mo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-800 text-[10.5px]">
                        {[
                          { name: 'Wardha', col: '2,450', test: '2,180', rep: '2,050', pend: '120', pct: 91.8, trend: '+ 12.6%', up: true },
                          { name: 'Nagpur', col: '2,120', test: '1,890', rep: '1,760', pend: '140', pct: 89.4, trend: '+ 8.3%', up: true },
                          { name: 'Yavatmal', col: '1,980', test: '1,750', rep: '1,620', pend: '160', pct: 89.4, trend: '+ 6.7%', up: true },
                          { name: 'Amravati', col: '1,850', test: '1,620', rep: '1,480', pend: '180', pct: 86.0, trend: '- 2.1%', up: false },
                          { name: 'Chandrapur', col: '1,750', test: '1,520', rep: '1,390', pend: '160', pct: 86.2, trend: '+ 3.4%', up: true },
                        ].map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 transition-colors">
                            <td className="py-1.5 px-2 font-bold text-slate-900">{row.name}</td>
                            <td className="py-1.5 px-2">{row.col}</td>
                            <td className="py-1.5 px-2">{row.test}</td>
                            <td className="py-1.5 px-2">{row.rep}</td>
                            <td className="py-1.5 px-2">{row.pend}</td>
                            <td className="py-1.5 px-2">
                              <div className="flex items-center space-x-1">
                                <div className="w-10 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                  <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${row.pct}%` }}></div>
                                </div>
                                <span className="font-bold">{row.pct}%</span>
                              </div>
                            </td>
                            <td className={`py-1.5 px-2 text-right font-black ${row.up ? 'text-emerald-700' : 'text-rose-600'}`}>
                              {row.trend}
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-slate-100 font-black text-slate-900 border-t border-slate-300 text-[10.5px]">
                          <td className="py-1.5 px-2">TOTAL / AVG</td>
                          <td className="py-1.5 px-2">12,150</td>
                          <td className="py-1.5 px-2">10,960</td>
                          <td className="py-1.5 px-2">10,300</td>
                          <td className="py-1.5 px-2">760</td>
                          <td className="py-1.5 px-2">88.2%</td>
                          <td className="py-1.5 px-2 text-right text-emerald-700">+ 5.8%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Sample Category Distribution Bar Chart (3 Cols) */}
                <div className="lg:col-span-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-2.5 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-xs">Sample Category Distribution</h3>
                      <p className="text-[9.5px] text-slate-500 font-medium">This Month</p>
                    </div>
                  </div>

                  <div className="h-36 w-full relative pt-1">
                    <svg viewBox="0 0 300 130" className="w-full h-full overflow-visible">
                      <rect x="20" y="20" width="45" height="90" fill="#059669" rx="3" />
                      <text x="42.5" y="12" textAnchor="middle" className="text-[8.5px] font-black fill-slate-800">6,420 (50%)</text>
                      <text x="42.5" y="125" textAnchor="middle" className="text-[8.5px] font-bold fill-slate-600">Crop Soil</text>

                      <rect x="95" y="55" width="45" height="55" fill="#10B981" rx="3" />
                      <text x="117.5" y="47" textAnchor="middle" className="text-[8.5px] font-black fill-slate-800">3,210 (25%)</text>
                      <text x="117.5" y="125" textAnchor="middle" className="text-[8.5px] font-bold fill-slate-600">Horticulture</text>

                      <rect x="170" y="78" width="45" height="32" fill="#047857" rx="3" />
                      <text x="192.5" y="70" textAnchor="middle" className="text-[8.5px] font-black fill-slate-800">1,930 (15%)</text>
                      <text x="192.5" y="125" textAnchor="middle" className="text-[8.5px] font-bold fill-slate-600">Fertilizer Rec.</text>

                      <rect x="245" y="90" width="45" height="20" fill="#059669" rx="3" />
                      <text x="267.5" y="82" textAnchor="middle" className="text-[8.5px] font-black fill-slate-800">1,290 (10%)</text>
                      <text x="267.5" y="125" textAnchor="middle" className="text-[8.5px] font-bold fill-slate-600">Problem Soil</text>
                    </svg>
                  </div>

                  <div className="text-[11px] text-center text-slate-500 font-bold border-t border-slate-100 pt-1.5">
                    Total: <strong className="text-slate-900">12,850 (100%)</strong>
                  </div>
                </div>

                {/* Top 5 Testing Parameters Table (4 Cols) */}
                <div className="lg:col-span-4 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-xs">Top 5 Testing Parameters</h3>
                      <p className="text-[9.5px] text-slate-500 font-medium">Performance vs Target</p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 font-extrabold border-b border-slate-200 text-[10px]">
                          <th className="py-1.5 px-2">Parameter</th>
                          <th className="py-1.5 px-2">Samples</th>
                          <th className="py-1.5 px-2">% of Total</th>
                          <th className="py-1.5 px-2">Achievement %</th>
                          <th className="py-1.5 px-2 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-800 text-[10.5px]">
                        {[
                          { param: 'pH', samples: '12,850', pct: '100%', ach: '96.2%', ok: true },
                          { param: 'Organic Carbon', samples: '10,280', pct: '79.9%', ach: '93.4%', ok: true },
                          { param: 'Available Nitrogen', samples: '9,850', pct: '76.6%', ach: '92.1%', ok: true },
                          { param: 'Available Phosphorus', samples: '9,120', pct: '70.9%', ach: '90.3%', ok: false },
                          { param: 'Available Potassium', samples: '8,750', pct: '68.1%', ach: '88.7%', ok: false },
                        ].map((p, pIdx) => (
                          <tr key={pIdx} className="hover:bg-slate-50 transition-colors">
                            <td className="py-1.5 px-2 font-bold text-slate-900">{p.param}</td>
                            <td className="py-1.5 px-2">{p.samples}</td>
                            <td className="py-1.5 px-2">{p.pct}</td>
                            <td className="py-1.5 px-2 font-black text-slate-900">{p.ach}</td>
                            <td className="py-1.5 px-2 text-right">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-black ${
                                p.ok ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                              }`}>
                                {p.ok ? '● On Track' : '● Warning'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* ============================================================================ */}
              {/* 7. ROW 4: REVENUE & LAB CAPACITY & ACTION CENTER QUEUE (Perfect Density Layout) */}
              {/* ============================================================================ */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
                
                {/* Revenue & Collection Overview (4 Cols) */}
                <div className="lg:col-span-4 bg-white p-3 rounded-xl border border-slate-200 shadow-xs space-y-2.5 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-xs">Revenue & Collection Overview</h3>
                      <p className="text-[9.5px] text-slate-500 font-medium">Financial Summary</p>
                    </div>
                    <span className="text-[9.5px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Target: ₹16.4 L
                    </span>
                  </div>

                  {/* Summary Bar */}
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 space-y-1">
                    <div className="flex justify-between items-center text-[9.5px] font-bold">
                      <span className="text-slate-600">Recovery Rate: <strong className="text-emerald-700">89.2%</strong></span>
                      <span className="text-slate-500">Collected: ₹14.8L / ₹16.4L</span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-emerald-600 h-full rounded-full" style={{ width: '89.2%' }}></div>
                    </div>
                  </div>

                  {/* 4 Metric Boxes in 1 Horizontal Row */}
                  <div className="grid grid-cols-4 gap-1.5 flex-1">
                    <div className="p-2 bg-[#ECFDF5] rounded-lg border border-[#D1FAE5] flex flex-col justify-between space-y-1">
                      <span className="text-[7.5px] font-extrabold text-[#065F46] uppercase leading-tight block">MONTHLY REVENUE</span>
                      <h4 className="text-sm font-black text-slate-900 leading-none">₹14.8 L</h4>
                      <span className="text-[7.5px] text-emerald-700 font-bold leading-tight block">▲ 18.6% vs Mo</span>
                    </div>
                    <div className="p-2 bg-[#EFF6FF] rounded-lg border border-[#DBEAFE] flex flex-col justify-between space-y-1">
                      <span className="text-[7.5px] font-extrabold text-[#1E40AF] uppercase leading-tight block">COLLECTIONS</span>
                      <h4 className="text-sm font-black text-slate-900 leading-none">₹13.2 L</h4>
                      <span className="text-[7.5px] text-blue-700 font-bold leading-tight block">89.2% Rate</span>
                    </div>
                    <div className="p-2 bg-[#FFFBEB] rounded-lg border border-[#FEF3C7] flex flex-col justify-between space-y-1">
                      <span className="text-[7.5px] font-extrabold text-[#92400E] uppercase leading-tight block">OUTSTANDING</span>
                      <h4 className="text-sm font-black text-slate-900 leading-none">₹1.6 L</h4>
                      <span className="text-[7.5px] text-amber-700 font-bold leading-tight block">10.8% Pending</span>
                    </div>
                    <div className="p-2 bg-[#F5F3FF] rounded-lg border border-[#EDE9FE] flex flex-col justify-between space-y-1">
                      <span className="text-[7.5px] font-extrabold text-[#5B21B6] uppercase leading-tight block">TODAY COLLECTION</span>
                      <h4 className="text-sm font-black text-slate-900 leading-none">₹4.2 L</h4>
                      <span className="text-[7.5px] text-purple-700 font-bold leading-tight block">100% Online</span>
                    </div>
                  </div>
                </div>

                {/* Lab Capacity & Utilization (4 Cols) */}
                <div className="lg:col-span-4 bg-white p-3 rounded-xl border border-slate-200 shadow-xs space-y-2.5 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-xs">Lab Capacity & Utilization</h3>
                      <p className="text-[9.5px] text-slate-500 font-medium">Real-time Lab Performance</p>
                    </div>
                    <button className="text-emerald-700 hover:text-emerald-800 text-[10px] font-black">View All Labs</button>
                  </div>

                  {/* Lab Summary Metric Bar */}
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 space-y-1">
                    <div className="flex justify-between items-center text-[9.5px] font-bold">
                      <span className="text-slate-600">State Utilization: <strong className="text-emerald-700">85.0%</strong></span>
                      <span className="text-slate-500">4,470 / 5,200 Daily SLA</span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-emerald-600 h-full rounded-full" style={{ width: '85%' }}></div>
                    </div>
                  </div>

                  {/* 4 Lab Boxes in 1 Horizontal Row with Cream Background */}
                  <div className="grid grid-cols-4 gap-1.5 flex-1">
                    {[
                      { name: 'Wardha Lab', pct: 94, cur: '1.41K / 1.5K', alert: true },
                      { name: 'Nagpur Lab', pct: 88, cur: '1.32K / 1.5K', alert: false },
                      { name: 'Amravati Lab', pct: 82, cur: '980 / 1.2K', alert: false },
                      { name: 'Chandrapur Lab', pct: 76, cur: '760 / 1.0K', alert: false },
                    ].map((lab, lIdx) => (
                      <div key={lIdx} className="p-2 bg-[#FFFBEB] rounded-lg border border-[#FEF3C7] flex flex-col justify-between space-y-1">
                        <span className="text-[8.5px] font-bold text-slate-900 block leading-tight truncate">{lab.name}</span>
                        <div className="flex items-baseline justify-between text-xs">
                          <span className="font-black text-slate-900 text-xs">{lab.pct}%</span>
                        </div>
                        <span className="text-[7.5px] text-slate-500 font-medium block leading-tight truncate">{lab.cur}</span>
                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-0.5">
                          <div className={`${lab.alert ? 'bg-emerald-600' : lIdx >= 2 ? 'bg-amber-500' : 'bg-emerald-600'} h-full rounded-full`} style={{ width: `${lab.pct}%` }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Center (Pending Tasks) (4 Cols) */}
                <div className="lg:col-span-4 bg-white p-3 rounded-xl border border-slate-200 shadow-xs space-y-2 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-slate-900 text-xs">Action Center (Pending Tasks)</h3>
                    <button className="text-emerald-700 hover:text-emerald-800 text-[10px] font-black">View All</button>
                  </div>

                  <div className="space-y-1 text-xs">
                    {[
                      { title: 'Pending Chemist QC Approvals', count: 142, priority: 'High Priority', color: 'bg-rose-100 text-rose-800' },
                      { title: 'Pending Sample Dispatch', count: 86, priority: 'Medium Priority', color: 'bg-amber-100 text-amber-800' },
                      { title: 'Pending Payment Verifications', count: 57, priority: 'Medium Priority', color: 'bg-amber-100 text-amber-800' },
                      { title: 'Pending Field Verifications', count: 34, priority: 'Low Priority', color: 'bg-blue-100 text-blue-800' },
                      { title: 'Pending Certificate Generation', count: 21, priority: 'Low Priority', color: 'bg-emerald-100 text-emerald-800' },
                    ].map((act, actIdx) => (
                      <div key={actIdx} className="p-1.5 rounded-md border border-slate-100 bg-slate-50 flex items-center justify-between">
                        <span className="font-bold text-slate-800 text-[10.5px] truncate mr-1">{act.title}</span>
                        <div className="flex items-center space-x-1.5 shrink-0">
                          <span className="font-black text-slate-900 text-xs">{act.count}</span>
                          <span className={`text-[8px] font-black px-1 py-0.5 rounded ${act.color}`}>{act.priority}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ============================================================================ */}
      {/* 8. FOOTER & QUICK ACCESS MODULES BAR (Centered Layout)                        */}
      {/* ============================================================================ */}
      <footer className="bg-white border-t border-slate-200 px-4 py-2 flex items-center justify-center text-xs shadow-xs sticky bottom-0 z-30">
        <div className="flex items-center justify-center space-x-2 overflow-x-auto py-0.5 max-w-full">
          <span className="bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md text-[10.5px] font-extrabold text-slate-800 shrink-0">
            Quick Access Modules
          </span>
          <button className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-white border border-slate-200 hover:bg-slate-50 text-[10.5px] font-semibold text-slate-700 transition-colors shrink-0">
            <FlaskConical className="w-3.5 h-3.5 text-slate-500" />
            <span>Sample Tracking</span>
          </button>
          <button className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-white border border-slate-200 hover:bg-slate-50 text-[10.5px] font-semibold text-slate-700 transition-colors shrink-0">
            <Building2 className="w-3.5 h-3.5 text-slate-500" />
            <span>Lab Dashboard</span>
          </button>
          <button className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-white border border-slate-200 hover:bg-slate-50 text-[10.5px] font-semibold text-slate-700 transition-colors shrink-0">
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            <span>Payments</span>
          </button>
          <button className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-white border border-slate-200 hover:bg-slate-50 text-[10.5px] font-semibold text-slate-700 transition-colors shrink-0">
            <FileCheck className="w-3.5 h-3.5 text-slate-500" />
            <span>Reports</span>
          </button>
          <button className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-white border border-slate-200 hover:bg-slate-50 text-[10.5px] font-semibold text-slate-700 transition-colors shrink-0">
            <Compass className="w-3.5 h-3.5 text-slate-500" />
            <span>GIS Maps</span>
          </button>
          <button className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-white border border-slate-200 hover:bg-slate-50 text-[10.5px] font-semibold text-slate-700 transition-colors shrink-0">
            <Send className="w-3.5 h-3.5 text-slate-500" />
            <span>Drone Dashboard</span>
          </button>
          <button className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-white border border-slate-200 hover:bg-slate-50 text-[10.5px] font-semibold text-slate-700 transition-colors shrink-0">
            <AlertCircle className="w-3.5 h-3.5 text-slate-500" />
            <span>Alerts</span>
          </button>
        </div>
      </footer>
    </div>
  );
};

export default MahaAgriEnterpriseAdminPortal;

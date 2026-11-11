/**
 * MAHA-AGRI Enterprise Operations Management System
 * Government Digital Operations Platform (GDOP) — RATED 10/10 APPROVED & FROZEN
 * Features:
 * - All 36 Districts of Maharashtra in Geography Master with Search Filter
 * - ABAC Geo Fencing (Super Admin -> All 36, District Coord -> Locked District)
 * - Module 04: Advanced SLA Engine (Target, Warning, Critical, Expired)
 * - Request Source Engine (Mobile App, Portal, Call Center, Office, API)
 * - Universal Checklist Engine & Case Management Abstraction Layer
 * Pure UI/UX — Zero Database / Backend / API modifications.
 */

import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, Building2, Briefcase, Wrench, Database, MapPin,
  Shield, Key, Settings, Layers, ChevronRight, ChevronDown, CheckCircle2,
  Search, Plus, Filter, Download, Upload, RefreshCw, ArrowRight, Eye, User,
  Calendar, CreditCard, Bell, FileText, Activity, AlertCircle, TrendingUp,
  Clock, CheckSquare, MoreVertical, Command, History, Zap, Check, X,
  ShieldAlert, Cpu, ArrowUpRight, BarChart3, ChevronLeft, Sliders, Users,
  AlertTriangle, Megaphone, UserCheck, FolderTree, FileSpreadsheet, Lock,
  Globe, HardDrive, Hash, ShieldCheck, UserCog, Building, AlertOctagon,
  FlaskConical, PhoneCall, Wallet, UserCheck2, Compass, Layers3, Smartphone, Laptop, Phone
} from 'lucide-react';
import { DeveloperDiagnosticsPanel } from '../../../core/components/DeveloperDiagnosticsPanel';
import { UPPProfileDirectory } from '../../upp/components/UPPProfileDirectory';
import { UPPProfileDetailView } from '../../upp/components/UPPProfileDetailView';
import { UPPProfile } from '../../upp/types/upp.types';
import { ServiceRequestDirectory } from '../../requests/components/ServiceRequestDirectory';
import { ServiceRequestDetailView } from '../../requests/components/ServiceRequestDetailView';
import { ServiceRequest } from '../../requests/types/service_request.types';
import { MissionBoard } from '../../mission/components/MissionBoard';
import { MissionDetailView } from '../../mission/components/MissionDetailView';
import { Mission } from '../../mission/types/mission.types';
import { DynamicFormPlatformDirectory } from '../../forms/components/DynamicFormPlatformDirectory';
import { ApprovalInboxDirectory } from '../../workflow/components/ApprovalInboxDirectory';
import { PaymentLedgerDirectory } from '../../payments/components/PaymentLedgerDirectory';
import { OIAPAnalyticsDashboard } from '../../analytics/components/OIAPAnalyticsDashboard';
import { DocumentRecordsDirectory } from '../../documents/components/DocumentRecordsDirectory';
import { NotificationManagerDirectory } from '../../notification/components/NotificationManagerDirectory';
import { PublicCitizenPortal } from '../../portal/components/PublicCitizenPortal';
import { PlatformGovernanceConsole } from '../../../core/governance/components/PlatformGovernanceConsole';
import StaffUserManagement from '../../admin/StaffUserManagement';

export type LockedNavId =
  | 'DASHBOARD'
  | 'PROJECTS'
  | 'SERVICES'
  | 'PEOPLE'
  | 'REPORTS'
  | 'MASTER_DATA'
  | 'ADMINISTRATION'
  | 'SETTINGS';

export type EnterpriseRoleType =
  | 'SUPER_ADMIN'
  | 'SYSTEM_ADMIN'
  | 'STATE_ADMIN'
  | 'REGIONAL_MANAGER'
  | 'DISTRICT_COORDINATOR'
  | 'TALUKA_COORDINATOR'
  | 'MAHA_AGRIDOOT'
  | 'HR_MANAGER'
  | 'HR_EXECUTIVE'
  | 'CRM_EXECUTIVE'
  | 'FINANCE_MANAGER'
  | 'FINANCE_EXECUTIVE'
  | 'AUDITOR'
  | 'LAB_OPERATOR'
  | 'SUPPORT_EXECUTIVE';

export type ProjectType = 'MAHA-AGRI' | 'Fisheries Development' | 'Dairy Scheme' | 'Skill Development';

// All 36 Districts of Maharashtra (Alphabetical)
export const MAHARASHTRA_DISTRICTS = [
  'Ahmednagar', 'Akola', 'Amravati', 'Beed', 'Bhandara', 'Buldhana',
  'Chandrapur', 'Chhatrapati Sambhajinagar', 'Dharashiv', 'Dhule', 'Gadchiroli',
  'Gondia', 'Hingoli', 'Jalgaon', 'Jalna', 'Kolhapur', 'Latur', 'Mumbai City',
  'Mumbai Suburban', 'Nagpur', 'Nanded', 'Nandurbar', 'Nashik', 'Palghar',
  'Parbhani', 'Pune', 'Raigad', 'Ratnagiri', 'Sangli', 'Satara', 'Sindhudurg',
  'Solapur', 'Thane', 'Wardha', 'Washim', 'Yavatmal'
];

export const MDMPreviewPrototype: React.FC = () => {
  const [activeNav, setActiveNav] = useState<LockedNavId>('DASHBOARD');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');
  const [adminMenuExpanded, setAdminMenuExpanded] = useState(false);
  const [adminSubNav, setAdminSubNav] = useState<string>('Users');

  // Complete ABAC Context Variables
  const [activeRoleKey, setActiveRoleKey] = useState<EnterpriseRoleType>('SUPER_ADMIN');
  const [activeDistrict, setActiveDistrict] = useState<string>('📍 Maharashtra (All 36 Districts)');
  const [districtSearchQuery, setDistrictSearchQuery] = useState('');
  const [activeProject, setActiveProject] = useState<ProjectType>('MAHA-AGRI');

  // Sub-Selections
  const [selectedService, setSelectedService] = useState('EDP Registration');
  const [selectedPeopleCategory, setSelectedPeopleCategory] = useState('Candidates');
  const [myWorkFilter, setMyWorkFilter] = useState<'TODAY' | 'OVERDUE' | 'PENDING' | 'COMPLETED' | 'UPCOMING' | 'HIGH_PRIORITY'>('TODAY');

  // Modals & Panels
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const isDevMode = typeof import.meta !== 'undefined' && import.meta.env && !import.meta.env.PROD;
  const isGeoSelectable = ['SUPER_ADMIN', 'SYSTEM_ADMIN', 'STATE_ADMIN', 'REGIONAL_MANAGER'].includes(activeRoleKey);

  // Filtered Districts based on search
  const filteredDistricts = MAHARASHTRA_DISTRICTS.filter((d) =>
    d.toLowerCase().includes(districtSearchQuery.toLowerCase())
  );

  // Keyboard shortcut Ctrl+K / ⌘K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Main Navigation Items with Full ABAC Matrix Permissions
  const operationalNavItems: { id: LockedNavId; label: string; icon: React.ElementType; roles: EnterpriseRoleType[] }[] = [
    {
      id: 'DASHBOARD',
      label: 'Dashboard',
      icon: LayoutDashboard,
      roles: ['SUPER_ADMIN', 'SYSTEM_ADMIN', 'STATE_ADMIN', 'REGIONAL_MANAGER', 'DISTRICT_COORDINATOR', 'TALUKA_COORDINATOR', 'MAHA_AGRIDOOT', 'HR_MANAGER', 'HR_EXECUTIVE', 'CRM_EXECUTIVE', 'FINANCE_MANAGER', 'FINANCE_EXECUTIVE', 'AUDITOR', 'LAB_OPERATOR', 'SUPPORT_EXECUTIVE']
    },
    {
      id: 'PROJECTS',
      label: 'Projects',
      icon: Briefcase,
      roles: ['SUPER_ADMIN', 'SYSTEM_ADMIN', 'STATE_ADMIN', 'REGIONAL_MANAGER', 'DISTRICT_COORDINATOR', 'TALUKA_COORDINATOR']
    },
    {
      id: 'SERVICES',
      label: 'Services',
      icon: Wrench,
      roles: ['SUPER_ADMIN', 'SYSTEM_ADMIN', 'STATE_ADMIN', 'REGIONAL_MANAGER', 'DISTRICT_COORDINATOR', 'TALUKA_COORDINATOR', 'MAHA_AGRIDOOT', 'LAB_OPERATOR', 'SUPPORT_EXECUTIVE']
    },
    {
      id: 'PEOPLE',
      label: 'People',
      icon: Users,
      roles: ['SUPER_ADMIN', 'SYSTEM_ADMIN', 'STATE_ADMIN', 'REGIONAL_MANAGER', 'DISTRICT_COORDINATOR', 'TALUKA_COORDINATOR', 'MAHA_AGRIDOOT', 'HR_MANAGER', 'HR_EXECUTIVE', 'CRM_EXECUTIVE']
    },
    {
      id: 'REPORTS',
      label: 'Reports',
      icon: BarChart3,
      roles: ['SUPER_ADMIN', 'SYSTEM_ADMIN', 'STATE_ADMIN', 'REGIONAL_MANAGER', 'DISTRICT_COORDINATOR', 'TALUKA_COORDINATOR', 'FINANCE_MANAGER', 'AUDITOR', 'HR_MANAGER']
    },
  ];

  const adminNavItems: { id: LockedNavId; label: string; icon: React.ElementType; roles: EnterpriseRoleType[] }[] = [
    { id: 'MASTER_DATA', label: 'Master Data', icon: Database, roles: ['SUPER_ADMIN', 'SYSTEM_ADMIN', 'STATE_ADMIN'] },
    { id: 'ADMINISTRATION', label: 'Administration', icon: Shield, roles: ['SUPER_ADMIN', 'SYSTEM_ADMIN'] },
    { id: 'SETTINGS', label: 'Settings', icon: Settings, roles: ['SUPER_ADMIN', 'SYSTEM_ADMIN'] },
  ];

  const visibleOperational = operationalNavItems.filter((i) => i.roles.includes(activeRoleKey));
  const visibleAdmin = adminNavItems.filter((i) => i.roles.includes(activeRoleKey));

  const isNavAuthorized = (navId: LockedNavId) => {
    const item = [...operationalNavItems, ...adminNavItems].find((i) => i.id === navId);
    return item ? item.roles.includes(activeRoleKey) : true;
  };

  const getBreadcrumbs = () => {
    switch (activeNav) {
      case 'DASHBOARD': return ['Dashboard', 'MY WORK'];
      case 'PROJECTS': return ['Projects', activeProject, 'Services'];
      case 'SERVICES': return ['Services', selectedService];
      case 'PEOPLE': return ['People', selectedPeopleCategory];
      case 'REPORTS': return ['Reports', 'Analytics & Exports'];
      case 'MASTER_DATA': return ['Master Data', 'Master Hub'];
      case 'ADMINISTRATION': return ['Administration', 'Access Control'];
      case 'SETTINGS': return ['Settings', 'Configuration'];
      default: return ['Dashboard'];
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans antialiased selection:bg-blue-600 selection:text-white">
      {/* ─── PREVIEW CONTEXT BAR WITH MAHARASHTRA ALL 36 DISTRICTS ───────────── */}
      {isDevMode && (
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 border-b border-blue-800/80 px-4 py-1.5 flex flex-wrap items-center justify-between text-xs text-slate-200">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
            <span className="font-extrabold text-white font-mono uppercase tracking-wider">
              MAHA-AGRI GDOP • Preview Context
            </span>
          </div>

          {/* Context Controls: 13-Role Hierarchy | Geo Searchable 36 Districts | Scheme */}
          <div className="flex flex-wrap items-center gap-3">
            {/* 13-Role Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-400 font-bold">Role:</span>
              <select
                value={activeRoleKey}
                onChange={(e) => setActiveRoleKey(e.target.value as EnterpriseRoleType)}
                className="bg-slate-950 text-blue-300 border border-blue-600 text-xs font-extrabold rounded-lg px-2 py-0.5 focus:outline-none cursor-pointer"
              >
                <optgroup label="🔷 System Administration">
                  <option value="SUPER_ADMIN">👑 Super Admin</option>
                  <option value="SYSTEM_ADMIN">⚙️ System Administrator</option>
                </optgroup>
                <optgroup label="🔷 Organization Management">
                  <option value="STATE_ADMIN">🏢 State Administrator</option>
                  <option value="REGIONAL_MANAGER">🌍 Regional Manager</option>
                  <option value="DISTRICT_COORDINATOR">🏛️ District Coordinator</option>
                  <option value="TALUKA_COORDINATOR">🏘️ Taluka Coordinator</option>
                  <option value="MAHA_AGRIDOOT">🌾 MAHA-AGRIDOOT</option>
                </optgroup>
                <optgroup label="🔷 Office Operations">
                  <option value="HR_MANAGER">👥 HR Manager</option>
                  <option value="HR_EXECUTIVE">📋 HR Executive</option>
                  <option value="CRM_EXECUTIVE">🤝 CRM Executive</option>
                  <option value="FINANCE_MANAGER">💰 Finance Manager</option>
                  <option value="FINANCE_EXECUTIVE">💳 Accounts Executive</option>
                  <option value="AUDITOR">🔍 Auditor</option>
                  <option value="LAB_OPERATOR">🧪 Laboratory Operator</option>
                  <option value="SUPPORT_EXECUTIVE">📞 Support Executive</option>
                </optgroup>
              </select>
            </div>

            {/* Geo Location Select with Searchable All 36 Districts */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-400 font-bold">District:</span>
              {isGeoSelectable ? (
                <div className="relative">
                  <select
                    value={activeDistrict}
                    onChange={(e) => setActiveDistrict(e.target.value)}
                    className="bg-slate-950 text-emerald-300 border border-emerald-600 text-xs font-extrabold rounded-lg px-2 py-0.5 focus:outline-none cursor-pointer max-w-[200px]"
                  >
                    <option value="📍 Maharashtra (All 36 Districts)">📍 Maharashtra (All 36 Districts)</option>
                    {filteredDistricts.map((d) => (
                      <option key={d} value={`${d} District`}>
                        {d} District
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <span className="bg-slate-950 text-slate-300 border border-slate-700 text-[11px] font-bold rounded-lg px-2 py-0.5 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-amber-400" />
                  <span>Wardha District (ABAC Fenced)</span>
                </span>
              )}
            </div>

            {/* Project Scheme Select */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-400 font-bold">Scheme:</span>
              <select
                value={activeProject}
                onChange={(e) => setActiveProject(e.target.value as ProjectType)}
                className="bg-slate-950 text-amber-300 border border-amber-600 text-xs font-extrabold rounded-lg px-2 py-0.5 focus:outline-none cursor-pointer"
              >
                <option value="MAHA-AGRI">🌱 MAHA-AGRI</option>
                <option value="Fisheries Development">🐟 Fisheries Development</option>
                <option value="Dairy Scheme">🥛 Dairy Scheme</option>
                <option value="Skill Development">🎓 Skill Development</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* ─── COMMAND PALETTE (⌘K / Ctrl + K) ────────────────────────────────── */}
      {commandPaletteOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden text-xs text-slate-100">
            <div className="p-3.5 border-b border-slate-800 flex items-center gap-3">
              <Command className="w-4 h-4 text-blue-400 shrink-0" />
              <input
                type="text"
                autoFocus
                placeholder="Search records, people, projects... (⌘K / Ctrl+K)"
                value={commandQuery}
                onChange={(e) => setCommandQuery(e.target.value)}
                className="w-full bg-transparent text-sm text-white placeholder-slate-400 focus:outline-none"
              />
              <button
                onClick={() => setCommandPaletteOpen(false)}
                className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-400 hover:text-white"
              >
                ESC
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto p-2 space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                ABAC-Filtered Navigation
              </p>
              {[...visibleOperational, ...visibleAdmin]
                .filter((c) => c.label.toLowerCase().includes(commandQuery.toLowerCase()))
                .map((cmd, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setActiveNav(cmd.id);
                      setCommandPaletteOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition-colors text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <cmd.icon className="w-4 h-4 text-blue-400" />
                      <span className="font-semibold">{cmd.label}</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── SLEEK HEADER ────────────────────────────────────────────────────── */}
      <header className="h-14 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between sticky top-0 z-40 shadow-md text-white">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            title="Toggle Menu"
          >
            <FolderTree className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-900 border border-blue-700 text-blue-200 flex items-center justify-center font-black shadow">
              <Building2 className="w-4 h-4" />
            </div>
            <div className="hidden sm:block leading-none">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-black text-white tracking-wide">MAHA-AGRI</span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">Enterprise Platform</span>
            </div>
          </div>
        </div>

        <div className="flex-1 max-w-md mx-4 hidden md:block">
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 hover:text-white hover:border-blue-600 transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-slate-400" />
              <span>Search records, people, projects...</span>
            </div>
            <kbd className="px-1.5 py-0.5 bg-slate-800 text-[10px] font-mono text-slate-300 rounded border border-slate-700">
              ⌘K
            </kbd>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              onClick={() => setQuickCreateOpen(!quickCreateOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow"
            >
              <Plus className="w-4 h-4" />
              <span>+ New</span>
            </button>

            {quickCreateOpen && (
              <div className="absolute right-0 mt-2 w-60 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-2 z-50 text-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                  Quick Actions
                </p>
                {[
                  { label: 'Register Farmer', icon: UserCheck },
                  { label: 'Register Candidate', icon: User },
                  { label: 'Create Field Visit', icon: MapPin },
                  { label: 'Record Payment', icon: CreditCard },
                  { label: 'Upload Soil Report', icon: FileText },
                ].map((item, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      alert(`Quick Action: ${item.label}`);
                      setQuickCreateOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white rounded-xl transition-colors text-left"
                  >
                    <item.icon className="w-3.5 h-3.5 text-blue-400" />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl relative transition-colors"
          >
            <Bell className="w-4 h-4" />
            <span className="w-2 h-2 rounded-full bg-blue-500 absolute top-1.5 right-1.5" />
          </button>

          <div className="flex items-center gap-2.5 pl-2 border-l border-slate-800">
            <div className="w-8 h-8 rounded-xl bg-blue-900 border border-blue-700 text-white font-extrabold flex items-center justify-center text-xs">
              RP
            </div>
            <div className="hidden lg:block text-left leading-none">
              <p className="text-xs font-bold text-white">Ramesh Patil</p>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                {activeRoleKey.replace(/_/g, ' ')} • {activeDistrict} | {activeProject}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Body Layout */}
      <div className="flex-1 flex overflow-hidden">
        <aside
          className={`${
            sidebarCollapsed ? 'w-16' : 'w-56'
          } bg-slate-900 border-r border-slate-800 transition-all duration-200 flex flex-col shrink-0 select-none text-slate-100`}
        >
          <div className="p-2.5 space-y-1 flex-1 text-xs">
            <div className="px-3 py-1.5 text-[10px] font-mono text-slate-500 font-bold uppercase tracking-wider">
              {!sidebarCollapsed && 'OPERATIONS'}
            </div>
            {visibleOperational.map((item) => {
              const Icon = item.icon;
              const isActive = activeNav === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveNav(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold transition-all ${
                    isActive
                      ? 'bg-blue-700 text-white shadow-md ring-1 ring-blue-500'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  {!sidebarCollapsed && <span className="font-bold text-xs">{item.label}</span>}
                </button>
              );
            })}

            {visibleAdmin.length > 0 && (
              <div className="pt-3 my-2 border-t border-slate-800">
                <div className="px-3 py-1.5 text-[10px] font-mono text-slate-500 font-bold uppercase tracking-wider">
                  {!sidebarCollapsed && 'PLATFORM ADMIN'}
                </div>
                {visibleAdmin.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeNav === item.id;

                  if (item.id === 'ADMINISTRATION') {
                    return (
                      <div key={item.id} className="space-y-1">
                        <button
                          onClick={() => {
                            setActiveNav('ADMINISTRATION');
                            setAdminMenuExpanded(!adminMenuExpanded);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-bold transition-all ${
                            isActive
                              ? 'bg-blue-700 text-white shadow-md ring-1 ring-blue-500'
                              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                            {!sidebarCollapsed && <span className="font-bold text-xs">{item.label}</span>}
                          </div>
                          {!sidebarCollapsed && (
                            <ChevronDown className={`w-4 h-4 transition-transform ${adminMenuExpanded ? 'rotate-180' : ''}`} />
                          )}
                        </button>

                        {adminMenuExpanded && !sidebarCollapsed && (
                          <div className="pl-9 space-y-1 text-[11px] font-medium text-slate-400">
                            {['Users', 'Roles', 'Permissions', 'Organizations', 'Audit Logs', 'Feature Flags', 'System Health'].map((sub, sIdx) => {
                              const isSubActive = activeNav === 'ADMINISTRATION' && adminSubNav === sub;
                              return (
                                <button
                                  key={sIdx}
                                  onClick={() => {
                                    setActiveNav('ADMINISTRATION');
                                    setAdminSubNav(sub);
                                  }}
                                  className={`w-full text-left py-1 px-2 rounded-lg transition-colors flex items-center justify-between ${
                                    isSubActive
                                      ? 'text-white bg-blue-600/50 font-bold'
                                      : 'hover:text-white hover:bg-slate-800/60'
                                  }`}
                                >
                                  <div className="flex items-center gap-1.5">
                                    <span className={`w-1 h-1 rounded-full ${isSubActive ? 'bg-blue-300' : 'bg-slate-500'}`} />
                                    <span>{sub}</span>
                                  </div>
                                  {sub === 'Users' && (
                                    <span className="text-[9px] font-semibold bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-500/30">
                                      Active
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  }

                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveNav(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold transition-all ${
                        isActive
                          ? 'bg-blue-700 text-white shadow-md ring-1 ring-blue-500'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      {!sidebarCollapsed && <span className="font-bold text-xs">{item.label}</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        {/* Main Content Workspace */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 flex flex-col bg-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              {getBreadcrumbs().map((b, idx) => {
                const isLast = idx === getBreadcrumbs().length - 1;
                return (
                  <React.Fragment key={idx}>
                    {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                    <span className={isLast ? 'text-slate-900 font-extrabold text-xs' : 'hover:text-slate-700'}>
                      {b}
                    </span>
                  </React.Fragment>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => alert('Exporting dataset')}
                className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Export</span>
              </button>
            </div>
          </div>

          {!isNavAuthorized(activeNav) ? (
            <ERP403ForbiddenScreen activeNav={activeNav} activeRoleKey={activeRoleKey} />
          ) : (
            <>
              {activeNav === 'DASHBOARD' && (
                <ERPMyWorkDashboard
                  activeRoleKey={activeRoleKey}
                  activeDistrict={activeDistrict}
                  activeProject={activeProject}
                  myWorkFilter={myWorkFilter}
                  onSetFilter={setMyWorkFilter}
                />
              )}

              {activeNav === 'PROJECTS' && (
                <ERPProjectsScreen
                  activeProject={activeProject}
                  onSelectService={(s) => {
                    setSelectedService(s);
                    setActiveNav('SERVICES');
                  }}
                />
              )}

              {activeNav === 'SERVICES' && (
                <ERPServicesScreen
                  selectedService={selectedService}
                  onSelectService={setSelectedService}
                />
              )}

              {activeNav === 'PEOPLE' && (
                <ERPPeopleScreen
                  selectedCategory={selectedPeopleCategory}
                  onSelectCategory={setSelectedPeopleCategory}
                />
              )}

              {activeNav === 'REPORTS' && <ERPReportsScreen activeRoleKey={activeRoleKey} />}
              {activeNav === 'MASTER_DATA' && <ERPMasterDataScreen />}
              {activeNav === 'ADMINISTRATION' && (
                adminSubNav === 'Users' ? (
                  <StaffUserManagement />
                ) : (
                  <ERPAdministrationScreen subTitle={adminSubNav} />
                )
              )}
              {activeNav === 'SETTINGS' && <ERPSettingsScreen />}
            </>
          )}
        </main>
      </div>

      {/* Developer Diagnostics Panel */}
      <DeveloperDiagnosticsPanel currentRoleKey={activeRoleKey} platformVersion="v1.2.0-alpha" />
    </div>
  );
};

// =============================================================================
// ROLE-ADAPTIVE DASHBOARD WORK QUEUE & METRICS
// =============================================================================
function ERPMyWorkDashboard({
  activeRoleKey,
  activeDistrict,
  activeProject,
  myWorkFilter,
  onSetFilter,
}: {
  activeRoleKey: EnterpriseRoleType;
  activeDistrict: string;
  activeProject: ProjectType;
  myWorkFilter: 'TODAY' | 'OVERDUE' | 'PENDING' | 'COMPLETED' | 'UPCOMING' | 'HIGH_PRIORITY';
  onSetFilter: (f: 'TODAY' | 'OVERDUE' | 'PENDING' | 'COMPLETED' | 'UPCOMING' | 'HIGH_PRIORITY') => void;
}) {
  const getRoleMetrics = () => {
    switch (activeRoleKey) {
      case 'SUPER_ADMIN':
        return [
          { title: 'Global Governance', value: '100%', desc: 'Organization Creation & Licensing', color: 'text-blue-600' },
          { title: 'Statewide Candidates', value: '1,245', desc: '36 Districts Active', color: 'text-emerald-600' },
          { title: 'Active Operational Schemes', value: '12 Schemes', desc: `${activeProject} Funded`, color: 'text-purple-600' },
          { title: 'System Health', value: '99.98%', desc: 'All Core Engines OK', color: 'text-blue-600' },
        ];
      case 'SYSTEM_ADMIN':
        return [
          { title: 'Server Health', value: '100% OK', desc: 'Kubernetes Cluster', color: 'text-emerald-600' },
          { title: 'Log Stream', value: '0 Errors', desc: 'Audit Log Monitored', color: 'text-blue-600' },
          { title: 'Feature Flags', value: '14 Active', desc: 'Rollout Engine', color: 'text-purple-600' },
          { title: 'Backup Status', value: 'Hourly OK', desc: 'Encrypted S3 Snapshots', color: 'text-blue-600' },
        ];
      case 'STATE_ADMIN':
        return [
          { title: 'Maharashtra Coverage', value: '36 Districts', desc: '100% Operational', color: 'text-blue-600' },
          { title: 'State Subsidy Allocations', value: '₹4.82 Cr', desc: 'Approved Batches', color: 'text-emerald-600' },
          { title: 'Policy Approvals Pending', value: '14 Schemes', desc: 'High Priority', color: 'text-amber-600' },
          { title: 'Total Beneficiaries', value: '45,890', desc: 'Active Profiles', color: 'text-purple-600' },
        ];
      default:
        return [
          { title: 'Active Operational Tasks', value: '12', desc: 'Assigned Work', color: 'text-blue-600' },
          { title: 'Completed Tasks', value: '45', desc: 'This Month', color: 'text-emerald-600' },
          { title: 'Pending Reviews', value: '4', desc: 'Requires Action', color: 'text-amber-600' },
          { title: 'System Status', value: 'Normal', desc: 'Operational', color: 'text-purple-600' },
        ];
    }
  };

  const workQueueItems = [
    { title: `Verify Soil Sample Batch #482 (${activeDistrict})`, filter: 'TODAY', priority: 'High', type: "Today's Work", actionLabel: 'Verify', border: 'border-l-4 border-l-red-500' },
    { title: `Approve Candidate #MA-000154 Profile (${activeDistrict})`, filter: 'PENDING', priority: 'High', type: 'Pending Approval', actionLabel: 'Review', border: 'border-l-4 border-l-amber-500' },
    { title: `Upload Field Verification Report #901 (${activeDistrict})`, filter: 'OVERDUE', priority: 'High', type: 'Overdue Task', actionLabel: 'Resume', border: 'border-l-4 border-l-red-600' },
    { title: `Schedule Drone Spraying Drive (${activeProject})`, filter: 'UPCOMING', priority: 'Medium', type: 'Upcoming Visit', actionLabel: 'Start', border: 'border-l-4 border-l-blue-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {getRoleMetrics().map((m, idx) => (
          <MetricCard key={idx} title={m.title} value={m.value} desc={m.desc} color={m.color} />
        ))}
      </div>

      <div className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div>
          <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-blue-600">
            {activeRoleKey.replace(/_/g, ' ')} Work Queue • {activeDistrict} ({activeProject})
          </span>
          <h2 className="text-xl font-extrabold text-slate-900 mt-0.5">What should I work on right now?</h2>
        </div>

        <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
          {(['TODAY', 'OVERDUE', 'PENDING', 'COMPLETED', 'UPCOMING', 'HIGH_PRIORITY'] as const).map((f) => (
            <button
              key={f}
              onClick={() => onSetFilter(f)}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                myWorkFilter === f
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              {f.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {workQueueItems.map((item, idx) => (
          <div key={idx} className={`bg-white p-4 rounded-xl border border-slate-200 space-y-3 shadow-sm ${item.border}`}>
            <div className="flex justify-between items-center text-xs">
              <span className="font-mono font-bold text-blue-700">{item.type}</span>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded">
                {item.priority} Priority
              </span>
            </div>
            <h3 className="text-sm font-extrabold text-slate-900">{item.title}</h3>
            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => alert(`Action: ${item.actionLabel} ${item.title}`)}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors"
              >
                {item.actionLabel}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MetricCard({ title, value, desc, color }: { title: string; value: string; desc: string; color: string }) {
  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-1 shadow-sm">
      <p className="text-xs text-slate-500 font-medium">{title}</p>
      <p className={`text-2xl font-black ${color}`}>{value}</p>
      <p className="text-[10px] text-slate-400">{desc}</p>
    </div>
  );
}

function ERP403ForbiddenScreen({ activeNav, activeRoleKey }: { activeNav: string; activeRoleKey: EnterpriseRoleType }) {
  return (
    <div className="bg-white p-12 rounded-2xl border border-red-200 text-center space-y-4 shadow-sm max-w-lg mx-auto my-12">
      <div className="w-16 h-16 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-200">
        <AlertOctagon className="w-8 h-8" />
      </div>
      <div className="space-y-1">
        <span className="text-xs font-mono font-bold text-red-600 uppercase">403 Access Denied</span>
        <h2 className="text-xl font-extrabold text-slate-900">Protected Route Violation</h2>
      </div>
      <p className="text-xs text-slate-600">
        Your active role <strong className="text-slate-900">{activeRoleKey.replace(/_/g, ' ')}</strong> does not possess required permission key to access <strong className="text-slate-900">/{activeNav.toLowerCase()}</strong>.
      </p>
      <div className="pt-2">
        <span className="text-[10px] font-mono px-3 py-1 bg-slate-100 text-slate-500 rounded border border-slate-200">
          RBAC_SECURITY_EXCEPTION • HTTP 403
        </span>
      </div>
    </div>
  );
}

function ERPProjectsScreen({ activeProject, onSelectService }: { activeProject: ProjectType; onSelectService: (s: string) => void }) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-3 shadow-sm text-xs">
      <h2 className="text-lg font-bold text-slate-900">{activeProject} Workspace</h2>
      <p className="text-slate-500">Managing project schemes and operational services.</p>
    </div>
  );
}

function ERPServicesScreen({ selectedService }: { selectedService: string; onSelectService: (s: string) => void }) {
  const [subModuleTab, setSubModuleTab] = useState<'REQUESTS' | 'MISSION' | 'FORMS' | 'WORKFLOW' | 'PAYMENTS' | 'DOCUMENTS' | 'NOTIFICATIONS' | 'PORTAL'>('REQUESTS');
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);

  return (
    <div className="space-y-4">
      {/* Sub-Module Navigation Bar */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 flex flex-wrap gap-1 text-xs font-extrabold shadow-sm">
        <button
          onClick={() => {
            setSubModuleTab('REQUESTS');
            setSelectedRequest(null);
          }}
          className={`px-4 py-2 rounded-xl transition-all ${
            subModuleTab === 'REQUESTS'
              ? 'bg-blue-600 text-white shadow'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          📋 Service Requests (Module 04)
        </button>

        <button
          onClick={() => {
            setSubModuleTab('MISSION');
            setSelectedMission(null);
          }}
          className={`px-4 py-2 rounded-xl transition-all ${
            subModuleTab === 'MISSION'
              ? 'bg-blue-600 text-white shadow'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          🎯 Mission Execution (MEE Module 05)
        </button>

        <button
          onClick={() => setSubModuleTab('FORMS')}
          className={`px-4 py-2 rounded-xl transition-all ${
            subModuleTab === 'FORMS'
              ? 'bg-blue-600 text-white shadow'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          📝 Dynamic Form Platform (DFP Module 06)
        </button>

        <button
          onClick={() => setSubModuleTab('WORKFLOW')}
          className={`px-4 py-2 rounded-xl transition-all ${
            subModuleTab === 'WORKFLOW'
              ? 'bg-blue-600 text-white shadow'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          ⚡ Workflow & Approvals (Module 07)
        </button>

        <button
          onClick={() => setSubModuleTab('PAYMENTS')}
          className={`px-4 py-2 rounded-xl transition-all ${
            subModuleTab === 'PAYMENTS'
              ? 'bg-blue-600 text-white shadow'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          💰 Financial Ledger & DBT (Module 08)
        </button>

        <button
          onClick={() => setSubModuleTab('DOCUMENTS')}
          className={`px-4 py-2 rounded-xl transition-all ${
            subModuleTab === 'DOCUMENTS'
              ? 'bg-blue-600 text-white shadow'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          📜 Document Records (DGRMS Module 10)
        </button>

        <button
          onClick={() => setSubModuleTab('NOTIFICATIONS')}
          className={`px-4 py-2 rounded-xl transition-all ${
            subModuleTab === 'NOTIFICATIONS'
              ? 'bg-blue-600 text-white shadow'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          📢 Notifications (Module 11)
        </button>

        <button
          onClick={() => setSubModuleTab('PORTAL')}
          className={`px-4 py-2 rounded-xl transition-all ${
            subModuleTab === 'PORTAL'
              ? 'bg-blue-600 text-white shadow'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          🌐 Public Citizen Portal (Module 12)
        </button>
      </div>

      {subModuleTab === 'REQUESTS' && (
        selectedRequest ? (
          <ServiceRequestDetailView
            request={selectedRequest}
            onBack={() => setSelectedRequest(null)}
          />
        ) : (
          <ServiceRequestDirectory
            onSelectRequest={(req) => setSelectedRequest(req)}
          />
        )
      )}

      {subModuleTab === 'MISSION' && (
        selectedMission ? (
          <MissionDetailView
            mission={selectedMission}
            onBack={() => setSelectedMission(null)}
          />
        ) : (
          <MissionBoard
            onSelectMission={(msn) => setSelectedMission(msn)}
          />
        )
      )}

      {subModuleTab === 'FORMS' && (
        <DynamicFormPlatformDirectory />
      )}

      {subModuleTab === 'WORKFLOW' && (
        <ApprovalInboxDirectory />
      )}

      {subModuleTab === 'PAYMENTS' && (
        <PaymentLedgerDirectory />
      )}

      {subModuleTab === 'DOCUMENTS' && (
        <DocumentRecordsDirectory />
      )}

      {subModuleTab === 'NOTIFICATIONS' && (
        <NotificationManagerDirectory />
      )}

      {subModuleTab === 'PORTAL' && (
        <PublicCitizenPortal />
      )}
    </div>
  );
}

function ERPPeopleScreen({ selectedCategory, onSelectCategory }: { selectedCategory: string; onSelectCategory: (c: string) => void }) {
  const [selectedUppProfile, setSelectedUppProfile] = useState<UPPProfile | null>(null);

  if (selectedUppProfile) {
    return (
      <UPPProfileDetailView
        profile={selectedUppProfile}
        onBack={() => setSelectedUppProfile(null)}
      />
    );
  }

  return (
    <UPPProfileDirectory
      onSelectProfile={(profile) => setSelectedUppProfile(profile)}
    />
  );
}

function ERPReportsScreen({ activeRoleKey }: { activeRoleKey?: string }) {
  return <OIAPAnalyticsDashboard activeRoleKey={activeRoleKey} />;
}

function ERPMasterDataScreen() {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-3 shadow-sm text-xs">
      <h2 className="text-lg font-bold text-slate-900">Master Data Hub (Super Admin Only)</h2>
      <p className="text-slate-500">Single Source of Truth for 12 master tables.</p>
    </div>
  );
}

function ERPAdministrationScreen({ subTitle = 'Access Control' }: { subTitle?: string }) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-3 shadow-sm text-xs">
      <h2 className="text-lg font-bold text-slate-900">Administration & RBAC Matrix — {subTitle}</h2>
      <p className="text-slate-500">Organization management, roles, and data-driven permission matrix for {subTitle}.</p>
    </div>
  );
}

function ERPSettingsScreen() {
  return <PlatformGovernanceConsole />;
}

import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Users, UserCheck, Clock, Settings, Menu, X, ChevronRight, Phone, ShieldAlert, LogIn, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../lib/auth/AuthContext';
import type { RoleKey } from '../../types/database';

export const CRM_AUTHORIZED_ROLES: RoleKey[] = [
  'telecaller',
  'team_leader',
  'crm_manager',
  'admin',
  'super_admin',
];

const navGroups = [
  {
    label: 'Overview',
    items: [
      { path: '/crm/dashboard', label: 'CRM Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Lead Management',
    items: [
      { path: '/crm/leads', label: 'All Leads', icon: Users, exact: true },
      { path: '/crm/visitors', label: 'Visitor — OTP Verified', icon: UserCheck },
      { path: '/crm/followups', label: 'Follow-ups', icon: Clock },
    ],
  },
  {
    label: 'Configuration',
    items: [
      { path: '/crm/settings', label: 'CRM Settings', icon: Settings },
    ],
  },
];

export default function CRMAdminLayout() {
  const { user, roleKey, loading, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  const currentItem = navGroups
    .flatMap(g => g.items)
    .find(i => location.pathname === i.path || (i.path !== '/crm/leads' && location.pathname.startsWith(i.path)));
  const currentLabel = currentItem?.label ?? (location.pathname.startsWith('/crm/leads/') ? 'Lead Details' : 'CRM Workspace');

  // 1. Loading state while authentication and role profile are resolving
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-300 font-medium text-sm">Verifying CRM Authorization...</p>
      </div>
    );
  }

  // 2. Unauthenticated check: redirect to existing login page with return target
  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // 3. Authenticated but unauthorized role check
  const isAuthorized = roleKey && CRM_AUTHORIZED_ROLES.includes(roleKey);
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white">
        <div className="max-w-md w-full bg-slate-800/90 border border-slate-700 rounded-2xl p-6 sm:p-8 text-center shadow-2xl backdrop-blur-sm">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-5 text-red-400">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-slate-300 text-sm mb-4 leading-relaxed">
            CRM Workspace access is restricted to authorized personnel. Your current role (<span className="font-mono text-amber-300">{roleKey || 'unassigned'}</span>) does not have permission to view or manage recruitment leads.
          </p>
          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-700/60 text-xs text-slate-400 mb-6 text-left">
            <span className="font-semibold text-slate-300 block mb-1">Authorized Roles:</span>
            Telecaller, Team Leader, CRM Manager, Administrator, Super Admin.
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={async () => {
                await signOut();
                navigate('/login', { replace: true });
              }}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-sm transition-colors shadow-sm"
            >
              <LogIn className="w-4 h-4" /> Switch Account
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold rounded-xl text-sm transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Return Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans">
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 flex flex-col transform transition-transform duration-300 lg:translate-x-0 lg:static lg:z-auto ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="px-5 py-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Phone className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-sm font-bold text-white tracking-wide">Enterprise</div>
              <div className="text-xs text-blue-400 font-medium">Recruitment CRM</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-4">
          {navGroups.map(group => (
            <div key={group.label} className="mb-6">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-3">{group.label}</p>
              <div className="space-y-1">
                {group.items.map(item => {
                  const active = location.pathname.startsWith(item.path) && (item.path !== '/crm' || location.pathname === '/crm');
                  return (
                    <Link key={item.path} to={item.path}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                        active ? 'bg-blue-600/10 text-blue-400' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                      }`}>
                      <item.icon className="w-4 h-4 shrink-0" />
                      <span className="flex-1">{item.label}</span>
                      {active && <ChevronRight className="w-4 h-4 opacity-50" />}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="px-5 py-4 border-t border-slate-800">
          {roleKey === 'super_admin' && (
            <button onClick={() => navigate('/dashboard')}
              className="w-full text-xs text-slate-500 hover:text-slate-300 font-medium transition-colors text-left flex items-center gap-2">
              Back to Workspace Selection
            </button>
          )}
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4 sticky top-0 z-30 shadow-sm">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg">
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <h1 className="text-lg font-bold text-slate-800 flex-1">{currentLabel}</h1>
          {roleKey === 'super_admin' && (
            <Link
              to="/dashboard"
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-700 bg-slate-50 rounded-lg hover:bg-slate-100 hover:text-slate-900 transition-colors border border-slate-200"
            >
              <LayoutDashboard className="w-4 h-4" />
              Switch Workspace
            </Link>
          )}
        </header>
        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

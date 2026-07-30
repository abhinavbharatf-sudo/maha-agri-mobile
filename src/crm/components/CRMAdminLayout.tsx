import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Users, Settings, Menu, X, ChevronRight, Phone } from 'lucide-react';
import { useAuth } from '../../lib/auth/AuthContext';

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
      { path: '/crm/leads', label: 'All Leads', icon: Users },
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
  const { roleKey } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  const currentLabel = navGroups
    .flatMap(g => g.items)
    .find(i => location.pathname.startsWith(i.path))?.label ?? 'CRM Panel';

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

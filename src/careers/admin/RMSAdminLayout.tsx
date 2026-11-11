import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Briefcase, Users, Calendar, FileText,
  FolderOpen, BarChart2, Settings, Megaphone, MapPin,
  GitBranch, Menu, X, ChevronRight, Shield, BookMarked, Trash2,
} from 'lucide-react';
import { RequireAuth, RequireHRRole } from '../../lib/auth/guards';

const navGroups = [
  {
    label: 'Overview',
    items: [
      { path: '/admin/rms/dashboard', label: 'HR Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Recruitment',
    items: [
      { path: '/admin/rms/campaigns',   label: 'Campaigns',       icon: Megaphone },
      { path: '/admin/rms/jobs',        label: 'Job Postings',    icon: Briefcase },
      { path: '/admin/rms/trash',       label: 'Job Trash',       icon: Trash2 },
      { path: '/admin/rms/drives',      label: 'Drives',          icon: MapPin },
      { path: '/admin/rms/vacancies',   label: 'Vacancies',       icon: BarChart2 },
    ],
  },
  {
    label: 'Applications',
    items: [
      { path: '/admin/rms/applications', label: 'Applications',      icon: FileText },
      { path: '/admin/rms/interviews',   label: 'Interview Slots',   icon: Calendar },
      { path: '/admin/rms/documents',    label: 'Document Review',   icon: FolderOpen },
    ],
  },
  {
    label: 'Operations',
    items: [
      { path: '/admin/rms/users',       label: 'Staff Management', icon: Users },
      { path: '/admin/rms/training',    label: 'Training Batches', icon: Users },
      { path: '/admin/rms/letters',     label: 'Appointment Letters', icon: FileText },
    ],
  },
  {
    label: 'Configuration',
    items: [
      { path: '/admin/rms/workflows',      label: 'Workflow Templates',   icon: GitBranch },
      { path: '/admin/rms/blueprint',     label: 'Recruitment Blueprints', icon: BookMarked },
      { path: '/admin/rms/notifications',  label: 'Notification Templates', icon: Settings },
      { path: '/admin/rms/reports',        label: 'Reports',               icon: BarChart2 },
    ],
  },
];

function RMSAdminShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  const currentLabel = navGroups
    .flatMap(g => g.items)
    .find(i => i.path === location.pathname)?.label ?? 'RMS Admin';

  return (
    <div className="min-h-screen bg-primary-50 flex">
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-primary-100 flex flex-col transform transition-transform duration-300 lg:translate-x-0 lg:static lg:z-auto ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="px-4 py-4 border-b border-primary-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary-900 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-sm font-bold text-primary-900 leading-tight">RMS Admin</div>
              <div className="text-xs text-primary-500 leading-tight">Recruitment Management</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-3">
          {navGroups.map(group => (
            <div key={group.label} className="mb-4">
              <p className="text-xs font-bold text-primary-400 uppercase tracking-wider px-3 mb-2">{group.label}</p>
              <div className="space-y-0.5">
                {group.items.map(item => {
                  const active = location.pathname === item.path;
                  return (
                    <Link key={item.path} to={item.path}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        active ? 'bg-primary-900 text-white' : 'text-primary-600 hover:bg-primary-50 hover:text-primary-900'
                      }`}>
                      <item.icon className="w-4 h-4 shrink-0" />
                      <span className="flex-1">{item.label}</span>
                      {active && <ChevronRight className="w-4 h-4" />}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="px-4 py-3 border-t border-primary-100">
          <button onClick={() => navigate('/admin')}
            className="w-full text-xs text-primary-500 hover:text-primary-800 font-medium transition-colors text-left">
            Back to Main Admin
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-primary-100 px-4 py-3 flex items-center gap-4 sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden p-2 text-primary-600 hover:bg-primary-50 rounded-lg">
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <h1 className="text-base font-bold text-primary-900 flex-1">{currentLabel}</h1>
          <Link to="/careers" className="text-xs font-medium text-primary-500 hover:text-primary-800 transition-colors">
            View Careers Portal
          </Link>
        </header>
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default function RMSAdminLayout() {
  return (
    <RequireAuth>
      <RequireHRRole fallbackPath="/login">
        <RMSAdminShell />
      </RequireHRRole>
    </RequireAuth>
  );
}

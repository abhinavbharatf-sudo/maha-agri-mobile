/**
 * Admin layout shell.
 *
 * Provides the sidebar + topbar chrome that every admin/dashboard page renders
 * inside. Future modules add <Route> entries under /admin/* and they
 * automatically get this shell via the nested <Outlet />.
 *
 * The shell is gated by RequireAuth so unauthenticated users redirect to /login.
 * It is intentionally a bare, premium-feeling skeleton — modules fill content.
 */

import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import { useState } from 'react';
import {
  LayoutDashboard,
  FileText,
  Users,
  FolderOpen,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../lib/auth/AuthContext';
import { RequireAuth } from '../../lib/auth/guards';

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/content', label: 'Content', icon: FileText, end: false },
  { to: '/admin/users', label: 'Users', icon: Users, end: false },
  { to: '/admin/projects', label: 'Projects', icon: FolderOpen, end: false },
  { to: '/admin/notifications', label: 'Notifications', icon: Bell, end: false },
  { to: '/admin/settings', label: 'Settings', icon: Settings, end: false },
];

function AdminShell({ children }: { children?: React.ReactNode }) {
  const { profile, roleKey, signOut } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="flex min-h-screen bg-primary-50">
      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-64 bg-primary-950 text-white flex flex-col transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex items-center gap-2.5 px-5 h-16 border-b border-primary-800 shrink-0">
          <ShieldCheck className="w-5 h-5 text-accent-saffron-400" />
          <span className="font-semibold text-sm tracking-wide">Admin Console</span>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-800 text-white'
                    : 'text-primary-300 hover:bg-primary-800/50 hover:text-white'
                }`
              }
            >
              <item.icon className="w-4.5 h-4.5 shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-primary-800 p-3">
          {profile ? (
            <>
              <div className="px-3 py-2 mb-2">
                <div className="text-xs text-primary-400 truncate">{profile.email}</div>
              </div>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-primary-300 hover:bg-primary-800/50 hover:text-white transition-colors w-full"
              >
                <LogOut className="w-4.5 h-4.5" />
                Sign out
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-amber-300 hover:bg-primary-800/50 hover:text-white transition-colors w-full"
            >
              <LogOut className="w-4.5 h-4.5 rotate-180" />
              Sign In
            </Link>
          )}
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="sticky top-0 z-20 h-16 bg-white border-b border-primary-100 flex items-center justify-between px-4 lg:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 -ml-2 text-primary-700 hover:bg-primary-50 rounded-lg"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="hidden lg:block text-sm font-medium text-primary-700">
            Administration
          </div>
          <div className="flex items-center gap-3">
            {roleKey === 'super_admin' && (
              <Link
                to="/dashboard"
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-primary-700 bg-primary-50 rounded-lg hover:bg-primary-100 hover:text-primary-900 transition-colors border border-primary-200 mr-2"
              >
                <LayoutDashboard className="w-4 h-4" />
                Switch Workspace
              </Link>
            )}
            <div className="text-xs text-primary-500 hidden sm:block">
              {profile?.full_name ?? profile?.email ?? ''}
            </div>
            <div className="w-8 h-8 rounded-full bg-primary-200 flex items-center justify-center text-xs font-semibold text-primary-700">
              {(profile?.full_name ?? profile?.email ?? '?').charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Content — modules render here via children or Outlet */}
        <main className="flex-1 p-4 lg:p-8">
          {children || <Outlet />}
        </main>
      </div>

      {/* Mobile close button */}
      {sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(false)}
          className="fixed top-4 right-4 z-50 lg:hidden p-2 text-white"
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}

export default function AdminLayout({ children }: { children?: React.ReactNode }) {
  return (
    <RequireAuth>
      <AdminShell>{children}</AdminShell>
    </RequireAuth>
  );
}

import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, User, FileText, Calendar, CreditCard,
  FolderOpen, Bell, BookOpen, Award, Settings,
  LogOut, Menu, X, ChevronRight, Briefcase, Lock,
} from 'lucide-react';
import { useCandidateAuth } from '../lib/CandidateAuthContext';
import OTPLoginModal from '../components/OTPLoginModal';

const navItems = [
  { path: '/candidate/dashboard',      label: 'Dashboard',          icon: LayoutDashboard },
  { path: '/candidate/profile',        label: 'My Profile',         icon: User },
  { path: '/candidate/applications',   label: 'My Applications',    icon: FileText },
  { path: '/candidate/interviews',     label: 'Interview Schedule', icon: Calendar },
  { path: '/candidate/payments',       label: 'Payments',           icon: CreditCard },
  { path: '/candidate/documents',      label: 'Documents',          icon: FolderOpen },
  { path: '/candidate/notifications',  label: 'Notifications',      icon: Bell },
  { path: '/candidate/training',       label: 'Training',           icon: BookOpen },
  { path: '/candidate/letters',        label: 'Appointment Letters',icon: Award },
  { path: '/candidate/settings',       label: 'Settings',           icon: Settings },
];

export default function CandidateDashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut, loading, setVerifiedMobile } = useCandidateAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(true);

  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary-50">
        <div className="animate-spin w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full" />
      </div>
    );
  }

  // Auth Guard: Unauthenticated users are presented with a working login flow
  if (!user) {
    return (
      <div className="min-h-screen bg-primary-50 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl border border-primary-100 p-8 text-center shadow-lg">
          <div className="w-14 h-14 rounded-2xl bg-primary-100 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-7 h-7 text-primary-700" />
          </div>
          <h2 className="text-xl font-bold text-primary-900 mb-2">Candidate Login Required</h2>
          <p className="text-sm text-primary-600 mb-6 leading-relaxed">
            Please log in with your registered mobile number and OTP to access your candidate dashboard, profile, and applications.
          </p>
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setLoginModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-3 bg-primary-900 text-white font-semibold rounded-xl hover:bg-primary-800 transition-colors shadow-sm"
            >
              <User className="w-4 h-4" />
              Log In with Mobile OTP
            </button>
            <Link
              to="/careers"
              className="block w-full py-2.5 text-xs text-primary-500 hover:text-primary-800 font-medium transition-colors"
            >
              ← Return to Careers Portal
            </Link>
          </div>
        </div>

        <OTPLoginModal
          isOpen={loginModalOpen}
          onClose={() => setLoginModalOpen(false)}
          onSuccess={(isNewUser, mobile) => {
            setLoginModalOpen(false);
            if (mobile) {
              const clean = mobile.replace(/\D/g, '').slice(-10);
              setVerifiedMobile(clean);
            }
            if (isNewUser) {
              navigate('/candidate/profile');
            }
          }}
          title="Candidate Login"
          subtitle="Enter your mobile number to receive a one-time verification code."
        />
      </div>
    );
  }

  const handleSignOut = async () => {
    await signOut();
    navigate('/careers');
  };

  return (
    <div className="min-h-screen bg-primary-50 flex">
      {/* Sidebar overlay (mobile) */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-primary-950 text-white flex flex-col transform transition-transform duration-300 lg:translate-x-0 lg:static lg:z-auto ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Logo */}
        <div className="px-5 py-5 border-b border-primary-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary-700 flex items-center justify-center">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold leading-tight">Candidate Portal</div>
              <div className="text-xs text-primary-400 leading-tight">Abhinav Bharat Foundation</div>
            </div>
          </div>
          {profile && (
            <div className="mt-4 p-3 bg-primary-900 rounded-lg">
              <p className="text-sm font-semibold text-white truncate">{profile.full_name}</p>
              <p className="text-xs text-primary-400 mt-0.5">{profile.candidate_id}</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map(item => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? 'bg-white text-primary-900'
                    : 'text-primary-300 hover:bg-primary-800 hover:text-white'
                }`}
              >
                <item.icon className={`w-4 h-4 ${active ? 'text-primary-700' : ''}`} />
                {item.label}
                {active && <ChevronRight className="w-4 h-4 ml-auto text-primary-500" />}
              </Link>
            );
          })}
        </nav>

        {/* Sign out */}
        <div className="px-3 py-4 border-t border-primary-800">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-primary-300 hover:bg-primary-800 hover:text-white transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-primary-100 px-4 py-3 flex items-center gap-4 sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 text-primary-600 hover:bg-primary-50 rounded-lg"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex-1">
            <h1 className="text-base font-bold text-primary-900">
              {navItems.find(n => n.path === location.pathname)?.label ?? 'Candidate Portal'}
            </h1>
          </div>
          <Link
            to="/careers"
            className="text-xs font-medium text-primary-600 hover:text-primary-900 transition-colors"
          >
            View Openings
          </Link>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

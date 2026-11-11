import { EntrepreneurAssessmentWizard } from './modules/edp/components/EntrepreneurAssessmentWizard';
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Home from './pages/Home';
import About from './pages/About';
import Projects from './pages/Projects';
import Services from './pages/Services';
import Media from './pages/Media';
import Gallery from './pages/Gallery';
import Downloads from './pages/Downloads';
import Transparency from './pages/Transparency';
import Contact from './pages/Contact';
import Login from './pages/Login';
import AdminLayout from './components/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import SuperAdminDashboard from './pages/admin/SuperAdminDashboard';
import CareerRoutes from './careers/routes';
import CRMRoutes from './crm/routes';
import WhatsAppOtpTest from './pages/WhatsAppOtpTest';

import { MDMPreviewPrototype } from './modules/master/components/MDMPreviewPrototype';
import MahaAgriEnterpriseAdminPortal from './modules/portal/MahaAgriEnterpriseAdminPortal';
import { RootControlCenter } from './modules/root/RootControlCenter';
import { GovernanceConsole } from './modules/root/GovernanceConsole';
import { FoundationServicesConsole } from './modules/master/components/FoundationServicesConsole';
import { MahaAgridootFieldApp } from './modules/agridoot/MahaAgridootFieldApp';
import Training from './careers/dashboard/Training';
import StaffUserManagement from './modules/admin/StaffUserManagement';
import StaffDashboard from './pages/staff/StaffDashboard';
import { RequireRole, RequireAdminRole, RequireHRRole, RequireCRMRole, RequireStaffRole } from './lib/auth/guards';
import { useAuth } from './lib/auth/AuthContext';
import { Navigate } from 'react-router-dom';

// HR & CRM Direct Panel Imports for Unrestricted Access Aliases
import RMSAdminLayout from './careers/admin/RMSAdminLayout';
import HRDashboard from './careers/admin/HRDashboard';
import CRMAdminLayout from './crm/components/CRMAdminLayout';
import CRMDashboard from './crm/pages/CRMDashboard';
import LeadList from './crm/pages/LeadList';
import LeadDetail from './crm/pages/LeadDetail';

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Error caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, background: '#0f172a', color: '#f8fafc', fontFamily: 'sans-serif', minHeight: '100vh' }}>
          <h2 style={{ color: '#ef4444' }}>Application Error Caught</h2>
          <pre style={{ background: '#1e293b', padding: 15, borderRadius: 8, overflow: 'auto' }}>
            {this.state.error?.toString()}
          </pre>
          <button onClick={() => window.location.reload()} style={{ padding: '8px 16px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const withLayout = (element: React.ReactNode) => <Layout>{element}</Layout>;

function AppFallbackRedirect() {
  const { user, roleKey, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/" replace />;
  if (roleKey === 'super_admin' || roleKey === 'ROOT_SUPER_ADMIN') return <Navigate to="/dashboard" replace />;
  if (roleKey === 'admin' || roleKey === 'STATE_ADMIN') return <Navigate to="/admin/dashboard" replace />;
  return <Navigate to="/staff/dashboard" replace />;
}

function App() {
  return (
    <ErrorBoundary>
      <Routes>
        {/* MAHA-AGRI Primary Platform Root Route */}
        <Route path="/"             element={withLayout(<Home />)} />
        <Route path="/home"         element={withLayout(<Home />)} />
        <Route path="/about"        element={withLayout(<About />)} />
        <Route path="/projects"     element={withLayout(<Projects />)} />
        <Route path="/services"     element={withLayout(<Services />)} />
        <Route path="/media"        element={withLayout(<Media />)} />
        <Route path="/gallery"      element={withLayout(<Gallery />)} />
        <Route path="/downloads"    element={withLayout(<Downloads />)} />
        <Route path="/transparency" element={withLayout(<Transparency />)} />
        <Route path="/contact"      element={withLayout(<Contact />)} />

        {/* Careers & RMS Module Routes */}
        {CareerRoutes()}

        {/* CRM Module Routes */}
        {CRMRoutes()}

        {/* ROOT SUPER ADMIN GOVERNANCE CONSOLE */}
        <Route path="/root/control-center" element={<RequireRole role="super_admin"><RootControlCenter /></RequireRole>} />
        <Route path="/root" element={<RequireRole role="super_admin"><RootControlCenter /></RequireRole>} />
        <Route path="/governance" element={<RequireRole role="super_admin"><GovernanceConsole /></RequireRole>} />

        {/* PHASE 2 ENTERPRISE FOUNDATION SERVICES CONSOLE */}
        <Route path="/foundation-services" element={<RequireRole role="super_admin"><FoundationServicesConsole /></RequireRole>} />

        {/* ABF ENTERPRISE NAMESPACED ROUTES (/abf/*) */}
        <Route path="/abf" element={<RequireRole role="super_admin"><SuperAdminDashboard /></RequireRole>} />
        <Route path="/abf/dashboard" element={<RequireRole role="super_admin"><SuperAdminDashboard /></RequireRole>} />
        <Route path="/abf/state-admin" element={<RequireAdminRole><MahaAgriEnterpriseAdminPortal /></RequireAdminRole>} />
        <Route path="/abf/hr" element={<RequireHRRole><RMSAdminLayout><HRDashboard /></RMSAdminLayout></RequireHRRole>} />
        <Route path="/abf/crm" element={<RequireCRMRole><CRMAdminLayout><CRMDashboard /></CRMAdminLayout></RequireCRMRole>} />
        <Route path="/abf/office" element={<RequireRole role="super_admin"><SuperAdminDashboard /></RequireRole>} />

        {/* MAHA-AGRI GOVERNMENT PLATFORM NAMESPACED ROUTES (/maha-agri/*) */}
        <Route path="/maha-agri" element={<RequireAdminRole><MahaAgriEnterpriseAdminPortal /></RequireAdminRole>} />
        <Route path="/maha-agri/dashboard" element={<RequireAdminRole><MahaAgriEnterpriseAdminPortal /></RequireAdminRole>} />
        <Route path="/staff/dashboard" element={<RequireStaffRole><StaffDashboard /></RequireStaffRole>} />
        <Route path="/staff" element={<RequireStaffRole><StaffDashboard /></RequireStaffRole>} />
        <Route path="/maha-agri/state-admin" element={<RequireAdminRole><MahaAgriEnterpriseAdminPortal /></RequireAdminRole>} />
        <Route path="/maha-agri/district" element={<RequireAdminRole><MahaAgriEnterpriseAdminPortal /></RequireAdminRole>} />
        <Route path="/maha-agri/soil-testing" element={<RequireAdminRole><MahaAgriEnterpriseAdminPortal /></RequireAdminRole>} />
        <Route path="/maha-agri/farmer" element={<RequireAdminRole><MahaAgriEnterpriseAdminPortal /></RequireAdminRole>} />
        <Route path="/maha-agri/edp" element={<Training />} />
        <Route path="/candidate/training" element={<Training />} />
        {/* Entrepreneur Wizard Direct Routes */}
        <Route path="/entrepreneur" element={<EntrepreneurAssessmentWizard onBack={() => window.history.back()} />} />
        <Route path="/maha-agri/entrepreneur" element={<EntrepreneurAssessmentWizard onBack={() => window.history.back()} />} />
        <Route path="/edp-wizard" element={<EntrepreneurAssessmentWizard onBack={() => window.history.back()} />} />

        {/* Field App Routes & Aliases */}
        <Route path="/maha-agri/agridoot" element={<MahaAgridootFieldApp />} />
        <Route path="/agridoot font-mono" element={<MahaAgridootFieldApp />} />
        <Route path="/agridoot"          element={<MahaAgridootFieldApp />} />
        <Route path="/field"             element={<MahaAgridootFieldApp />} />

        {/* 1. SUPER ADMIN PANEL ROUTE ALIASES */}
        <Route path="/super-admin"     element={<RequireRole role="super_admin"><SuperAdminDashboard /></RequireRole>} />
        <Route path="/superadmin"      element={<RequireRole role="super_admin"><SuperAdminDashboard /></RequireRole>} />
        <Route path="/admin/super"     element={<RequireRole role="super_admin"><SuperAdminDashboard /></RequireRole>} />
        <Route path="/admin/users"       element={<RequireRole roles={['admin', 'super_admin']}><AdminLayout><StaffUserManagement /></AdminLayout></RequireRole>} />
        <Route path="/super-admin/users" element={<RequireRole roles={['admin', 'super_admin']}><AdminLayout><StaffUserManagement /></AdminLayout></RequireRole>} />
        <Route path="/users"             element={<RequireRole roles={['admin', 'super_admin']}><AdminLayout><StaffUserManagement /></AdminLayout></RequireRole>} />

        {/* 2. STATE ADMIN PANEL ROUTE ALIASES */}
        <Route path="/state-admin"     element={<RequireAdminRole><MahaAgriEnterpriseAdminPortal /></RequireAdminRole>} />
        <Route path="/stateadmin"      element={<RequireAdminRole><MahaAgriEnterpriseAdminPortal /></RequireAdminRole>} />
        <Route path="/admin/state"     element={<RequireAdminRole><MahaAgriEnterpriseAdminPortal /></RequireAdminRole>} />

        {/* 3. HR / RMS ADMIN PANEL ROUTE ALIASES */}
        <Route path="/hr" element={<RequireHRRole><RMSAdminLayout /></RequireHRRole>}>
          <Route index element={<HRDashboard />} />
          <Route path="dashboard" element={<HRDashboard />} />
        </Route>
        <Route path="/hr/dashboard" element={<RequireHRRole><RMSAdminLayout><HRDashboard /></RMSAdminLayout></RequireHRRole>} />
        <Route path="/careers/admin" element={<RequireHRRole><RMSAdminLayout><HRDashboard /></RMSAdminLayout></RequireHRRole>} />

        {/* 4. CRM / CSM PANEL ROUTE ALIASES */}
        <Route path="/crm" element={<RequireCRMRole><CRMAdminLayout /></RequireCRMRole>}>
          <Route index element={<CRMDashboard />} />
          <Route path="dashboard" element={<CRMDashboard />} />
          <Route path="leads" element={<LeadList />} />
          <Route path="leads/:id" element={<LeadDetail />} />
        </Route>
        <Route path="/crm/dashboard" element={<RequireCRMRole><CRMAdminLayout><CRMDashboard /></CRMAdminLayout></RequireCRMRole>} />
        
        <Route path="/csm" element={<RequireCRMRole><CRMAdminLayout /></RequireCRMRole>}>
          <Route index element={<CRMDashboard />} />
          <Route path="dashboard" element={<CRMDashboard />} />
          <Route path="leads" element={<LeadList />} />
          <Route path="leads/:id" element={<LeadDetail />} />
        </Route>
        <Route path="/csm/dashboard" element={<RequireCRMRole><CRMAdminLayout><CRMDashboard /></CRMAdminLayout></RequireCRMRole>} />

        {/* 5. MAHA-AGRI GOVERNMENT PLATFORM MAIN ADMIN PORTAL */}
        <Route path="/maha-agri-admin" element={<RequireAdminRole><MahaAgriEnterpriseAdminPortal /></RequireAdminRole>} />
        <Route path="/admin"           element={<RequireAdminRole><MahaAgriEnterpriseAdminPortal /></RequireAdminRole>} />
        <Route path="/admin/dashboard" element={<RequireAdminRole><MahaAgriEnterpriseAdminPortal /></RequireAdminRole>} />
        <Route path="/dashboard"       element={<RequireRole role="super_admin"><SuperAdminDashboard /></RequireRole>} />

        {/* Interactive UI Prototype Preview for Module 02 */}
        <Route path="/mdm-preview" element={<MDMPreviewPrototype />} />

        {/* Auth */}
        <Route path="/login" element={<Login />} />

        {/* WhatsApp integration test */}
        <Route path="/whatsapp-test" element={<WhatsAppOtpTest />} />

        {/* Catch-all fallback */}
        <Route path="*" element={<AppFallbackRedirect />} />
      </Routes>
    </ErrorBoundary>
  );
}

export default App;

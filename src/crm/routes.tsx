import { Route, Outlet } from 'react-router-dom';
import { RequireAuth, RequireCRMRole } from '../lib/auth/guards';

import CRMAdminLayout from './components/CRMAdminLayout';
import CRMDashboard from './pages/CRMDashboard';
import LeadList from './pages/LeadList';
import LeadDetail from './pages/LeadDetail';
import CRMSettings from './pages/CRMSettings';

export default function CRMRoutes() {
  return (
    <Route path="/crm" element={
      <RequireAuth>
        <RequireCRMRole fallbackPath="/login">
          <CRMAdminLayout />
        </RequireCRMRole>
      </RequireAuth>
    }>
      <Route path="dashboard" element={<CRMDashboard />} />
      <Route path="leads" element={<LeadList initialView="all" />} />
      <Route path="visitors" element={<LeadList initialView="visitors" />} />
      <Route path="followups" element={<LeadList initialView="followups" />} />
      <Route path="leads/:id" element={<LeadDetail />} />
      <Route path="settings" element={<CRMSettings />} />
    </Route>
  );
}

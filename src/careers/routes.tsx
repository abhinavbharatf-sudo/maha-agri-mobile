import { Route, Outlet } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { CandidateAuthProvider } from './lib/CandidateAuthContext';

// Public pages
import CareersHome from './pages/CareersHome';
import JobDetail from './pages/JobDetail';
import Apply from './pages/Apply';
import ApplicationSuccess from './pages/ApplicationSuccess';
import CandidateApplyWizard from './portal/CandidateApplyWizard';

// Candidate dashboard
import CandidateDashboardLayout from './dashboard/CandidateDashboardLayout';
import CandidateDashboard from './dashboard/CandidateDashboard';
import MyProfile from './dashboard/MyProfile';
import MyApplications from './dashboard/MyApplications';
import InterviewSchedule from './dashboard/InterviewSchedule';
import CandidatePayments from './dashboard/Payments';
import CandidateDocuments from './dashboard/Documents';
import CandidateNotifications from './dashboard/CandidateNotifications';
import CandidateTraining from './dashboard/Training';
import AppointmentLetters from './dashboard/AppointmentLetters';
import CandidateSettings from './dashboard/CandidateSettings';

// HR admin
import RMSAdminLayout from './admin/RMSAdminLayout';
import HRDashboard from './admin/HRDashboard';
import HRCampaignManager from './admin/HRCampaignManager';
import HRJobPostingEditor from './admin/HRJobPostingEditor';
import HRApplications from './admin/HRApplications';
import HRInterviewSlots from './admin/HRInterviewSlots';
import HRDocumentVerification from './admin/HRDocumentVerification';
import HRTraining from './admin/HRTraining';
import HRAppointmentLetters from './admin/HRAppointmentLetters';
import HRVacancyManager from './admin/HRVacancyManager';
import HRDriveManager from './admin/HRDriveManager';
import HRWorkflowEditor from './admin/HRWorkflowEditor';
import HRRecruitmentBlueprint from './admin/HRRecruitmentBlueprint';
import HRNotificationTemplateManager from './admin/HRNotificationTemplateManager';
import HRReports from './admin/HRReports';
import HRJobTrash from './admin/HRJobTrash';
import StaffUserManagement from '../modules/admin/StaffUserManagement';

const withLayout = (element: React.ReactNode) => <Layout>{element}</Layout>;

function CareerModuleRoot() {
  return <Outlet />;
}

export default function CareerRoutes() {
  return (
    <Route element={<CareerModuleRoot />}>
      {/* Public careers pages */}
      <Route path="/careers"                               element={withLayout(<CareersHome />)} />
      <Route path="/careers/jobs/:slug"                    element={withLayout(<JobDetail />)} />
      <Route path="/careers/apply/:jobId"                  element={<Apply />} />
      <Route path="/careers/apply/success/:applicationId"  element={<ApplicationSuccess />} />
      {/* Isolated Candidate Portal Route */}
      <Route path="/careers/portal/apply/:jobId"           element={withLayout(<CandidateApplyWizard />)} />

      {/* Candidate dashboard */}
      <Route path="/candidate" element={<CandidateDashboardLayout />}>
        <Route path="dashboard"     element={<CandidateDashboard />} />
        <Route path="profile"       element={<MyProfile />} />
        <Route path="applications"  element={<MyApplications />} />
        <Route path="interviews"    element={<InterviewSchedule />} />
        <Route path="payments"      element={<CandidatePayments />} />
        <Route path="documents"     element={<CandidateDocuments />} />
        <Route path="notifications" element={<CandidateNotifications />} />
        <Route path="training"      element={<CandidateTraining />} />
        <Route path="letters"       element={<AppointmentLetters />} />
        <Route path="settings"      element={<CandidateSettings />} />
      </Route>

      {/* RMS admin */}
      <Route path="/admin/rms" element={<RMSAdminLayout />}>
        <Route path="dashboard"     element={<HRDashboard />} />
        <Route path="users"         element={<StaffUserManagement />} />
        <Route path="campaigns"     element={<HRCampaignManager />} />
        <Route path="jobs"          element={<HRJobPostingEditor />} />
        <Route path="applications"  element={<HRApplications />} />
        <Route path="interviews"    element={<HRInterviewSlots />} />
        <Route path="documents"     element={<HRDocumentVerification />} />
        <Route path="training"      element={<HRTraining />} />
        <Route path="letters"       element={<HRAppointmentLetters />} />
        <Route path="vacancies"     element={<HRVacancyManager />} />
        <Route path="drives"        element={<HRDriveManager />} />
        <Route path="workflows"     element={<HRWorkflowEditor />} />
        <Route path="blueprint"     element={<HRRecruitmentBlueprint />} />
        <Route path="notifications" element={<HRNotificationTemplateManager />} />
        <Route path="reports"       element={<HRReports />} />
        <Route path="trash"         element={<HRJobTrash />} />
      </Route>
    </Route>
  );
}

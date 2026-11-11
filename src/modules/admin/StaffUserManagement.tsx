import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  UserPlus,
  Search,
  ShieldCheck,
  ShieldAlert,
  Edit2,
  CheckCircle2,
  XCircle,
  Building2,
  UserCheck,
  RefreshCw,
  AlertTriangle,
  History,
  X,
  Key,
  Copy,
  Check,
  MapPin,
  Lock,
} from 'lucide-react';
import {
  listStaffDirectory,
  createOrInviteStaff,
  generateStaffActivationPassword,
  updateStaffProfile,
  toggleStaffStatus,
  authorizeInterviewer,
  toggleInterviewerStatus,
  getInterviewerAuditHistory,
  getStaffEnvironmentInfo,
} from '../../careers/lib/api';
import { supabase } from '../../lib/supabase/client';
import type { StaffUser, InterviewerAuditEntry } from '../../careers/lib/types';
import { MAHARASHTRA_DISTRICTS, getTalukasForDistrict } from '../../data/maharashtraGeography';

// Standardized Employment Designations
export const STANDARD_DESIGNATIONS = [
  'Admin',
  'HR',
  'CSM',
  'Telecaller',
  'Independent Interviewer',
  'Other Staff',
] as const;

// Standardized Departments
export const STANDARD_DEPARTMENTS = [
  'Executive Leadership',
  'Human Resources',
  'Customer Success & Telecalling',
  'Field Operations & Placement',
  'IT & Digital Systems',
  'Finance & Accounts',
  'General Operations',
] as const;

export const StaffUserManagement: React.FC = () => {
  const envInfo = useMemo(() => getStaffEnvironmentInfo(), []);
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [designationFilter, setDesignationFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffUser | null>(null);
  const [statusConfirmTarget, setStatusConfirmTarget] = useState<{ staff: StaffUser; action: 'activate' | 'deactivate' } | null>(null);
  
  // Quick Authorize Interviewer Modal
  const [authorizeTarget, setAuthorizeTarget] = useState<StaffUser | null>(null);
  const [defaultMeetLink, setDefaultMeetLink] = useState('');
  const [authorizing, setAuthorizing] = useState(false);

  // Audit History Modal
  const [auditTarget, setAuditTarget] = useState<{ staff: StaffUser; history: InterviewerAuditEntry[] } | null>(null);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Form states for Create
  const [formEmail, setFormEmail] = useState('');
  const [formFullName, setFormFullName] = useState('');
  const [formDesignation, setFormDesignation] = useState<string>('Other Staff');
  const [formCustomDesignation, setFormCustomDesignation] = useState('');
  const [formDepartment, setFormDepartment] = useState<string>('General Operations');
  const [formRoleKey, setFormRoleKey] = useState<string>('staff');
  const [formPhone, setFormPhone] = useState('');
  const [formDistrict, setFormDistrict] = useState('');
  const [formTaluka, setFormTaluka] = useState('');
  const [formOfficeLocation, setFormOfficeLocation] = useState('');
  const [submittingForm, setSubmittingForm] = useState(false);

  // Form states for Edit
  const [editFullName, setEditFullName] = useState('');
  const [editDesignation, setEditDesignation] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editRoleKey, setEditRoleKey] = useState('staff');
  const [editPhone, setEditPhone] = useState('');
  const [editDistrict, setEditDistrict] = useState('');
  const [editTaluka, setEditTaluka] = useState('');
  const [editOfficeLocation, setEditOfficeLocation] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Quick Sign In modal states for seamless Supabase session restoration
  const [showQuickLoginModal, setShowQuickLoginModal] = useState(false);
  const [quickLoginEmail, setQuickLoginEmail] = useState('');
  const [quickLoginPassword, setQuickLoginPassword] = useState('');
  const [quickLoginLoading, setQuickLoginLoading] = useState(false);
  const [quickLoginError, setQuickLoginError] = useState<string | null>(null);

  // Activation Credentials Modal States
  const [activationModalData, setActivationModalData] = useState<{ email: string; fullName: string; tempPassword?: string } | null>(null);
  const [copiedCredentials, setCopiedCredentials] = useState(false);
  const [generatingActivationForId, setGeneratingActivationForId] = useState<string | null>(null);

  // Load Directory
  const loadStaff = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listStaffDirectory({
        search: search.trim() || undefined,
        department: departmentFilter !== 'all' ? departmentFilter : undefined,
        designation: designationFilter !== 'all' ? designationFilter : undefined,
        status: statusFilter,
      });

      if (res.error) {
        setError(res.error);
      } else {
        setStaffList(res.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load staff list');
    } finally {
      setLoading(false);
    }
  };

  const [hasAuthSession, setHasAuthSession] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setHasAuthSession(Boolean(data?.session));
    });
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasAuthSession(Boolean(session));
    });
    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    loadStaff();
  }, [search, departmentFilter, designationFilter, statusFilter]);

  // Lock background page scroll when any modal is open
  useEffect(() => {
    const isModalOpen = showCreateModal || Boolean(editingStaff) || Boolean(statusConfirmTarget) || Boolean(authorizeTarget) || Boolean(auditTarget) || Boolean(activationModalData) || showQuickLoginModal;
    if (isModalOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [showCreateModal, editingStaff, statusConfirmTarget, authorizeTarget, auditTarget, activationModalData, showQuickLoginModal]);

  // Flash message helper
  const flashSuccess = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(null), 4000);
  };

  // KPI Calculations
  const stats = useMemo(() => {
    const total = staffList.length;
    const active = staffList.filter(s => s.is_active).length;
    const interviewers = staffList.filter(s => s.is_interviewer && s.interviewer_is_active).length;
    const depts = new Set(staffList.map(s => s.department)).size;
    return { total, active, interviewers, depts };
  }, [staffList]);

  // Quick Supabase Auth Sign In for Admin Console
  const handleQuickSignIn = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!quickLoginEmail.trim() || !quickLoginPassword) return;

    setQuickLoginLoading(true);
    setQuickLoginError(null);
    try {
      const { data, error: signInErr } = await supabase.auth.signInWithPassword({
        email: quickLoginEmail.trim(),
        password: quickLoginPassword,
      });

      // Clear password from component state immediately
      setQuickLoginPassword('');

      if (signInErr) {
        setQuickLoginError(signInErr.message);
      } else if (data?.session) {
        setHasAuthSession(true);
        setShowQuickLoginModal(false);
        setError(null);
        flashSuccess(`Supabase Auth session activated for ${quickLoginEmail}.`);
        loadStaff();
      }
    } catch (err: any) {
      setQuickLoginPassword('');
      setQuickLoginError(err.message || 'Login failed');
    } finally {
      setQuickLoginLoading(false);
    }
  };

  // Handle Create Staff
  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEmail.trim() || !formFullName.trim()) return;

    if (hasAuthSession === false && envInfo.isStagingLive) {
      setError('Authentication required: An active Supabase Auth session as an Administrator or HR Lead is required to create staff users. Please sign in to proceed.');
      return;
    }

    setSubmittingForm(true);
    setError(null);

    const finalDesignation = formDesignation === 'Custom' 
      ? formCustomDesignation.trim() || 'Other Staff'
      : formDesignation;

    const res = await createOrInviteStaff({
      email: formEmail.trim(),
      full_name: formFullName.trim(),
      designation: finalDesignation,
      department: formDepartment,
      role_key: formRoleKey,
      phone: formPhone.trim() || undefined,
      assigned_district: formDistrict.trim() || undefined,
      assigned_taluka: formTaluka.trim() || undefined,
      assigned_location: formOfficeLocation.trim() || undefined,
    });

    setSubmittingForm(false);

    if (res.error) {
      setError(res.error);
    } else {
      setShowCreateModal(false);
      setFormEmail('');
      setFormFullName('');
      setFormDesignation('Other Staff');
      setFormCustomDesignation('');
      setFormDepartment('General Operations');
      setFormRoleKey('staff');
      setFormPhone('');
      setFormDistrict('');
      setFormTaluka('');
      setFormOfficeLocation('');
      flashSuccess(`Staff user ${formFullName} saved successfully.`);
      if (res.data?.temporary_password) {
        setActivationModalData({
          email: formEmail.trim(),
          fullName: formFullName.trim(),
          tempPassword: res.data.temporary_password,
        });
      }
      loadStaff();
    }
  };

  // Generate / Reset Activation Credentials
  const handleGenerateActivation = async (staff: StaffUser) => {
    setGeneratingActivationForId(staff.id);
    setError(null);
    try {
      const res = await generateStaffActivationPassword({ user_id: staff.id });
      if (res.error) {
        setError(res.error);
      } else if (res.data?.temporary_password) {
        setActivationModalData({
          email: staff.email,
          fullName: staff.full_name,
          tempPassword: res.data.temporary_password,
        });
        flashSuccess(`Activation credentials generated for ${staff.full_name}.`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate activation credentials');
    } finally {
      setGeneratingActivationForId(null);
    }
  };

  // Open Edit Modal
  const openEditModal = (staff: StaffUser) => {
    setEditingStaff(staff);
    setEditFullName(staff.full_name);
    setEditDesignation(staff.designation);
    setEditDepartment(staff.department);
    setEditRoleKey(staff.role_key || 'staff');
    setEditPhone(staff.phone || '');
    setEditDistrict(staff.assigned_district || '');
    setEditTaluka(staff.assigned_taluka || '');
    setEditOfficeLocation(staff.assigned_location || '');
  };

  // Handle Update Staff
  const handleUpdateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;

    setSavingEdit(true);
    setError(null);

    const res = await updateStaffProfile({
      user_id: editingStaff.id,
      full_name: editFullName.trim(),
      designation: editDesignation.trim(),
      department: editDepartment.trim(),
      role_key: editRoleKey,
      phone: editPhone.trim() || undefined,
      assigned_district: editDistrict.trim() || undefined,
      assigned_taluka: editTaluka.trim() || undefined,
      assigned_location: editOfficeLocation.trim() || undefined,
    });

    setSavingEdit(false);

    if (res.error) {
      setError(res.error);
    } else {
      setEditingStaff(null);
      flashSuccess(`Staff member updated successfully.`);
      loadStaff();
    }
  };

  // Handle Toggle Active/Inactive
  const handleToggleStatus = async () => {
    if (!statusConfirmTarget) return;
    const { staff, action } = statusConfirmTarget;
    const newStatus = action === 'activate';

    const res = await toggleStaffStatus(
      staff.id,
      newStatus,
      `Administrative ${action} performed from Staff User Management console`
    );

    setStatusConfirmTarget(null);

    if (res.error) {
      setError(res.error);
    } else {
      flashSuccess(`Employee ${staff.full_name} ${newStatus ? 'activated' : 'deactivated'} successfully.`);
      loadStaff();
    }
  };

  // Handle Quick Authorize Interviewer
  const handleAuthorizeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorizeTarget) return;

    setAuthorizing(true);
    const res = await authorizeInterviewer(authorizeTarget.id, defaultMeetLink.trim());
    setAuthorizing(false);

    if (res.error) {
      setError(res.error);
    } else {
      setAuthorizeTarget(null);
      setDefaultMeetLink('');
      flashSuccess(`Interviewer authorization granted to ${authorizeTarget.full_name}.`);
      loadStaff();
    }
  };

  // Toggle Interviewer Status (Active/Deactivated)
  const handleToggleInterviewer = async (staff: StaffUser, newActive: boolean) => {
    if (!staff.interviewer_id) return;

    const res = await toggleInterviewerStatus(
      staff.interviewer_id,
      newActive,
      `Administrative toggle from Staff Directory`
    );

    if (res.error) {
      setError(res.error);
    } else {
      flashSuccess(`Interviewer status updated for ${staff.full_name}.`);
      loadStaff();
    }
  };

  // View Authorization Audit History
  const viewAuditHistory = async (staff: StaffUser) => {
    if (!staff.interviewer_id) return;
    setLoadingAudit(true);
    const res = await getInterviewerAuditHistory(staff.interviewer_id);
    setLoadingAudit(false);

    if (res.error) {
      setError(res.error);
    } else {
      setAuditTarget({ staff, history: res.data });
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6 font-sans">
      {/* ── Top Header Bar ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2 flex-wrap">
                Staff User Management
                <span className="text-[11px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md border border-blue-200">
                  Administration
                </span>
                {envInfo.isStagingLive ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                    {envInfo.label}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-amber-600" />
                    PREVIEW – IN-MEMORY / NON-PERSISTENT
                  </span>
                )}
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Manage operational personnel, employment designations, and RMS interviewer authorizations.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadStaff()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all disabled:opacity-50"
            title="Refresh Directory"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-black rounded-xl shadow-md transition-all hover:shadow-lg"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create / Invite Staff</span>
          </button>
        </div>
      </div>

      {/* ── Preview Mode Guidance Banner ─────────────────────────── */}
      {!envInfo.isStagingLive && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start justify-between text-xs text-amber-900 shadow-xs">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold">Preview Mode Active (In-Memory Repository)</span>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Displaying local mock staff directory. Create, edit, status toggle, and interviewer authorizations are simulated in-memory and non-persistent. To connect Localhost to the live MAHA-AGRI STAGING database, supply your Staging credentials in <code className="bg-amber-100 px-1 py-0.5 rounded text-amber-950 font-mono font-bold">.env.local</code>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Alerts & Feedback ──────────────────────────────────────── */}
      {hasAuthSession === false && envInfo.isStagingLive && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-amber-900 shadow-xs">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Supabase Authentication Required:</strong> An active Supabase Auth session on {envInfo.isProduction ? 'Production' : 'Staging'} is required for staff provisioning.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowQuickLoginModal(true)}
              className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg transition-colors shadow-xs"
            >
              Authenticate Session
            </button>
            <Link
              to="/login"
              state={{ from: '/admin/users' }}
              className="px-3.5 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-lg transition-colors"
            >
              Sign In Page
            </Link>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-rose-800 shadow-xs">
          <div className="flex items-start sm:items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <span className="font-semibold">{error}</span>
              {error.includes('Authentication required') && (
                <div className="mt-1 flex items-center gap-3">
                  <button
                    onClick={() => setShowQuickLoginModal(true)}
                    className="inline-flex items-center gap-1 text-emerald-800 font-extrabold underline hover:text-emerald-950"
                  >
                    Authenticate with Supabase Auth
                  </button>
                  <span className="text-slate-400">|</span>
                  <Link
                    to="/login"
                    state={{ from: '/admin/users' }}
                    className="inline-flex items-center gap-1 text-blue-700 underline font-bold hover:text-blue-900"
                  >
                    Go to Login Page
                  </Link>
                </div>
              )}
            </div>
          </div>
          <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-800 self-start sm:self-center">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {actionSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-bold">{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-500 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── KPI Counter Cards ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Total Staff Users</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{stats.total}</h3>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">Profiles in platform</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Active Employees</p>
            <h3 className="text-2xl font-black text-emerald-700 mt-1">{stats.active}</h3>
            <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Eligible for operations</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">RMS Interviewers</p>
            <h3 className="text-2xl font-black text-blue-700 mt-1">{stats.interviewers}</h3>
            <p className="text-[11px] text-blue-600 font-medium mt-0.5">Authorized for panels</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Active Departments</p>
            <h3 className="text-2xl font-black text-purple-700 mt-1">{stats.depts}</h3>
            <p className="text-[11px] text-purple-600 font-medium mt-0.5">Operational divisions</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
            <Building2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ── Search & Filter Controls ──────────────────────────────── */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Search bar */}
          <div className="sm:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by name, email, or designation..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Department Filter */}
          <div className="sm:col-span-3">
            <select
              value={departmentFilter}
              onChange={e => setDepartmentFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Departments</option>
              {STANDARD_DEPARTMENTS.map((dept, idx) => (
                <option key={idx} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          {/* Designation Filter */}
          <div className="sm:col-span-2">
            <select
              value={designationFilter}
              onChange={e => setDesignationFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Designations</option>
              {STANDARD_DESIGNATIONS.map((desig, idx) => (
                <option key={idx} value={desig}>{desig}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="sm:col-span-2">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Staff Table & Responsive Directory ────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Desktop View (Table-Fixed, No Horizontal Overflow on >=1024px) */}
        <div className="hidden lg:block overflow-x-hidden">
          <table className="w-full table-fixed text-left border-collapse text-xs">
            <colgroup>
              <col className="w-[24%]" />
              <col className="w-[14%]" />
              <col className="w-[14%]" />
              <col className="w-[10%]" />
              <col className="w-[9%]" />
              <col className="w-[12%]" />
              <col className="w-[17%]" />
            </colgroup>
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-extrabold uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3">Employee</th>
                <th className="py-2.5 px-3">Designation</th>
                <th className="py-2.5 px-3">Department</th>
                <th className="py-2.5 px-3">System Role</th>
                <th className="py-2.5 px-3">Staff Status</th>
                <th className="py-2.5 px-3">Interviewer Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                      <span>Loading staff directory...</span>
                    </div>
                  </td>
                </tr>
              ) : staffList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <Users className="w-8 h-8 text-slate-300" />
                      <p className="font-bold text-slate-700">No staff members found.</p>
                      <p className="text-[11px]">Create a new staff user or adjust your filter criteria.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                staffList.map((staff) => {
                  const isInterviewerActive = staff.is_interviewer && staff.interviewer_is_active;

                  return (
                    <tr key={staff.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Name, Employee ID, Email, Phone & Location */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-700 to-indigo-700 text-white font-bold text-xs flex items-center justify-center shrink-0">
                            {staff.full_name?.charAt(0)?.toUpperCase() || 'U'}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="font-bold text-slate-900 truncate" title={staff.full_name}>
                                {staff.full_name}
                              </span>
                              {staff.employee_code && (
                                <span
                                  className="text-[9.5px] font-mono font-extrabold bg-blue-50 text-blue-800 border border-blue-200 px-1 py-0.2 rounded shrink-0"
                                  title={`Employee Code: ${staff.employee_code}`}
                                >
                                  {staff.employee_code}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 font-mono truncate" title={staff.email}>
                              {staff.email}
                            </p>
                            {(staff.assigned_district || staff.assigned_location) && (
                              <p
                                className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5 font-medium truncate"
                                title={`${staff.assigned_taluka ? `${staff.assigned_taluka}, ` : ''}${staff.assigned_district || staff.assigned_location}`}
                              >
                                <MapPin className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                <span className="truncate">
                                  {staff.assigned_taluka ? `${staff.assigned_taluka}, ` : ''}
                                  {staff.assigned_district || staff.assigned_location}
                                </span>
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Designation */}
                      <td className="py-2.5 px-3">
                        <span
                          className="font-semibold text-slate-800 bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded-md text-[11px] inline-block max-w-full truncate leading-snug"
                          title={staff.designation}
                        >
                          {staff.designation}
                        </span>
                      </td>

                      {/* Department */}
                      <td className="py-2.5 px-3">
                        <span className="text-xs text-slate-600 block truncate" title={staff.department}>
                          {staff.department}
                        </span>
                      </td>

                      {/* RBAC Role */}
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider truncate max-w-full ${
                            staff.role_key === 'super_admin'
                              ? 'bg-purple-100 text-purple-800 border border-purple-200'
                              : staff.role_key === 'admin'
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                          title={staff.role_name || staff.role_key}
                        >
                          {staff.role_name || staff.role_key}
                        </span>
                      </td>

                      {/* Staff Active/Inactive */}
                      <td className="py-2.5 px-3">
                        {staff.is_active ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-400 font-bold text-[11px]">
                            <XCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" /> Inactive
                          </span>
                        )}
                      </td>

                      {/* Interviewer Authorization Status */}
                      <td className="py-2.5 px-3">
                        {isInterviewerActive ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold rounded-md text-[10px]">
                              <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" /> Authorized
                            </span>
                            {staff.authorized_at && (
                              <p className="text-[9.5px] text-slate-400 font-mono truncate">
                                {new Date(staff.authorized_at).toLocaleDateString('en-IN')}
                              </p>
                            )}
                          </div>
                        ) : staff.is_interviewer && !staff.interviewer_is_active ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 border border-amber-200 text-amber-800 font-bold rounded-md text-[10px]">
                            <ShieldAlert className="w-3 h-3 text-amber-600 shrink-0" /> Deactivated
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">
                            Not Authorized
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Interviewer Authorization Action */}
                          {!staff.is_interviewer ? (
                            <button
                              onClick={() => {
                                setAuthorizeTarget(staff);
                                setDefaultMeetLink('');
                              }}
                              disabled={!staff.is_active}
                              className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg border border-blue-200 text-[10px] transition-colors disabled:opacity-40 shrink-0"
                              title="Authorize as Interviewer"
                            >
                              Authorize
                            </button>
                          ) : staff.interviewer_is_active ? (
                            <button
                              onClick={() => handleToggleInterviewer(staff, false)}
                              className="px-1.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold rounded-lg border border-amber-200 text-[10px] transition-colors shrink-0"
                              title="Deactivate Interviewer Status"
                            >
                              Deactivate
                            </button>
                          ) : (
                            <button
                              onClick={() => handleToggleInterviewer(staff, true)}
                              disabled={!staff.is_active}
                              className="px-1.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-lg border border-emerald-200 text-[10px] transition-colors disabled:opacity-40 shrink-0"
                              title="Reactivate Interviewer Status"
                            >
                              Reactivate
                            </button>
                          )}

                          {/* Audit history icon if interviewer */}
                          {staff.is_interviewer && (
                            <button
                              onClick={() => viewAuditHistory(staff)}
                              className="p-1 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors shrink-0"
                              title="View Authorization Audit History"
                            >
                              <History className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Generate / Reset Activation Credentials */}
                          <button
                            onClick={() => handleGenerateActivation(staff)}
                            disabled={generatingActivationForId === staff.id}
                            className="p-1 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-colors disabled:opacity-50 shrink-0"
                            title="Generate Activation Credentials / Password Reset"
                          >
                            <Key className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Profile */}
                          <button
                            onClick={() => openEditModal(staff)}
                            className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors shrink-0"
                            title="Edit Staff Information"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Activate / Deactivate Toggle */}
                          <button
                            onClick={() => setStatusConfirmTarget({
                              staff,
                              action: staff.is_active ? 'deactivate' : 'activate'
                            })}
                            className={`p-1 rounded-lg transition-colors shrink-0 ${
                              staff.is_active
                                ? 'text-rose-600 hover:bg-rose-50'
                                : 'text-emerald-600 hover:bg-emerald-50'
                            }`}
                            title={staff.is_active ? 'Deactivate Staff User' : 'Activate Staff User'}
                          >
                            {staff.is_active ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile / Tablet Responsive Card View (<1024px) */}
        <div className="block lg:hidden">
          {loading ? (
            <div className="py-12 text-center text-slate-400">
              <div className="flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                <span className="text-xs">Loading staff directory...</span>
              </div>
            </div>
          ) : staffList.length === 0 ? (
            <div className="py-12 text-center text-slate-400 px-4">
              <div className="flex flex-col items-center justify-center gap-1.5">
                <Users className="w-8 h-8 text-slate-300" />
                <p className="font-bold text-slate-700 text-xs">No staff members found.</p>
                <p className="text-[11px]">Create a new staff user or adjust your filter criteria.</p>
              </div>
            </div>
          ) : (
            <div className="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50/60">
              {staffList.map((staff) => {
                const isInterviewerActive = staff.is_interviewer && staff.interviewer_is_active;

                return (
                  <div
                    key={staff.id}
                    className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-3"
                  >
                    {/* Header: Avatar, Name, Employee Code, Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-700 to-indigo-700 text-white font-bold text-xs flex items-center justify-center shrink-0">
                          {staff.full_name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-bold text-slate-900 text-xs truncate" title={staff.full_name}>
                              {staff.full_name}
                            </p>
                            {staff.employee_code && (
                              <span className="text-[9.5px] font-mono font-extrabold bg-blue-50 text-blue-800 border border-blue-200 px-1 py-0.2 rounded shrink-0">
                                {staff.employee_code}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 font-mono truncate" title={staff.email}>
                            {staff.email}
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0 flex items-center gap-1">
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9.5px] font-black uppercase tracking-wider ${
                            staff.role_key === 'super_admin'
                              ? 'bg-purple-100 text-purple-800 border border-purple-200'
                              : staff.role_key === 'admin'
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {staff.role_name || staff.role_key}
                        </span>
                        {staff.is_active ? (
                          <span className="inline-flex items-center gap-0.5 text-emerald-700 font-bold text-[10px] bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 text-slate-500 font-bold text-[10px] bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            <XCircle className="w-3 h-3 text-slate-400" /> Inactive
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Information Grid */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Designation</span>
                        <span className="font-semibold text-slate-800 truncate block" title={staff.designation}>
                          {staff.designation}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Department</span>
                        <span className="text-slate-600 truncate block" title={staff.department}>
                          {staff.department}
                        </span>
                      </div>
                      {(staff.assigned_district || staff.assigned_location) && (
                        <div className="col-span-2 text-[10px] text-slate-500 flex items-center gap-1 font-medium truncate pt-1 border-t border-slate-200/60">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">
                            {staff.assigned_taluka ? `${staff.assigned_taluka}, ` : ''}
                            {staff.assigned_district || staff.assigned_location}
                          </span>
                        </div>
                      )}
                      <div className="col-span-2 pt-1 border-t border-slate-200/60 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Interviewer Status</span>
                        {isInterviewerActive ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold rounded text-[10px]">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" /> Authorized
                            {staff.authorized_at && ` (${new Date(staff.authorized_at).toLocaleDateString('en-IN')})`}
                          </span>
                        ) : staff.is_interviewer && !staff.interviewer_is_active ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 border border-amber-200 text-amber-800 font-bold rounded text-[10px]">
                            <ShieldAlert className="w-3 h-3 text-amber-600" /> Deactivated
                          </span>
                        ) : (
                          <span className="text-[10.5px] text-slate-400 italic">Not Authorized</span>
                        )}
                      </div>
                    </div>

                    {/* Card Actions Footer */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                      <div className="flex items-center gap-1.5">
                        {!staff.is_interviewer ? (
                          <button
                            onClick={() => {
                              setAuthorizeTarget(staff);
                              setDefaultMeetLink('');
                            }}
                            disabled={!staff.is_active}
                            className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg border border-blue-200 text-[10px] transition-colors disabled:opacity-40"
                          >
                            Authorize Interviewer
                          </button>
                        ) : staff.interviewer_is_active ? (
                          <button
                            onClick={() => handleToggleInterviewer(staff, false)}
                            className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold rounded-lg border border-amber-200 text-[10px] transition-colors"
                          >
                            Deactivate
                          </button>
                        ) : (
                          <button
                            onClick={() => handleToggleInterviewer(staff, true)}
                            disabled={!staff.is_active}
                            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-lg border border-emerald-200 text-[10px] transition-colors disabled:opacity-40"
                          >
                            Reactivate
                          </button>
                        )}
                        {staff.is_interviewer && (
                          <button
                            onClick={() => viewAuditHistory(staff)}
                            className="p-1 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View Authorization Audit History"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleGenerateActivation(staff)}
                          disabled={generatingActivationForId === staff.id}
                          className="p-1 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Generate Activation Credentials / Password Reset"
                        >
                          <Key className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => openEditModal(staff)}
                          className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Edit Staff Information"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => setStatusConfirmTarget({
                            staff,
                            action: staff.is_active ? 'deactivate' : 'activate'
                          })}
                          className={`p-1 rounded-lg transition-colors ${
                            staff.is_active
                              ? 'text-rose-600 hover:bg-rose-50'
                              : 'text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={staff.is_active ? 'Deactivate Staff User' : 'Activate Staff User'}
                        >
                          {staff.is_active ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── MODAL 1: CREATE / INVITE STAFF USER ───────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-hidden">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-[calc(100vw-24px)] sm:w-full max-w-lg max-h-[calc(100dvh-32px)] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header (Fixed, shrink-0) */}
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 bg-white shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 leading-tight">Create / Invite Staff User</h3>
                  <p className="text-[11px] text-slate-500">Associate an existing or new employee with designation.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form wrapping body and footer */}
            <form onSubmit={handleCreateStaff} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              {/* Modal Body (Scrollable, flex-1 min-h-0) */}
              <div className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-6 py-4 space-y-4 text-xs font-medium overscroll-contain">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Kulkarni"
                    value={formFullName}
                    onChange={e => setFormFullName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">Official Email *</label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. ramesh@maha-agri.gov.in"
                      value={formEmail}
                      onChange={e => setFormEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">Mobile Phone</label>
                    <input
                      type="tel"
                      placeholder="e.g. 9876543210"
                      maxLength={15}
                      value={formPhone}
                      onChange={e => setFormPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">Employment Designation *</label>
                    <select
                      value={formDesignation}
                      onChange={e => setFormDesignation(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    >
                      {STANDARD_DESIGNATIONS.map((desig, idx) => (
                        <option key={idx} value={desig}>{desig}</option>
                      ))}
                      <option value="Custom">+ Custom Designation...</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">Department *</label>
                    <select
                      value={formDepartment}
                      onChange={e => setFormDepartment(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    >
                      {STANDARD_DEPARTMENTS.map((dept, idx) => (
                        <option key={idx} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {formDesignation === 'Custom' && (
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">Specify Custom Designation *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Senior Agronomist / Technical Lead"
                      value={formCustomDesignation}
                      onChange={e => setFormCustomDesignation(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">System RBAC Role</label>
                  <select
                    value={formRoleKey}
                    onChange={e => setFormRoleKey(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="staff">Staff (Standard Internal Operations)</option>
                    <option value="admin">Administrator (Module & User Management)</option>
                  </select>
                </div>

                {/* Geographic Location Assignment */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
                  <div className="flex items-center gap-1.5 text-slate-700 font-bold text-[11px]">
                    <MapPin className="w-3.5 h-3.5 text-blue-600" />
                    <span>Location & Office Assignment (Optional)</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Assigned District</label>
                      <select
                        value={formDistrict}
                        onChange={e => {
                          setFormDistrict(e.target.value);
                          setFormTaluka('');
                        }}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 text-xs focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select District...</option>
                        {MAHARASHTRA_DISTRICTS.map((dist) => (
                          <option key={dist} value={dist}>{dist}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Assigned Taluka</label>
                      <select
                        value={formTaluka}
                        disabled={!formDistrict}
                        onChange={e => setFormTaluka(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 text-xs disabled:opacity-50 focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select Taluka...</option>
                        {formDistrict && getTalukasForDistrict(formDistrict).map((taluka) => (
                          <option key={taluka} value={taluka}>{taluka}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Office / Facility Details</label>
                    <input
                      type="text"
                      placeholder="e.g. Pune Division Headquarters, Agriculture Complex"
                      value={formOfficeLocation}
                      onChange={e => setFormOfficeLocation(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 text-xs focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="p-2.5 bg-blue-50/70 border border-blue-200/60 rounded-xl text-[11px] text-blue-900 flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>
                    <strong>Employee ID Automation:</strong> A unique ID (<code className="font-mono font-bold">MA-STF-{new Date().getFullYear()}-NNNN</code>) is automatically generated by the database sequence on save.
                  </span>
                </div>
              </div>

              {/* Modal Footer (Fixed, shrink-0) */}
              <div className="px-5 sm:px-6 py-3.5 border-t border-slate-100 flex items-center justify-end gap-2.5 shrink-0 bg-slate-50/70">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-200/70 font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingForm || (hasAuthSession === false && envInfo.isStagingLive)}
                  className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submittingForm && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  {hasAuthSession === false && envInfo.isStagingLive
                    ? 'Authentication Required'
                    : submittingForm
                    ? 'Saving Profile...'
                    : 'Save Staff User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: EDIT STAFF PROFILE ───────────────────────────── */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-hidden">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-[calc(100vw-24px)] sm:w-full max-w-lg max-h-[calc(100dvh-32px)] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header (Fixed, shrink-0) */}
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 bg-white shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 leading-tight">Edit Staff Information</h3>
                  <p className="text-[11px] text-slate-500 font-mono truncate max-w-[280px]">{editingStaff.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingStaff(null)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form wrapping body and footer */}
            <form onSubmit={handleUpdateStaff} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              {/* Modal Body (Scrollable, flex-1 min-h-0) */}
              <div className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-6 py-4 space-y-4 text-xs font-medium overscroll-contain">
                {/* System Identifiers (Read-Only) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                      <Lock className="w-3 h-3 text-slate-400" /> Employee ID (System Generated)
                    </span>
                    <div className="font-mono font-extrabold text-blue-900 text-xs">
                      {editingStaff.employee_code || 'Auto-generated on creation'}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                      <Lock className="w-3 h-3 text-slate-400" /> Auth Account
                    </span>
                    <div className="font-mono text-slate-700 text-xs truncate" title={editingStaff.email}>
                      {editingStaff.email}
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={editFullName}
                    onChange={e => setEditFullName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">Mobile Phone</label>
                  <input
                    type="tel"
                    placeholder="e.g. 9876543210"
                    maxLength={15}
                    value={editPhone}
                    onChange={e => setEditPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">Designation *</label>
                    <input
                      type="text"
                      required
                      value={editDesignation}
                      onChange={e => setEditDesignation(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">Department *</label>
                    <select
                      value={editDepartment}
                      onChange={e => setEditDepartment(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    >
                      {STANDARD_DEPARTMENTS.map((dept, idx) => (
                        <option key={idx} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">System Role</label>
                  <select
                    value={editRoleKey}
                    onChange={e => setEditRoleKey(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="staff">Staff</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                {/* Geographic Location Assignment */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
                  <div className="flex items-center gap-1.5 text-slate-700 font-bold text-[11px]">
                    <MapPin className="w-3.5 h-3.5 text-blue-600" />
                    <span>Location & Office Assignment</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">District</label>
                      <select
                        value={editDistrict}
                        onChange={e => {
                          setEditDistrict(e.target.value);
                          setEditTaluka('');
                        }}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 text-xs focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select District...</option>
                        {MAHARASHTRA_DISTRICTS.map((dist) => (
                          <option key={dist} value={dist}>{dist}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Taluka</label>
                      <select
                        value={editTaluka}
                        disabled={!editDistrict}
                        onChange={e => setEditTaluka(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 text-xs disabled:opacity-50 focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select Taluka...</option>
                        {editDistrict && getTalukasForDistrict(editDistrict).map((taluka) => (
                          <option key={taluka} value={taluka}>{taluka}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Office / Facility Details</label>
                    <input
                      type="text"
                      placeholder="e.g. Pune Division Headquarters, Agriculture Complex"
                      value={editOfficeLocation}
                      onChange={e => setEditOfficeLocation(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 text-xs focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer (Fixed, shrink-0) */}
              <div className="px-5 sm:px-6 py-3.5 border-t border-slate-100 flex items-center justify-end gap-2.5 shrink-0 bg-slate-50/70">
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-200/70 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  {savingEdit && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  {savingEdit ? 'Saving Changes...' : 'Update Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 3: QUICK AUTHORIZE INTERVIEWER ──────────────────── */}
      {authorizeTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Authorize as Interviewer</h3>
                  <p className="text-[11px] text-slate-500">Grant recruitment panel interview privileges.</p>
                </div>
              </div>
              <button
                onClick={() => setAuthorizeTarget(null)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1">
              <p className="text-[10px] uppercase font-extrabold text-slate-400">Employee Details</p>
              <p className="font-bold text-slate-900">{authorizeTarget.full_name}</p>
              <p className="text-slate-500 font-mono text-[11px]">{authorizeTarget.email}</p>
              <div className="flex items-center gap-2 pt-1 text-[11px]">
                <span className="font-semibold text-slate-700">Designation: {authorizeTarget.designation}</span>
                <span>•</span>
                <span className="text-slate-500">{authorizeTarget.department}</span>
              </div>
            </div>

            <form onSubmit={handleAuthorizeSubmit} className="space-y-4 text-xs font-medium">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">Default Google Meet Room Link (Optional)</label>
                <input
                  type="text"
                  placeholder="https://meet.google.com/xyz-uvwx-rst"
                  value={defaultMeetLink}
                  onChange={e => setDefaultMeetLink(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[10px] text-slate-400">Default room for this interviewer. Note: individual booking links can be overridden by Admin.</p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setAuthorizeTarget(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={authorizing}
                  className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl shadow-md transition-all disabled:opacity-50"
                >
                  {authorizing ? 'Granting...' : 'Grant Authorization'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 4: INTERVIEWER AUDIT HISTORY ────────────────────── */}
      {auditTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Interviewer Authorization History</h3>
                  <p className="text-[11px] text-slate-500 font-bold">{auditTarget.staff.full_name} ({auditTarget.staff.email})</p>
                </div>
              </div>
              <button
                onClick={() => setAuditTarget(null)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2.5 pr-1">
              {auditTarget.history.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No previous audit records found for this interviewer.
                </div>
              ) : (
                auditTarget.history.map((entry) => (
                  <div key={entry.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                        entry.action === 'authorized'
                          ? 'bg-blue-100 text-blue-800'
                          : entry.action === 'reactivated'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {entry.action}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(entry.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
                      </span>
                    </div>
                    <div className="text-slate-600 text-[11px]">
                      Performed by: <span className="font-bold text-slate-800">{entry.performed_by_name || 'Admin'}</span>
                    </div>
                    {entry.designation_at_time && (
                      <p className="text-[10px] text-slate-500">
                        Designation at time: <span className="font-semibold text-slate-700">{entry.designation_at_time}</span>
                      </p>
                    )}
                    {entry.reason && (
                      <p className="text-[10.5px] text-slate-600 italic bg-white p-1.5 rounded border border-slate-100 mt-1">
                        "{entry.reason}"
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setAuditTarget(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 5: STATUS CONFIRMATION (ACTIVATE / DEACTIVATE) ──── */}
      {statusConfirmTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-black text-slate-900">
                Confirm {statusConfirmTarget.action === 'activate' ? 'Activation' : 'Deactivation'}
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to <strong>{statusConfirmTarget.action}</strong> employee <strong>{statusConfirmTarget.staff.full_name}</strong>?
              {statusConfirmTarget.action === 'deactivate' && statusConfirmTarget.staff.is_interviewer && (
                <span className="block mt-2 text-rose-600 font-semibold bg-rose-50 p-2 rounded-lg border border-rose-100">
                  Note: Deactivating this staff member will automatically revoke their active interviewer pool allocation.
                </span>
              )}
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setStatusConfirmTarget(null)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleToggleStatus}
                className={`px-4 py-2 text-white font-bold rounded-xl text-xs shadow-md transition-all ${
                  statusConfirmTarget.action === 'activate'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                Yes, {statusConfirmTarget.action === 'activate' ? 'Activate Employee' : 'Deactivate Employee'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 6: STAFF ACTIVATION CREDENTIALS MODAL ────────────────── */}
      {activationModalData && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Staff Activation Credentials</h3>
                  <p className="text-[11px] text-slate-500">First-login temporary password generated</p>
                </div>
              </div>
              <button
                onClick={() => setActivationModalData(null)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Employee Name</span>
                  <p className="font-bold text-slate-800">{activationModalData.fullName}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Login Email</span>
                  <p className="font-mono font-medium text-slate-800">{activationModalData.email}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-amber-600">Temporary Activation Password</span>
                  <div className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-amber-200 mt-0.5">
                    <span className="font-mono font-bold text-slate-900 text-sm tracking-wider">
                      {activationModalData.tempPassword}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(`Email: ${activationModalData.email}\nTemporary Password: ${activationModalData.tempPassword}`);
                        setCopiedCredentials(true);
                        setTimeout(() => setCopiedCredentials(false), 2000);
                      }}
                      className="text-xs text-amber-700 hover:text-amber-900 font-bold flex items-center gap-1 bg-amber-50 px-2 py-1 rounded"
                    >
                      {copiedCredentials ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedCredentials ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-[11px] text-amber-900 leading-relaxed space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-amber-800">
                  <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                  Mandatory First-Login Password Change
                </p>
                <p>
                  Share these credentials securely with the employee. Upon first sign-in, the system will prompt them to create a new personal password before accessing their dashboard.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setActivationModalData(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition"
              >
                Close & Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 5: QUICK SUPABASE AUTH RE-AUTHENTICATION ───────── */}
      {showQuickLoginModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Supabase Auth Session</h3>
                  <p className="text-[11px] text-slate-500">Connect active Administrator or Super Admin credentials.</p>
                </div>
              </div>
              <button
                onClick={() => setShowQuickLoginModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {quickLoginError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{quickLoginError}</span>
              </div>
            )}

            <form onSubmit={handleQuickSignIn} className="space-y-4 text-xs font-medium">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">Administrator Email</label>
                <input
                  type="email"
                  required
                  placeholder="Enter administrator email address"
                  autoComplete="username"
                  value={quickLoginEmail}
                  onChange={e => setQuickLoginEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">Password</label>
                <input
                  type="password"
                  required
                  placeholder="Enter administrator password"
                  autoComplete="current-password"
                  value={quickLoginPassword}
                  onChange={e => setQuickLoginPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="p-3 bg-emerald-50/70 border border-emerald-200/70 rounded-xl text-[11px] text-emerald-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-emerald-800">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Staging Supabase Auth Target
                </p>
                <p>
                  Connecting to Staging (<code className="font-mono font-bold text-emerald-950">vlpschmvotaunsxcunnn</code>). Establishes live JWT session for staff provisioning and interviewer authorizations.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowQuickLoginModal(false);
                    setQuickLoginPassword('');
                  }}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={quickLoginLoading || !quickLoginEmail.trim() || !quickLoginPassword}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-md transition-all disabled:opacity-50"
                >
                  {quickLoginLoading ? 'Connecting...' : 'Activate Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffUserManagement;

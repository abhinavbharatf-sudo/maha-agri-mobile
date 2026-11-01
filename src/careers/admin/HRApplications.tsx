import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Search, Filter, FileText, User, MapPin, Calendar, Briefcase,
  ChevronDown, X, Eye, Archive, Trash2, RotateCcw, AlertCircle,
  CheckCircle, Loader2, AlertTriangle, ShieldAlert, Download, GraduationCap
} from 'lucide-react';
import { determineHighestQualificationIndex } from '../portal/types';
import {
  listApplicationsForHR, listAllJobs, archiveApplication,
  restoreApplication, trashApplication, restoreTrashApplication,
  permanentlyDeleteApplication
} from '../lib/api';
import type { RmsApplicationWithDetails, ApplicationStatus, RmsJobPosting } from '../lib/types';
import ApplicationStatusBadge from '../components/ApplicationStatusBadge';
import { APPLICATION_STATUS_CONFIG, MAHARASHTRA_DISTRICTS } from '../lib/constants';
import HRCandidateProfile from './HRCandidateProfile';
import { supabase } from '../../lib/supabase/client';
import { useAuth } from '../../lib/auth/AuthContext';

const STATUSES = Object.entries(APPLICATION_STATUS_CONFIG).map(([k, v]) => ({ value: k as ApplicationStatus, label: v.label }));

type ViewTab = 'active' | 'archived' | 'trash';
type ConfirmAction = 'archive' | 'restore' | 'trash' | 'restore_trash' | 'delete';

export default function HRApplications() {
  const { roleKey, permissions } = useAuth();
  const isSuperAdmin =
    roleKey === 'super_admin' ||
    roleKey === 'SUPER_ADMIN' ||
    roleKey === 'ROOT_SUPER_ADMIN' ||
    permissions.has('super_admin') ||
    permissions.has('all');
  const isAdmin =
    isSuperAdmin ||
    roleKey === 'admin' ||
    roleKey === 'STATE_ADMIN' ||
    roleKey === 'hr_manager' ||
    permissions.has('admin') ||
    permissions.has('hr');

  const [viewTab, setViewTab] = useState<ViewTab>('active');
  const [apps, setApps] = useState<RmsApplicationWithDetails[]>([]);
  const [jobs, setJobs] = useState<Pick<RmsJobPosting, 'id' | 'title'>[]>([]);
  const [loading, setLoading] = useState(true);

  // Tab counts
  const [tabCounts, setTabCounts] = useState<{ active: number; archived: number; trash: number }>({
    active: 0,
    archived: 0,
    trash: 0,
  });

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | ''>('');
  const [districtFilter, setDistrictFilter] = useState('');
  const [talukaFilter, setTalukaFilter] = useState('');
  const [jobFilter, setJobFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Feedback notifications
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Confirm Modal state
  const [confirmModal, setConfirmModal] = useState<{
    action: ConfirmAction;
    app: RmsApplicationWithDetails;
  } | null>(null);
  const [actionProcessing, setActionProcessing] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Profile drawer
  const [profileAppId, setProfileAppId] = useState<string | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 5000);
  };

  const loadCounts = useCallback(async () => {
    try {
      const [act, arc, tra] = await Promise.all([
        listApplicationsForHR({ view: 'active' }),
        listApplicationsForHR({ view: 'archived' }),
        listApplicationsForHR({ view: 'trash' }),
      ]);
      setTabCounts({
        active: act.data?.length ?? 0,
        archived: arc.data?.length ?? 0,
        trash: tra.data?.length ?? 0,
      });
    } catch (e) {
      console.warn('[HRApplications] Failed to load tab counts:', e);
    }
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    listApplicationsForHR({
      view: viewTab,
      status: statusFilter,
      district: districtFilter || undefined,
      taluka: talukaFilter || undefined,
      job_posting_id: jobFilter || undefined,
      search: search || undefined,
    }).then(r => {
      setApps(r.data ?? []);
      setLoading(false);
    });
    loadCounts();
  }, [viewTab, search, statusFilter, districtFilter, talukaFilter, jobFilter, loadCounts]);

  useEffect(() => { load(); }, [load]);

  // Phase 5: HR Realtime Notifications
  useEffect(() => {
    const channel = supabase.channel('hr-applications-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rms_applications' }, payload => {
        if (payload.new && (payload.new as any).status !== 'draft') {
          load();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  useEffect(() => {
    listAllJobs().then(r => setJobs((r.data ?? []).map(j => ({ id: j.id, title: j.title }))));
  }, []);

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('');
    setDistrictFilter('');
    setTalukaFilter('');
    setJobFilter('');
  };

  const hasActiveFilters = search || statusFilter || districtFilter || talukaFilter || jobFilter;

  // Execute confirmed action
  const handleExecuteAction = async () => {
    if (!confirmModal) return;
    const { action, app } = confirmModal;
    setActionProcessing(true);
    setModalError(null);

    let err: string | null = null;
    try {
      if (action === 'archive') {
        const res = await archiveApplication(app.id);
        err = res.error;
        if (!err) showToast(`Application "${app.application_number}" archived successfully.`);
      } else if (action === 'restore') {
        const res = await restoreApplication(app.id);
        err = res.error;
        if (!err) showToast(`Application "${app.application_number}" restored to active queue.`);
      } else if (action === 'trash') {
        const res = await trashApplication(app.id);
        err = res.error;
        if (!err) showToast(`Application "${app.application_number}" moved to Trash.`);
      } else if (action === 'restore_trash') {
        const res = await restoreTrashApplication(app.id);
        err = res.error;
        if (!err) showToast(`Application "${app.application_number}" restored from Trash.`);
      } else if (action === 'delete') {
        const res = await permanentlyDeleteApplication(app.id);
        err = res.error;
        if (!err) showToast(`Application "${app.application_number}" permanently deleted.`);
      }
    } catch (e: any) {
      err = e.message || 'Operation failed. Please try again.';
    }

    setActionProcessing(false);
    if (err) {
      setModalError(err);
    } else {
      setConfirmModal(null);
      load();
    }
  };

  const handleExportCSV = () => {
    if (!apps || apps.length === 0) return;

    const headers = [
      'Application Number',
      'Candidate Name',
      'Mobile',
      'Job Title',
      'Status',
      'Submitted Date',
      'Preferred District',
      'Preferred Taluka',
      'Highest Qualification',
      'All Educational Qualifications',
      'Total Experience'
    ];

    const rows = apps.map(app => {
      const cand = Array.isArray(app.candidate) ? app.candidate[0] : app.candidate;
      const appData = (app as any).application_data || {};
      const jobSpec = appData.job_specific || appData.submission_snapshot?.job_specific || {};
      const quals: any[] = Array.isArray(jobSpec.qualifications) && jobSpec.qualifications.length > 0
        ? jobSpec.qualifications
        : [];

      let highestQualText = jobSpec.highestQualification || '—';
      if (quals.length > 0) {
        const highestIdx = determineHighestQualificationIndex(quals);
        const hq = quals[highestIdx] || quals[0];
        let hqCourse = hq.course || '';
        if (hq.level === 'Other Equivalent Education') hqCourse = hq.customQualification || 'Other';
        else if (hq.course === 'Other') hqCourse = hq.customCourse || 'Other';
        highestQualText = `${hq.level}${hqCourse ? ` - ${hqCourse}` : ''} (${hq.passingYear || ''}) [${hq.marksValue || ''}${hq.gradingFormat === 'cgpa' ? ' CGPA' : '%'}]`;
      }

      const allQualsText = quals.length > 0
        ? quals.map(q => {
            let c = q.course || '';
            if (q.level === 'Other Equivalent Education') c = q.customQualification || 'Other';
            else if (q.course === 'Other') c = q.customCourse || 'Other';
            return `${q.level}${c ? ` - ${c}` : ''} (${q.passingYear || ''}): ${q.marksValue || ''}${q.gradingFormat === 'cgpa' ? ' CGPA' : '%'}`;
          }).join(' | ')
        : highestQualText;

      const expText = jobSpec.experienceYears
        ? `${jobSpec.experienceYears}Y ${jobSpec.experienceMonths || '0'}M ${jobSpec.experienceDays ? `${jobSpec.experienceDays}D` : ''}`
        : '0Y';

      return [
        `"${app.application_number || ''}"`,
        `"${(cand?.full_name || '').replace(/"/g, '""')}"`,
        `"${cand?.mobile || ''}"`,
        `"${(app.job_posting?.title || '').replace(/"/g, '""')}"`,
        `"${APPLICATION_STATUS_CONFIG[app.status]?.label || app.status}"`,
        `"${app.submitted_at ? new Date(app.submitted_at).toLocaleDateString('en-IN') : ''}"`,
        `"${app.preferred_district || ''}"`,
        `"${app.preferred_taluka || ''}"`,
        `"${highestQualText.replace(/"/g, '""')}"`,
        `"${allQualsText.replace(/"/g, '""')}"`,
        `"${expText}"`,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `maha_agri_applications_${viewTab}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5">
      {/* Toast Alert */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`flex items-center gap-2 p-3.5 rounded-xl border text-sm font-semibold shadow-sm ${
              toastMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* View Switcher Tabs */}
      <div className="flex border-b border-primary-200 gap-2">
        <button
          onClick={() => { setViewTab('active'); clearFilters(); }}
          className={`flex items-center gap-2 px-4 py-2.5 font-bold text-sm border-b-2 transition-all -mb-px ${
            viewTab === 'active'
              ? 'border-primary-900 text-primary-900 bg-white/70 rounded-t-lg'
              : 'border-transparent text-primary-500 hover:text-primary-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          Active Applications
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
            viewTab === 'active' ? 'bg-primary-900 text-white' : 'bg-primary-100 text-primary-700'
          }`}>
            {tabCounts.active}
          </span>
        </button>

        <button
          onClick={() => { setViewTab('archived'); clearFilters(); }}
          className={`flex items-center gap-2 px-4 py-2.5 font-bold text-sm border-b-2 transition-all -mb-px ${
            viewTab === 'archived'
              ? 'border-amber-600 text-amber-900 bg-amber-50/50 rounded-t-lg'
              : 'border-transparent text-primary-500 hover:text-primary-800'
          }`}
        >
          <Archive className="w-4 h-4 text-amber-600" />
          Archived Applications
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
            viewTab === 'archived' ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-800'
          }`}>
            {tabCounts.archived}
          </span>
        </button>

        <button
          onClick={() => { setViewTab('trash'); clearFilters(); }}
          className={`flex items-center gap-2 px-4 py-2.5 font-bold text-sm border-b-2 transition-all -mb-px ${
            viewTab === 'trash'
              ? 'border-red-600 text-red-900 bg-red-50/50 rounded-t-lg'
              : 'border-transparent text-primary-500 hover:text-primary-800'
          }`}
        >
          <Trash2 className="w-4 h-4 text-red-600" />
          Trash
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
            viewTab === 'trash' ? 'bg-red-600 text-white' : 'bg-red-100 text-red-800'
          }`}>
            {tabCounts.trash}
          </span>
        </button>
      </div>

      {/* Search + filter bar */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-64 bg-white border border-primary-200 rounded-xl px-3 py-2.5 shadow-sm">
          <Search className="w-4 h-4 text-primary-400 shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={`Search ${viewTab === 'active' ? 'active' : viewTab} by name, mobile, application number...`}
            className="flex-1 text-sm text-primary-900 placeholder-primary-400 bg-transparent focus:outline-none"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-primary-300 hover:text-primary-600 transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
            hasActiveFilters
              ? 'bg-primary-900 text-white border-primary-900'
              : 'bg-white border-primary-200 text-primary-700 hover:border-primary-400'
          }`}
        >
          <Filter className="w-4 h-4" />
          Filters
          {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-amber-400" />}
        </button>

        <div className="flex items-center gap-2 px-3 py-2 bg-primary-50 border border-primary-200 rounded-xl">
          <span className="text-sm font-bold text-primary-700">{loading ? '—' : apps.length}</span>
          <span className="text-sm text-primary-500">
            {viewTab === 'active' ? 'active' : viewTab} {apps.length === 1 ? 'application' : 'applications'}
          </span>
        </div>

        <button
          type="button"
          onClick={handleExportCSV}
          disabled={loading || apps.length === 0}
          className="flex items-center gap-2 px-3.5 py-2 bg-white border border-primary-200 text-primary-700 hover:border-primary-400 hover:text-primary-900 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
          title="Export applications to CSV with candidate qualifications and experience"
        >
          <Download className="w-4 h-4 text-primary-600" />
          <span>Export (CSV)</span>
        </button>
      </div>

      {/* Expanded filter row */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white border border-primary-100 rounded-xl p-4"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* Status */}
              <div>
                <label className="block text-xs font-bold text-primary-500 uppercase tracking-wider mb-1.5">Status</label>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value as ApplicationStatus | '')}
                  className="w-full text-sm border border-primary-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white text-primary-700"
                >
                  <option value="">All Statuses</option>
                  {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>

              {/* District */}
              <div>
                <label className="block text-xs font-bold text-primary-500 uppercase tracking-wider mb-1.5">District</label>
                <select
                  value={districtFilter}
                  onChange={e => setDistrictFilter(e.target.value)}
                  className="w-full text-sm border border-primary-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white text-primary-700"
                >
                  <option value="">All Districts</option>
                  {MAHARASHTRA_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              {/* Taluka */}
              <div>
                <label className="block text-xs font-bold text-primary-500 uppercase tracking-wider mb-1.5">Taluka</label>
                <input
                  value={talukaFilter}
                  onChange={e => setTalukaFilter(e.target.value)}
                  placeholder="Filter by taluka..."
                  className="w-full text-sm border border-primary-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white text-primary-700"
                />
              </div>

              {/* Job Role */}
              <div>
                <label className="block text-xs font-bold text-primary-500 uppercase tracking-wider mb-1.5">Job Role</label>
                <select
                  value={jobFilter}
                  onChange={e => setJobFilter(e.target.value)}
                  className="w-full text-sm border border-primary-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white text-primary-700"
                >
                  <option value="">All Roles</option>
                  {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
                </select>
              </div>
            </div>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="mt-3 text-xs font-semibold text-red-600 hover:text-red-800 transition-colors flex items-center gap-1"
              >
                <X className="w-3 h-3" /> Clear all filters
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Application list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="animate-pulse bg-white rounded-xl h-20 border border-primary-100" />
          ))}
        </div>
      ) : apps.length === 0 ? (
        <div className="bg-white rounded-2xl border border-primary-100 p-16 text-center">
          <FileText className="w-12 h-12 text-primary-200 mx-auto mb-3" />
          <p className="font-semibold text-primary-600 text-base mb-1">
            {viewTab === 'active'
              ? 'No active applications found'
              : viewTab === 'archived'
              ? 'No archived applications'
              : 'Trash is empty'}
          </p>
          <p className="text-sm text-primary-400">
            {hasActiveFilters ? 'Try adjusting your filters.' : `There are currently no applications in ${viewTab}.`}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {apps.map((app, idx) => {
            const rawCandidate = app.candidate as any;
            const candidate = (Array.isArray(rawCandidate) ? rawCandidate[0] : rawCandidate) as {
              full_name?: string;
              mobile?: string;
              candidate_id?: string;
              district?: string;
              taluka?: string;
            } | undefined;

            return (
              <motion.div
                key={app.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.02 }}
                className={`bg-white rounded-xl border transition-all ${
                  viewTab === 'archived'
                    ? 'border-amber-200 hover:border-amber-400'
                    : viewTab === 'trash'
                    ? 'border-red-200 hover:border-red-400'
                    : 'border-primary-100 hover:border-primary-300'
                } hover:shadow-sm`}
              >
                <div className="flex flex-wrap items-center gap-3 p-4">
                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="font-mono text-xs text-primary-400">{app.application_number}</span>
                      <ApplicationStatusBadge status={app.status} size="sm" />

                      {viewTab === 'archived' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                          <Archive className="w-3 h-3" />
                          Archived {app.archived_at ? new Date(app.archived_at).toLocaleDateString('en-IN') : ''}
                        </span>
                      )}

                      {viewTab === 'trash' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-800">
                          <Trash2 className="w-3 h-3" />
                          Trashed {app.trashed_at ? new Date(app.trashed_at).toLocaleDateString('en-IN') : ''}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                      <span className="flex items-center gap-1.5 font-bold text-primary-900">
                        <User className="w-3.5 h-3.5 text-primary-400" />
                        {candidate?.full_name ?? 'Unknown'}
                      </span>
                      {candidate?.mobile && (
                        <span className="text-primary-500 text-xs">{candidate.mobile}</span>
                      )}
                      {app.job_posting?.title && (
                        <span className="flex items-center gap-1 text-primary-700 font-medium text-xs">
                          <Briefcase className="w-3 h-3 text-primary-400" />
                          {app.job_posting.title}
                        </span>
                      )}
                      {(candidate?.district ?? app.preferred_district) && (
                        <span className="flex items-center gap-1 text-xs text-primary-500">
                          <MapPin className="w-3 h-3" />
                          {candidate?.district ?? app.preferred_district}
                          {candidate?.taluka && ` · ${candidate.taluka}`}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-primary-400 flex items-center gap-1 mr-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(app.created_at).toLocaleDateString('en-IN')}
                    </span>

                    {/* View Drawer Button */}
                    <button
                      type="button"
                      onClick={() => setProfileAppId(app.id)}
                      className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-primary-900 text-white hover:bg-primary-800 transition-colors shadow-sm"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View
                    </button>

                    {/* Active View Actions */}
                    {viewTab === 'active' && isAdmin && (
                      <>
                        <button
                          type="button"
                          onClick={() => { setModalError(null); setConfirmModal({ action: 'archive', app }); }}
                          title="Archive Application"
                          className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100 transition-colors"
                        >
                          <Archive className="w-3.5 h-3.5" />
                          Archive
                        </button>

                        <button
                          type="button"
                          onClick={() => { setModalError(null); setConfirmModal({ action: 'trash', app }); }}
                          title="Move to Trash"
                          className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-slate-300 text-slate-700 bg-slate-50 hover:bg-red-50 hover:text-red-700 hover:border-red-300 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Trash
                        </button>
                      </>
                    )}

                    {/* Archived View Actions */}
                    {viewTab === 'archived' && isAdmin && (
                      <>
                        <button
                          type="button"
                          onClick={() => { setModalError(null); setConfirmModal({ action: 'restore', app }); }}
                          className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Restore
                        </button>

                        <button
                          type="button"
                          onClick={() => { setModalError(null); setConfirmModal({ action: 'trash', app }); }}
                          title="Move to Trash"
                          className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-slate-300 text-slate-700 bg-slate-50 hover:bg-red-50 hover:text-red-700 hover:border-red-300 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Trash
                        </button>
                      </>
                    )}

                    {/* Trash View Actions */}
                    {viewTab === 'trash' && isAdmin && (
                      <>
                        <button
                          type="button"
                          onClick={() => { setModalError(null); setConfirmModal({ action: 'restore_trash', app }); }}
                          className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Restore
                        </button>

                        {isSuperAdmin ? (
                          <button
                            type="button"
                            onClick={() => { setModalError(null); setConfirmModal({ action: 'delete', app }); }}
                            title="Permanent Deletion (Super Admin Only)"
                            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-red-600 text-white hover:bg-red-700 transition-colors shadow-sm"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                          </button>
                        ) : (
                          <span
                            title="Permanent deletion requires Super Admin role."
                            className="text-[11px] text-slate-400 font-semibold px-2 py-1 bg-slate-100 rounded-lg cursor-not-allowed"
                          >
                            Delete (Super Admin)
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-primary-100 space-y-4"
            >
              <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-xl shrink-0 ${
                  confirmModal.action === 'delete'
                    ? 'bg-red-100 text-red-600'
                    : confirmModal.action === 'archive'
                    ? 'bg-amber-100 text-amber-700'
                    : confirmModal.action === 'trash'
                    ? 'bg-orange-100 text-orange-700'
                    : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {confirmModal.action === 'delete' ? (
                    <ShieldAlert className="w-6 h-6" />
                  ) : confirmModal.action === 'archive' ? (
                    <Archive className="w-6 h-6" />
                  ) : confirmModal.action === 'trash' ? (
                    <Trash2 className="w-6 h-6" />
                  ) : (
                    <RotateCcw className="w-6 h-6" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-primary-900">
                    {confirmModal.action === 'archive' && 'Archive Candidate Application'}
                    {confirmModal.action === 'restore' && 'Restore Application from Archive'}
                    {confirmModal.action === 'trash' && 'Move Application to Trash'}
                    {confirmModal.action === 'restore_trash' && 'Restore Application from Trash'}
                    {confirmModal.action === 'delete' && 'Permanently Delete Application'}
                  </h3>
                  <p className="text-xs text-primary-500 font-mono mt-0.5">
                    {confirmModal.app.application_number} · {(Array.isArray(confirmModal.app.candidate) ? confirmModal.app.candidate[0] : confirmModal.app.candidate)?.full_name ?? 'Candidate'}
                  </p>
                </div>

                <button
                  onClick={() => { if (!actionProcessing) setConfirmModal(null); }}
                  className="p-1 rounded-lg hover:bg-primary-50 text-primary-400 hover:text-primary-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Explanatory Context Message */}
              <div className="text-sm text-primary-700 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-primary-100">
                {confirmModal.action === 'archive' && (
                  <p>
                    Archiving removes this application from the active HR recruitment queue.
                    <strong> All applicant records, uploaded documents, fee payments, and interview history are safely preserved.</strong> You can restore this application at any time from the Archived view.
                  </p>
                )}
                {confirmModal.action === 'restore' && (
                  <p>
                    This application will be restored to the <strong>Active Applications</strong> list. Its current status (<strong>{APPLICATION_STATUS_CONFIG[confirmModal.app.status]?.label ?? confirmModal.app.status}</strong>) and all linked data will remain intact.
                  </p>
                )}
                {confirmModal.action === 'trash' && (
                  <p>
                    This application will be moved to the <strong>Trash</strong>. It will be hidden from active HR queues. You can restore it back to the active list from the Trash view if needed.
                  </p>
                )}
                {confirmModal.action === 'restore_trash' && (
                  <p>
                    This application will be restored from the Trash to the <strong>Active Applications</strong> list.
                  </p>
                )}
                {confirmModal.action === 'delete' && (
                  <div className="space-y-2">
                    <p className="text-red-700 font-semibold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      Warning: Permanent deletion cannot be undone.
                    </p>
                    <p className="text-xs text-slate-600">
                      Permanent deletion is restricted to Super Admin role and is logged in the permanent audit trail.
                      <strong> Applications with recorded payments, appointment letters, interview bookings, evaluations, notes, candidate documents, or training allocations cannot be permanently deleted</strong> under compliance and statutory data-retention requirements.
                    </p>
                  </div>
                )}
              </div>

              {/* Modal Error alert */}
              {modalError && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={actionProcessing}
                  onClick={() => setConfirmModal(null)}
                  className="px-4 py-2 border border-primary-200 text-primary-700 font-semibold rounded-xl hover:bg-primary-50 text-xs transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={actionProcessing}
                  onClick={handleExecuteAction}
                  className={`flex items-center gap-1.5 px-4 py-2 font-bold rounded-xl text-xs text-white shadow-sm transition-all disabled:opacity-60 ${
                    confirmModal.action === 'delete'
                      ? 'bg-red-600 hover:bg-red-700'
                      : confirmModal.action === 'archive'
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : confirmModal.action === 'trash'
                      ? 'bg-orange-600 hover:bg-orange-700'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {actionProcessing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {confirmModal.action === 'archive' && (actionProcessing ? 'Archiving...' : 'Confirm Archive')}
                  {confirmModal.action === 'restore' && (actionProcessing ? 'Restoring...' : 'Confirm Restore')}
                  {confirmModal.action === 'trash' && (actionProcessing ? 'Moving to Trash...' : 'Move to Trash')}
                  {confirmModal.action === 'restore_trash' && (actionProcessing ? 'Restoring...' : 'Restore Application')}
                  {confirmModal.action === 'delete' && (actionProcessing ? 'Deleting...' : 'Permanently Delete')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Candidate Profile Drawer */}
      <AnimatePresence>
        {profileAppId && (
          <HRCandidateProfile
            applicationId={profileAppId}
            onClose={() => setProfileAppId(null)}
            onStatusChanged={load}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

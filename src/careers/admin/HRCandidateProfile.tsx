import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, User, Phone, MapPin, Briefcase, Calendar, FileText,
  CreditCard, Clock, MessageSquare, CheckCircle, XCircle,
  AlertTriangle, ChevronRight, ExternalLink, Download,
  Send, Loader2, Shield, Archive, Trash2, RotateCcw, AlertCircle, ShieldAlert,
  GraduationCap, Award, Printer
} from 'lucide-react';
import { determineHighestQualificationIndex, type QualificationEntry } from '../portal/types';
import {
  getApplicationForHR, updateApplicationStatus, addApplicationNote,
  verifyDocument, rejectDocument, requestDocumentCorrection,
  fetchCandidateCRMTimeline, archiveApplication, restoreApplication,
  trashApplication, restoreTrashApplication, permanentlyDeleteApplication,
  permanentlyDeleteCandidate
} from '../lib/api';
import type { ApplicationStatus, RmsCandidateDocument } from '../lib/types';
import ApplicationStatusBadge from '../components/ApplicationStatusBadge';
import { APPLICATION_STATUS_CONFIG } from '../lib/constants';
import { useAuth } from '../../lib/auth/AuthContext';
import InterviewEvaluationModal from './components/InterviewEvaluationModal';
import FinalSelectionModal from './components/FinalSelectionModal';

// ─── Types ───────────────────────────────────────────────────────────────────
interface Props {
  applicationId: string;
  onClose: () => void;
  onStatusChanged?: () => void;
}

type Tab = 'profile' | 'documents' | 'payments' | 'timeline' | 'notes';

// ─── Timeline helpers ─────────────────────────────────────────────────────────
const TIMELINE_STEPS: { label: string; statuses: ApplicationStatus[] }[] = [
  { label: 'Application Submitted',  statuses: ['submitted'] },
  { label: 'Documents Verified',     statuses: ['documents_verified'] },
  { label: 'Interview Scheduled',    statuses: ['interview_scheduled'] },
  { label: 'Interview Completed',    statuses: ['interview_completed', 'under_review'] },
  { label: 'Selected',               statuses: ['selected'] },
  { label: 'Appointment Issued',     statuses: ['appointment_issued'] },
  { label: 'Joined',                 statuses: ['completed'] },
];

const DOC_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending:             { label: 'Pending',            color: 'text-amber-700',  bg: 'bg-amber-50' },
  uploaded:            { label: 'Uploaded',           color: 'text-blue-700',   bg: 'bg-blue-50' },
  verified:            { label: 'Verified',           color: 'text-green-700',  bg: 'bg-green-50' },
  rejected:            { label: 'Rejected',           color: 'text-red-700',    bg: 'bg-red-50' },
  correction_required: { label: 'Correction Needed',  color: 'text-orange-700', bg: 'bg-orange-50' },
};

// ─── HR Action Buttons ────────────────────────────────────────────────────────
const HR_ACTIONS: { status: ApplicationStatus; label: string; style: string }[] = [
  { status: 'documents_pending',   label: 'Request Documents', style: 'border-amber-300 text-amber-700 hover:bg-amber-50' },
  { status: 'interview_slot_pending', label: 'Assign Interview Slot', style: 'border-indigo-300 text-indigo-700 hover:bg-indigo-50' },
  { status: 'interview_scheduled', label: 'Mark Interviewed',   style: 'border-blue-300 text-blue-700 hover:bg-blue-50' },
  { status: 'under_review',        label: 'Under Review',       style: 'border-orange-300 text-orange-700 hover:bg-orange-50' },
  { status: 'selected',            label: 'Select Candidate',   style: 'border-emerald-300 text-emerald-700 hover:bg-emerald-50' },
  { status: 'wait_list',           label: 'Add to Wait List',   style: 'border-yellow-300 text-yellow-700 hover:bg-yellow-50' },
  { status: 'rejected',            label: 'Reject',             style: 'border-red-300 text-red-700 hover:bg-red-50' },
  { status: 'appointment_issued',  label: 'Issue Appointment',  style: 'border-purple-300 text-purple-700 hover:bg-purple-50' },
  { status: 'completed',           label: 'Mark Joined',        style: 'border-teal-300 text-teal-700 hover:bg-teal-50' },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function HRCandidateProfile({ applicationId, onClose, onStatusChanged }: Props) {
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

  const [data, setData] = useState<Awaited<ReturnType<typeof getApplicationForHR>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('profile');
  const [actionLoading, setActionLoading] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [rejectingDoc, setRejectingDoc] = useState<{ id: string; mode: 'reject' | 'correction' } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [docLoading, setDocLoading] = useState<string | null>(null);
  
  const [crmTimeline, setCrmTimeline] = useState<any[]>([]);

  // Confirm Archive / Trash / Restore / Delete / Purge Candidate modal
  const [confirmAction, setConfirmAction] = useState<'archive' | 'restore' | 'trash' | 'restore_trash' | 'delete' | 'purge_candidate' | null>(null);
  const [purgeConfirmationInput, setPurgeConfirmationInput] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  // Evaluation & Final Selection modals
  const [showEvalModal, setShowEvalModal] = useState(false);
  const [showSelectionModal, setShowSelectionModal] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    getApplicationForHR(applicationId).then(async (d) => {
      setData(d);
      if (d?.application?.candidate_id) {
        try {
          const res = await fetchCandidateCRMTimeline(d.application.candidate_id);
          setCrmTimeline(res.data ?? []);
        } catch (e) {
          console.error('Failed to load CRM timeline:', e);
        }
      }
      setLoading(false);
    });
  }, [applicationId]);

  useEffect(() => { load(); }, [load]);

  const handleExecuteArchiveTrash = async () => {
    if (!confirmAction) return;
    setActionLoading(true);
    setActionError(null);
    let err: string | null = null;
    try {
      if (confirmAction === 'archive') {
        const res = await archiveApplication(applicationId);
        err = res.error;
      } else if (confirmAction === 'restore') {
        const res = await restoreApplication(applicationId);
        err = res.error;
      } else if (confirmAction === 'trash') {
        const res = await trashApplication(applicationId);
        err = res.error;
      } else if (confirmAction === 'restore_trash') {
        const res = await restoreTrashApplication(applicationId);
        err = res.error;
      } else if (confirmAction === 'delete') {
        const res = await permanentlyDeleteApplication(applicationId);
        err = res.error;
        if (!err) {
          setActionLoading(false);
          onStatusChanged?.();
          onClose();
          return;
        }
      } else if (confirmAction === 'purge_candidate') {
        const candId = (data?.candidate as any)?.id || data?.application?.candidate_id;
        const candMobile = (data?.candidate as any)?.mobile || null;
        const res = await permanentlyDeleteCandidate(candId, candMobile, purgeConfirmationInput);
        err = res.error;
        if (!err) {
          setActionLoading(false);
          onStatusChanged?.();
          onClose();
          return;
        }
      }
    } catch (e: any) {
      err = e.message || 'Operation failed.';
    }
    setActionLoading(false);
    if (err) {
      setActionError(err);
    } else {
      setConfirmAction(null);
      load();
      onStatusChanged?.();
    }
  };

  const handleStatusChange = async (status: ApplicationStatus) => {
    if (!data?.application) return;
    setActionLoading(true);
    await updateApplicationStatus(applicationId, status);
    load();
    onStatusChanged?.();
    setActionLoading(false);
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    setSavingNote(true);
    await addApplicationNote(applicationId, noteText.trim(), null);
    setNoteText('');
    load();
    setSavingNote(false);
  };

  const handleVerifyDoc = async (doc: RmsCandidateDocument) => {
    setDocLoading(doc.id);
    await verifyDocument(doc.id, '');
    load();
    setDocLoading(null);
  };

  const handleRejectDoc = async () => {
    if (!rejectingDoc || !rejectReason.trim()) return;
    setDocLoading(rejectingDoc.id);
    if (rejectingDoc.mode === 'reject') {
      await rejectDocument(rejectingDoc.id, rejectReason.trim(), '');
    } else {
      await requestDocumentCorrection(rejectingDoc.id, rejectReason.trim());
    }
    setRejectingDoc(null);
    setRejectReason('');
    setDocLoading(null);
    load();
  };

  const app = data?.application;
  const rawCandidate = app?.candidate;
  const candidate = (Array.isArray(rawCandidate) ? rawCandidate[0] : rawCandidate) as Record<string, unknown> | undefined;
  const job = app?.job_posting;

  // Application Data & Multi-Qualification extraction
  const appData = (app as any)?.application_data || {};
  const jobSpecific = appData?.job_specific || appData?.submission_snapshot?.job_specific || {};
  const appQualifications: QualificationEntry[] = Array.isArray(jobSpecific?.qualifications) && jobSpecific.qualifications.length > 0
    ? jobSpecific.qualifications
    : [];
  const highestQualIndex = appQualifications.length > 0 ? determineHighestQualificationIndex(appQualifications) : -1;
  const candidateEducation = Array.isArray(candidate?.education) ? (candidate.education as Record<string, any>[]) : [];

  const preferredDistrictsList: any[] = Array.isArray(jobSpecific?.preferredDistricts) && jobSpecific.preferredDistricts.length > 0
    ? jobSpecific.preferredDistricts
    : Array.isArray(appData?.preferred_locations)
    ? appData.preferred_locations
    : [];
  const mobilityConsent = jobSpecific?.mobilityConsent || appData?.mobility_consent;

  // Determine timeline step
  const currentStepIndex = app
    ? TIMELINE_STEPS.findIndex(s => s.statuses.includes(app.status as ApplicationStatus))
    : -1;

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'profile',   label: 'Profile',    icon: User },
    { id: 'documents', label: 'Documents',  icon: FileText },
    { id: 'payments',  label: 'Payments',   icon: CreditCard },
    { id: 'timeline',  label: 'Timeline',   icon: Clock },
    { id: 'notes',     label: 'Notes',      icon: MessageSquare },
  ];

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />

      {/* Drawer */}
      <motion.div
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-white shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="flex items-start gap-3 p-5 border-b border-primary-100 bg-primary-50">
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="space-y-2">
                <div className="h-5 w-40 bg-primary-200 animate-pulse rounded" />
                <div className="h-4 w-24 bg-primary-200 animate-pulse rounded" />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-bold text-primary-900">
                    {String(candidate?.full_name ?? 'Candidate')}
                  </h2>
                  {app && <ApplicationStatusBadge status={app.status} size="sm" />}
                </div>
                <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-primary-500">
                  <span className="font-mono">{app?.application_number}</span>
                  {candidate?.mobile && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{String(candidate.mobile)}</span>}
                  {candidate?.district && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{String(candidate.district)}</span>}
                  {job && <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{job.title}</span>}
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!loading && (
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-primary-200 text-primary-700 hover:bg-primary-50 text-xs font-semibold rounded-xl transition-all"
                title="Print Candidate Application / Save as PDF"
              >
                <Printer className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Print / PDF</span>
              </button>
            )}
            {isSuperAdmin && !loading && candidate && (
              <button
                type="button"
                onClick={() => {
                  setActionError(null);
                  setPurgeConfirmationInput('');
                  setConfirmAction('purge_candidate');
                }}
                className="flex items-center gap-1.5 font-bold px-3 py-1.5 bg-red-700 hover:bg-red-800 text-white text-xs rounded-xl shadow-xs transition-all"
                title="Super Admin: Permanently delete this candidate's entire data and auth account"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Purge Candidate</span>
              </button>
            )}
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-primary-100 text-primary-400 hover:text-primary-700 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Archived Banner */}
        {!loading && app?.is_archived && !app?.is_trashed && (
          <div className="bg-amber-50 border-b border-amber-200 px-5 py-3 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-amber-900 font-medium">
              <Archive className="w-4 h-4 text-amber-600 shrink-0" />
              <span>This application is <strong>Archived</strong>. All candidate details, payments, and history are preserved.</span>
            </div>
            {isAdmin && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => { setActionError(null); setConfirmAction('restore'); }}
                  className="flex items-center gap-1 font-bold px-2.5 py-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" /> Restore to Active
                </button>
                <button
                  type="button"
                  onClick={() => { setActionError(null); setConfirmAction('trash'); }}
                  className="flex items-center gap-1 font-medium px-2.5 py-1 border border-slate-300 text-slate-700 bg-white rounded-lg hover:bg-red-50 hover:text-red-700 transition-colors"
                >
                  <Trash2 className="w-3 h-3" /> Move to Trash
                </button>
              </div>
            )}
          </div>
        )}

        {/* Trashed Banner */}
        {!loading && app?.is_trashed && (
          <div className="bg-red-50 border-b border-red-200 px-5 py-3 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-red-900 font-medium">
              <Trash2 className="w-4 h-4 text-red-600 shrink-0" />
              <span>This application is currently in the <strong>Trash</strong>.</span>
            </div>
            {isAdmin && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => { setActionError(null); setConfirmAction('restore_trash'); }}
                  className="flex items-center gap-1 font-bold px-2.5 py-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" /> Restore
                </button>
                {isSuperAdmin && (
                  <>
                    <button
                      type="button"
                      onClick={() => { setActionError(null); setConfirmAction('delete'); }}
                      className="flex items-center gap-1 font-bold px-2.5 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      title="Permanently delete this application"
                    >
                      <Trash2 className="w-3 h-3" /> Delete App
                    </button>
                    <button
                      type="button"
                      onClick={() => { setActionError(null); setPurgeConfirmationInput(''); setConfirmAction('purge_candidate'); }}
                      className="flex items-center gap-1 font-bold px-2.5 py-1 bg-red-800 text-white rounded-lg hover:bg-red-900 transition-colors"
                      title="Permanently purge candidate profile and auth account"
                    >
                      <ShieldAlert className="w-3 h-3" /> Purge Candidate
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* HR Quick Actions */}
        {!loading && app && (
          <div className="px-5 py-3 border-b border-primary-100 bg-white flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-primary-500 mr-1">Actions:</span>
              <button
                type="button"
                onClick={() => setShowEvalModal(true)}
                className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full border border-indigo-300 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-all shadow-sm"
              >
                <Award className="w-3.5 h-3.5" /> Evaluate (100 Marks)
              </button>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setShowSelectionModal(true)}
                  className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full border border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 transition-all shadow-sm"
                >
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Final Selection Decision
                </button>
              )}
              {HR_ACTIONS.filter(a => a.status !== app.status).slice(0, 4).map(action => (
                <button key={action.status}
                  disabled={actionLoading}
                  onClick={() => handleStatusChange(action.status)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all disabled:opacity-60 ${action.style}`}>
                  {actionLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : action.label}
                </button>
              ))}
            </div>

            {/* Archive / Trash quick triggers when application is active */}
            {!app.is_archived && !app.is_trashed && isAdmin && (
              <div className="flex items-center gap-1.5 pl-2 border-l border-primary-200">
                <button
                  type="button"
                  onClick={() => { setActionError(null); setConfirmAction('archive'); }}
                  title="Archive Application"
                  className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-full border border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100 transition-all"
                >
                  <Archive className="w-3 h-3" /> Archive
                </button>
                <button
                  type="button"
                  onClick={() => { setActionError(null); setConfirmAction('trash'); }}
                  title="Move to Trash"
                  className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-full border border-slate-300 text-slate-700 bg-slate-50 hover:bg-red-50 hover:text-red-700 hover:border-red-300 transition-all"
                >
                  <Trash2 className="w-3 h-3" /> Trash
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-primary-100 bg-white px-3">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 transition-all -mb-px ${
                tab === t.id ? 'border-primary-900 text-primary-900' : 'border-transparent text-primary-500 hover:text-primary-700'
              }`}>
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
              {t.id === 'documents' && (data?.documents?.length ?? 0) > 0 && (
                <span className="ml-0.5 text-[10px] bg-primary-900 text-white rounded-full w-4 h-4 flex items-center justify-center">
                  {data!.documents.length}
                </span>
              )}
              {t.id === 'notes' && (data?.notes?.length ?? 0) > 0 && (
                <span className="ml-0.5 text-[10px] bg-primary-900 text-white rounded-full w-4 h-4 flex items-center justify-center">
                  {data!.notes.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="space-y-4">
              {[1,2,3].map(i => <div key={i} className="h-16 bg-primary-50 animate-pulse rounded-xl" />)}
            </div>
          ) : (
            <>
              {/* Profile Tab */}
              {tab === 'profile' && candidate && (
                <div className="space-y-5">
                  <Section title="Personal Information">
                    <Grid2>
                      <Field label="Full Name" value={String(candidate.full_name ?? '—')} />
                      <Field label="Candidate ID" value={String(candidate.candidate_id ?? '—')} mono />
                      <Field label="Mobile" value={String(candidate.mobile ?? '—')} />
                      <Field label="Date of Birth" value={candidate.date_of_birth ? new Date(String(candidate.date_of_birth)).toLocaleDateString('en-IN') : '—'} />
                      <Field label="Gender" value={String(candidate.gender ?? '—')} />
                      <Field label="Father's Name" value={String(candidate.father_name ?? '—')} />
                    </Grid2>
                  </Section>

                  <Section title="Address">
                    <Grid2>
                      <Field label="District" value={String(candidate.district ?? '—')} />
                      <Field label="Taluka" value={String(candidate.taluka ?? '—')} />
                      <Field label="City" value={String(candidate.city ?? '—')} />
                      <Field label="Pincode" value={String(candidate.pincode ?? '—')} />
                    </Grid2>
                    {candidate.address_line1 && (
                      <p className="mt-2 text-sm text-primary-700">{String(candidate.address_line1)}{candidate.address_line2 ? `, ${String(candidate.address_line2)}` : ''}</p>
                    )}
                  </Section>

                  <Section title="Application Details">
                    <Grid2>
                      <Field label="Job Role" value={job?.title ?? '—'} />
                      <Field label="Preferred District" value={app?.preferred_district ?? '—'} />
                      <Field label="Submitted" value={app?.submitted_at ? new Date(app.submitted_at).toLocaleDateString('en-IN') : '—'} />
                      <Field label="Current Status" value={APPLICATION_STATUS_CONFIG[app!.status]?.label ?? app!.status} />
                    </Grid2>
                  </Section>

                  {/* Preferred Posting Locations & Mobility Consent Section */}
                  {preferredDistrictsList.length > 0 && (
                    <Section title={`Preferred Posting Locations (${preferredDistrictsList.length})`}>
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          {preferredDistrictsList.map((p: any, idx: number) => {
                            const isCandidateDist = candidate?.district && p.district &&
                              String(candidate.district).trim().toLowerCase() === String(p.district).trim().toLowerCase();
                            return (
                              <div
                                key={p.id || idx}
                                className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                                  p.priority === 1
                                    ? 'border-emerald-300 bg-emerald-50/30'
                                    : 'border-primary-100 bg-primary-50/30'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-primary-900 text-xs">
                                    Priority {p.priority || idx + 1}
                                  </span>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    isCandidateDist
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-blue-100 text-blue-800'
                                  }`}>
                                    {isCandidateDist ? 'Residential' : 'Outside'}
                                  </span>
                                </div>
                                <p className="font-semibold text-primary-900">District: {p.district}</p>
                                {Array.isArray(p.talukas) && p.talukas.length > 0 && p.talukas[0] && (
                                  <p className="text-primary-700 text-[11px]">
                                    Talukas: <span className="font-semibold">{p.talukas.filter(Boolean).join(', ')}</span>
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {mobilityConsent?.consented && (
                          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center justify-between flex-wrap gap-2">
                            <span>
                              <strong>Mobility Consent Verified:</strong> Candidate consented to work in outside districts ({mobilityConsent.outsideDistricts?.join(', ') || 'selected districts'}).
                            </span>
                            {mobilityConsent.consentedAt && (
                              <span className="font-mono text-[11px] text-emerald-800">
                                Consented: {new Date(mobilityConsent.consentedAt).toLocaleDateString('en-IN')}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </Section>
                  )}

                  {/* Educational Qualifications Section — Displays ALL records with Highest Qualification highlighted */}
                  <Section title={`Educational Qualifications (${appQualifications.length > 0 ? appQualifications.length : (jobSpecific?.highestQualification ? 1 : candidateEducation.length)})`}>
                    {appQualifications.length > 0 ? (
                      <div className="space-y-3">
                        {appQualifications.map((qual, idx) => {
                          const isHighest = idx === highestQualIndex || Boolean(qual.isPrimary);
                          let courseTitle = qual.course || '';
                          if (qual.level === 'Other Equivalent Education') {
                            courseTitle = qual.customQualification || 'Other Equivalent Education';
                          } else if (qual.course === 'Other') {
                            courseTitle = qual.customCourse ? `${qual.level} - ${qual.customCourse}` : 'Other';
                          } else if (qual.level === 'SSC') {
                            courseTitle = qual.course || 'Standard Board Curriculum';
                          }

                          const marksFormatted = qual.marksValue
                            ? qual.gradingFormat === 'cgpa'
                              ? `${qual.marksValue} / 10.0 CGPA`
                              : `${qual.marksValue}%`
                            : '—';

                          return (
                            <div
                              key={qual.id || idx}
                              className={`p-3.5 rounded-xl border transition-all ${
                                isHighest
                                  ? 'border-emerald-300 bg-emerald-50/40 shadow-xs ring-1 ring-emerald-400/30'
                                  : 'border-primary-100 bg-primary-50/40'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                                <div className="flex items-center gap-2">
                                  <GraduationCap className={`w-4 h-4 ${isHighest ? 'text-emerald-700' : 'text-primary-700'}`} />
                                  <span className="font-bold text-primary-900 text-sm">
                                    {qual.level || `Qualification #${idx + 1}`}
                                  </span>
                                </div>
                                {isHighest && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-600 text-white shadow-2xs">
                                    <Award className="w-3.5 h-3.5 text-amber-300" />
                                    Highest Qualification
                                  </span>
                                )}
                              </div>

                              <div className="text-xs text-primary-800 font-medium mb-2">
                                <span className="text-primary-500">Course / Stream / Degree:</span>{' '}
                                <strong className="text-primary-900">{courseTitle || '—'}</strong>
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs pt-2 border-t border-primary-100/60">
                                <div>
                                  <span className="text-primary-500 block">Passing Year</span>
                                  <span className="font-semibold text-primary-900">{qual.passingYear || '—'}</span>
                                </div>
                                <div>
                                  <span className="text-primary-500 block">Grading & Score</span>
                                  <span className="font-semibold text-primary-900">{marksFormatted}</span>
                                </div>
                                <div>
                                  <span className="text-primary-500 block">Evaluation Status</span>
                                  <span className={`font-semibold ${isHighest ? 'text-emerald-700' : 'text-slate-600'}`}>
                                    {isHighest ? 'Highest Credential' : 'Verified Qualification'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : jobSpecific?.highestQualification ? (
                      /* Backward compatibility for legacy applications with scalar qualification */
                      <div className="p-3.5 rounded-xl border border-emerald-300 bg-emerald-50/40 text-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <GraduationCap className="w-4 h-4 text-emerald-700" />
                            <span className="font-bold text-primary-900 text-sm">
                              {jobSpecific.highestQualification}
                            </span>
                          </div>
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-600 text-white shadow-2xs">
                            <Award className="w-3.5 h-3.5 text-amber-300" />
                            Highest Qualification
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-emerald-200">
                          <div>
                            <span className="text-primary-500 block">Passing Year</span>
                            <span className="font-semibold text-primary-900">{jobSpecific.passingYear || '—'}</span>
                          </div>
                          <div>
                            <span className="text-primary-500 block">Percentage / Marks</span>
                            <span className="font-semibold text-primary-900">
                              {jobSpecific.marksPercentage ? `${jobSpecific.marksPercentage}%` : '—'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : candidateEducation.length > 0 ? (
                      /* Fallback for candidate profile table education entries */
                      <div className="space-y-3">
                        {candidateEducation.map((edu, i) => (
                          <div key={i} className="bg-primary-50 rounded-lg p-3 text-sm">
                            <div className="font-semibold text-primary-900">{edu.degree || edu.level}</div>
                            <div className="text-primary-600">
                              {edu.institution || edu.course} — {edu.year || edu.passingYear} — {edu.percentage || edu.marks}%
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-primary-400 italic">No education records submitted.</p>
                    )}
                  </Section>

                  {/* Work Experience Section */}
                  {Array.isArray(jobSpecific?.experiences) && jobSpecific.experiences.length > 0 && (
                    <Section title={`Work Experience (${jobSpecific.experienceYears || '0'}Y ${jobSpecific.experienceMonths || '0'}M ${jobSpecific.experienceDays ? `${jobSpecific.experienceDays}D` : ''})`}>
                      <div className="space-y-2.5 text-xs">
                        {jobSpecific.experiences.map((exp: any, i: number) => (
                          <div key={exp.id || i} className="p-3 bg-white border border-primary-100 rounded-lg">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-primary-900">{exp.employer || 'Employer'}</span>
                              {exp.isCurrent && (
                                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
                                  Currently Working
                                </span>
                              )}
                            </div>
                            {exp.designation && <p className="text-primary-700 font-medium mb-1">Role: {exp.designation}</p>}
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-primary-500 text-[11px] pt-1 border-t border-primary-100/60 mt-1">
                              <div>Duration: <strong className="text-primary-800">{exp.years}Y {exp.months}M {exp.days ? `${exp.days}D` : ''}</strong></div>
                              <div>Dates: <strong className="text-primary-800">{exp.startDate || '—'} to {exp.isCurrent ? 'Present' : exp.endDate || '—'}</strong></div>
                              <div>Certificate: <strong className="text-primary-800">{exp.hasCertificate === 'yes' ? 'Available' : 'No'}</strong></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Section>
                  )}

                  {Array.isArray(candidate.skills) && (candidate.skills as unknown[]).length > 0 && (
                    <Section title="Skills">
                      <div className="flex flex-wrap gap-2">
                        {(candidate.skills as string[]).map(s => (
                          <span key={s} className="text-xs bg-primary-100 text-primary-700 font-semibold px-3 py-1 rounded-full">{s}</span>
                        ))}
                      </div>
                    </Section>
                  )}
                </div>
              )}

              {/* Documents Tab */}
              {tab === 'documents' && (
                <div className="space-y-3">
                  {data!.documents.length === 0 ? (
                    <EmptyState icon={FileText} message="No documents uploaded yet." />
                  ) : (
                    data!.documents.map(doc => {
                      const cfg = DOC_STATUS_CONFIG[doc.status] ?? DOC_STATUS_CONFIG.pending;
                      return (
                        <div key={doc.id} className="bg-white border border-primary-100 rounded-xl p-4">
                          <div className="flex items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className="font-semibold text-primary-900 text-sm capitalize">{doc.document_label ?? doc.document_type.replace(/_/g, ' ')}</span>
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${cfg.color} ${cfg.bg}`}>{cfg.label}</span>
                              </div>
                              {doc.file_name && <p className="text-xs text-primary-500 truncate">{doc.file_name}</p>}
                              {doc.rejection_reason && (
                                <p className="mt-1 text-xs text-red-600 bg-red-50 rounded px-2 py-1">{doc.rejection_reason}</p>
                              )}
                              {doc.verified_at && (
                                <p className="mt-1 text-xs text-primary-400">Reviewed: {new Date(doc.verified_at).toLocaleDateString('en-IN')}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {doc.storage_path && (
                                <a href={doc.storage_path} target="_blank" rel="noreferrer"
                                  className="p-1.5 rounded-lg bg-primary-50 hover:bg-primary-100 text-primary-600 transition-colors">
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                              )}
                              {doc.status === 'uploaded' && (
                                <>
                                  <button disabled={docLoading === doc.id}
                                    onClick={() => handleVerifyDoc(doc)}
                                    className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full border border-emerald-300 text-emerald-700 hover:bg-emerald-50 transition-all disabled:opacity-60">
                                    {docLoading === doc.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                                    Verify
                                  </button>
                                  <button disabled={!!docLoading}
                                    onClick={() => setRejectingDoc({ id: doc.id, mode: 'correction' })}
                                    className="text-xs font-semibold px-3 py-1.5 rounded-full border border-amber-300 text-amber-700 hover:bg-amber-50 transition-all disabled:opacity-60">
                                    Correction
                                  </button>
                                  <button disabled={!!docLoading}
                                    onClick={() => setRejectingDoc({ id: doc.id, mode: 'reject' })}
                                    className="text-xs font-semibold px-3 py-1.5 rounded-full border border-red-300 text-red-700 hover:bg-red-50 transition-all disabled:opacity-60">
                                    Reject
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}

                  {/* Reject/Correction reason modal */}
                  {rejectingDoc && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                      <p className="text-sm font-bold text-amber-800">
                        {rejectingDoc.mode === 'reject' ? 'Rejection Reason' : 'Correction Required — Reason'}
                      </p>
                      <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3}
                        placeholder="Describe the issue..."
                        className="w-full text-sm border border-amber-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white resize-none" />
                      <div className="flex gap-2">
                        <button onClick={handleRejectDoc} disabled={!rejectReason.trim() || !!docLoading}
                          className="flex-1 text-sm font-semibold py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-60 transition-colors">
                          Confirm
                        </button>
                        <button onClick={() => { setRejectingDoc(null); setRejectReason(''); }}
                          className="px-4 text-sm font-semibold py-2 rounded-lg bg-white border border-amber-200 text-amber-700 hover:bg-amber-50 transition-colors">
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Payments Tab */}
              {tab === 'payments' && (
                <div className="space-y-3">
                  {data!.payments.length === 0 ? (
                    <EmptyState icon={CreditCard} message="No payment records." />
                  ) : (
                    data!.payments.map(payment => (
                      <div key={payment.id} className="bg-white border border-primary-100 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-bold text-primary-900 capitalize">
                            {payment.payment_type.replace(/_/g, ' ')}
                          </span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                            payment.status === 'success' ? 'text-green-700 bg-green-50 border-green-200' :
                            payment.status === 'pending' ? 'text-amber-700 bg-amber-50 border-amber-200' :
                            payment.status === 'failed' ? 'text-red-700 bg-red-50 border-red-200' :
                            'text-neutral-600 bg-neutral-50 border-neutral-200'
                          }`}>{payment.status}</span>
                        </div>
                        <Grid2>
                          <Field label="Amount" value={`₹${Number(payment.amount).toLocaleString('en-IN')}`} />
                          <Field label="Gateway" value={payment.gateway ?? '—'} />
                          {payment.gateway_payment_id && <Field label="Payment ID" value={payment.gateway_payment_id} mono />}
                          {payment.completed_at && <Field label="Paid On" value={new Date(payment.completed_at).toLocaleDateString('en-IN')} />}
                        </Grid2>
                        {(payment as { receipt?: { receipt_number: string } }).receipt && (
                          <p className="mt-2 text-xs text-primary-500 font-mono">
                            Receipt: {(payment as { receipt?: { receipt_number: string } }).receipt!.receipt_number}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Timeline Tab */}
              {tab === 'timeline' && (
                <div className="space-y-6">
                  {/* Visual pipeline */}
                  <div>
                    <h3 className="text-xs font-bold text-primary-500 uppercase tracking-wider mb-4">Recruitment Journey</h3>
                    <div className="space-y-2">
                      {TIMELINE_STEPS.map((step, i) => {
                        const isDone = currentStepIndex >= i;
                        const isCurrent = currentStepIndex === i;
                        return (
                          <div key={step.label} className="flex items-center gap-3">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all ${
                              isDone ? 'bg-primary-900' : 'bg-primary-100'
                            }`}>
                              {isDone ? <CheckCircle className="w-3.5 h-3.5 text-white" /> : <div className="w-2 h-2 rounded-full bg-primary-300" />}
                            </div>
                            {i < TIMELINE_STEPS.length - 1 && (
                              <div className="absolute ml-3 mt-6 h-3 w-px bg-primary-200" />
                            )}
                            <span className={`text-sm font-semibold ${isDone ? 'text-primary-900' : 'text-primary-400'} ${isCurrent ? 'text-emerald-700' : ''}`}>
                              {step.label}
                              {isCurrent && <span className="ml-2 text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Current</span>}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Status change log */}
                  <div>
                    <h3 className="text-xs font-bold text-primary-500 uppercase tracking-wider mb-3">Status Change History</h3>
                    {data!.statusLog.length === 0 ? (
                      <EmptyState icon={Clock} message="No status changes recorded." />
                    ) : (
                      <div className="space-y-2">
                        {data!.statusLog.map(log => (
                          <div key={log.id} className="flex items-start gap-3 p-3 bg-primary-50 rounded-xl">
                            <div className="w-2 h-2 rounded-full bg-primary-400 mt-1.5 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                {log.from_status && (
                                  <>
                                    <ApplicationStatusBadge status={log.from_status as ApplicationStatus} size="sm" />
                                    <ChevronRight className="w-3 h-3 text-primary-400" />
                                  </>
                                )}
                                <ApplicationStatusBadge status={log.to_status as ApplicationStatus} size="sm" />
                              </div>
                              {log.notes && <p className="mt-1 text-xs text-primary-600">{log.notes}</p>}
                              <p className="mt-1 text-xs text-primary-400">{new Date(log.changed_at).toLocaleString('en-IN')}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* CRM Activity Timeline */}
                  <div className="pt-4 border-t border-primary-100">
                    <h3 className="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Clock className="w-4 h-4" /> CRM Activity & Communication (Read-only)
                    </h3>
                    {crmTimeline.length === 0 ? (
                      <EmptyState icon={MessageSquare} message="No CRM activity recorded." />
                    ) : (
                      <div className="space-y-2">
                        {crmTimeline.map((log: any) => (
                          <div key={log.id} className="flex items-start gap-3 p-3 bg-indigo-50/50 border border-indigo-100/50 rounded-xl">
                            <div className="w-2 h-2 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className="font-semibold text-indigo-900 text-sm">{log.activity_type}</span>
                              </div>
                              {log.description && <p className="text-xs text-indigo-800 leading-snug">{log.description}</p>}
                              <div className="flex items-center gap-2 mt-2">
                                <p className="text-[10px] text-indigo-400 font-medium">{new Date(log.created_at).toLocaleString('en-IN')}</p>
                                <span className="text-[10px] text-indigo-400 bg-indigo-100 px-1.5 py-0.5 rounded-sm">
                                  By {log.actor?.full_name || log.actor_type}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Notes Tab */}
              {tab === 'notes' && (
                <div className="space-y-4">
                  {/* Add note */}
                  <div className="bg-primary-50 rounded-xl p-4 space-y-3">
                    <p className="text-xs font-bold text-primary-700">Add HR Remark</p>
                    <textarea value={noteText} onChange={e => setNoteText(e.target.value)} rows={3}
                      placeholder="Type a note or remark for this candidate..."
                      className="w-full text-sm border border-primary-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white resize-none" />
                    <button onClick={handleAddNote} disabled={!noteText.trim() || savingNote}
                      className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg bg-primary-900 text-white hover:bg-primary-800 disabled:opacity-60 transition-colors">
                      {savingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      Save Note
                    </button>
                  </div>

                  {/* Existing notes */}
                  {data!.notes.length === 0 ? (
                    <EmptyState icon={MessageSquare} message="No HR notes yet." />
                  ) : (
                    <div className="space-y-3">
                      {data!.notes.map(note => (
                        <div key={note.id} className="bg-white border border-primary-100 rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Shield className="w-3.5 h-3.5 text-primary-400" />
                            <span className="text-xs font-semibold text-primary-500">HR Note</span>
                            <span className="ml-auto text-xs text-primary-400">{new Date(note.created_at).toLocaleString('en-IN')}</span>
                          </div>
                          <p className="text-sm text-primary-800 whitespace-pre-wrap">{note.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Confirmation Modal */}
        <AnimatePresence>
          {confirmAction && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-primary-100 space-y-4 text-left"
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-xl shrink-0 ${
                    confirmAction === 'delete'
                      ? 'bg-red-100 text-red-600'
                      : confirmAction === 'archive'
                      ? 'bg-amber-100 text-amber-700'
                      : confirmAction === 'trash'
                      ? 'bg-orange-100 text-orange-700'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {confirmAction === 'delete' ? (
                      <ShieldAlert className="w-6 h-6" />
                    ) : confirmAction === 'archive' ? (
                      <Archive className="w-6 h-6" />
                    ) : confirmAction === 'trash' ? (
                      <Trash2 className="w-6 h-6" />
                    ) : (
                      <RotateCcw className="w-6 h-6" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-primary-900">
                      {confirmAction === 'purge_candidate' && 'Super Admin: Permanent Candidate Purge'}
                      {confirmAction === 'archive' && 'Archive Application'}
                      {confirmAction === 'restore' && 'Restore Application'}
                      {confirmAction === 'trash' && 'Move to Trash'}
                      {confirmAction === 'restore_trash' && 'Restore from Trash'}
                      {confirmAction === 'delete' && 'Permanently Delete Application'}
                    </h3>
                    <p className="text-xs text-primary-500 font-mono mt-0.5">
                      {app?.application_number} · {String(candidate?.full_name ?? 'Candidate')}
                    </p>
                  </div>

                  <button
                    onClick={() => { if (!actionLoading) setConfirmAction(null); }}
                    className="p-1 rounded-lg hover:bg-primary-50 text-primary-400 hover:text-primary-700"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="text-sm text-primary-700 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-primary-100">
                  {confirmAction === 'archive' && (
                    <p>
                      Archiving removes this application from the active HR queue while safely preserving all applicant details, uploaded documents, fee payments, and interview records. You can restore it anytime.
                    </p>
                  )}
                  {confirmAction === 'restore' && (
                    <p>
                      This application will be restored to the active recruitment list with its status preserved.
                    </p>
                  )}
                  {confirmAction === 'trash' && (
                    <p>
                      This application will be moved to the Trash. You can restore it later if needed.
                    </p>
                  )}
                  {confirmAction === 'restore_trash' && (
                    <p>
                      This application will be restored from Trash to the active queue.
                    </p>
                  )}
                  {confirmAction === 'delete' && (
                    <div className="space-y-1.5">
                      <p className="text-red-700 font-semibold flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        Warning: Permanent deletion cannot be undone.
                      </p>
                      <p className="text-xs text-slate-600">
                        Restricted to Super Admin role. Applications with payments, appointment letters, interview bookings, evaluations, notes, candidate documents, or training allocations cannot be permanently deleted and must remain archived or trashed.
                      </p>
                    </div>
                  )}
                  {confirmAction === 'purge_candidate' && (
                    <div className="space-y-3">
                      <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-2">
                        <p className="text-red-900 font-bold text-xs flex items-center gap-1.5">
                          <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
                          SUPER ADMIN ACTION: Full Candidate Permanent Purge
                        </p>
                        <p className="text-xs text-red-700 leading-relaxed">
                          This will completely and irreversibly erase this candidate from the platform:
                        </p>
                        <ul className="text-[11px] text-red-800 space-y-1 list-disc pl-4">
                          <li>Candidate Profile & Demographics</li>
                          <li>All Job Applications, Status Logs, and Workflow States</li>
                          <li>Uploaded Documents & Cloud Storage binary files</li>
                          <li>Interview Bookings (releasing slot capacity back to quota)</li>
                          <li>CRM Lead records, call history, and communication logs</li>
                          <li>WhatsApp OTPs, delivery logs, and 24h rate-limit counters</li>
                          <li>Supabase Auth user account (allowing fresh sign-up)</li>
                        </ul>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Type <span className="font-mono text-red-700 bg-red-50 px-1 py-0.5 rounded border border-red-200">PERMANENTLY DELETE</span> to confirm:
                        </label>
                        <input
                          type="text"
                          value={purgeConfirmationInput}
                          onChange={e => setPurgeConfirmationInput(e.target.value)}
                          placeholder="PERMANENTLY DELETE"
                          className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-xl focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {actionError && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <span>{actionError}</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => setConfirmAction(null)}
                    className="px-4 py-2 border border-primary-200 text-primary-700 font-semibold rounded-xl hover:bg-primary-50 text-xs transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    disabled={actionLoading || (confirmAction === 'purge_candidate' && purgeConfirmationInput !== 'PERMANENTLY DELETE')}
                    onClick={handleExecuteArchiveTrash}
                    className={`flex items-center gap-1.5 px-4 py-2 font-bold rounded-xl text-xs text-white shadow-sm transition-all disabled:opacity-60 ${
                      confirmAction === 'purge_candidate'
                        ? 'bg-red-800 hover:bg-red-900'
                        : confirmAction === 'delete'
                        ? 'bg-red-600 hover:bg-red-700'
                        : confirmAction === 'archive'
                        ? 'bg-amber-600 hover:bg-amber-700'
                        : confirmAction === 'trash'
                        ? 'bg-orange-600 hover:bg-orange-700'
                        : 'bg-emerald-600 hover:bg-emerald-700'
                    }`}
                  >
                    {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    {confirmAction === 'archive' && (actionLoading ? 'Archiving...' : 'Confirm Archive')}
                    {confirmAction === 'restore' && (actionLoading ? 'Restoring...' : 'Confirm Restore')}
                    {confirmAction === 'trash' && (actionLoading ? 'Moving to Trash...' : 'Move to Trash')}
                    {confirmAction === 'restore_trash' && (actionLoading ? 'Restoring...' : 'Restore Application')}
                    {confirmAction === 'delete' && (actionLoading ? 'Deleting...' : 'Permanently Delete')}
                    {confirmAction === 'purge_candidate' && (actionLoading ? 'Purging Candidate...' : 'Purge Complete Candidate Data')}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* 100-Mark Interview Evaluation Modal */}
        {app && (
          <InterviewEvaluationModal
            isOpen={showEvalModal}
            applicationId={app.id}
            candidateName={app.candidate?.full_name || 'Candidate'}
            jobTitle={app.job_posting?.title || 'Job Position'}
            onClose={() => setShowEvalModal(false)}
            onSubmitted={() => {
              load();
              if (onStatusChanged) onStatusChanged();
            }}
          />
        )}

        {/* Final Selection Decision Modal */}
        {app && (
          <FinalSelectionModal
            isOpen={showSelectionModal}
            applicationId={app.id}
            candidateName={app.candidate?.full_name || 'Candidate'}
            jobTitle={app.job_posting?.title || 'Job Position'}
            onClose={() => setShowSelectionModal(false)}
            onDecisionRecorded={() => {
              load();
              if (onStatusChanged) onStatusChanged();
            }}
          />
        )}
      </motion.div>
    </>
  );
}

// ─── Small helpers ────────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-bold text-primary-500 uppercase tracking-wider mb-3">{title}</h3>
      <div className="bg-white border border-primary-100 rounded-xl p-4">{children}</div>
    </div>
  );
}

function Grid2({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>;
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs text-primary-400 mb-0.5">{label}</p>
      <p className={`text-sm font-semibold text-primary-900 truncate ${mono ? 'font-mono' : ''}`}>{value || '—'}</p>
    </div>
  );
}

function EmptyState({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <div className="text-center py-12">
      <Icon className="w-10 h-10 text-primary-200 mx-auto mb-3" />
      <p className="text-sm text-primary-500 font-medium">{message}</p>
    </div>
  );
}

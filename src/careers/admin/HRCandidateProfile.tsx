import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, User, Phone, MapPin, Briefcase, Calendar, FileText,
  CreditCard, Clock, MessageSquare, CheckCircle, XCircle,
  AlertTriangle, ChevronRight, ExternalLink, Download,
  Send, Loader2, Shield,
} from 'lucide-react';
import {
  getApplicationForHR, updateApplicationStatus, addApplicationNote,
  verifyDocument, rejectDocument, requestDocumentCorrection,
  fetchCandidateCRMTimeline
} from '../lib/api';
import type { ApplicationStatus, RmsCandidateDocument } from '../lib/types';
import ApplicationStatusBadge from '../components/ApplicationStatusBadge';
import { APPLICATION_STATUS_CONFIG } from '../lib/constants';

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
  const candidate = app?.candidate as Record<string, unknown> | undefined;
  const job = app?.job_posting;

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
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-primary-100 text-primary-400 hover:text-primary-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* HR Quick Actions */}
        {!loading && app && (
          <div className="px-5 py-3 border-b border-primary-100 bg-white">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-primary-500 mr-1">Actions:</span>
              {HR_ACTIONS.filter(a => a.status !== app.status).slice(0, 5).map(action => (
                <button key={action.status}
                  disabled={actionLoading}
                  onClick={() => handleStatusChange(action.status)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all disabled:opacity-60 ${action.style}`}>
                  {actionLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : action.label}
                </button>
              ))}
            </div>
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

                  {Array.isArray(candidate.education) && (candidate.education as unknown[]).length > 0 && (
                    <Section title="Education">
                      <div className="space-y-3">
                        {(candidate.education as Record<string, string>[]).map((edu, i) => (
                          <div key={i} className="bg-primary-50 rounded-lg p-3 text-sm">
                            <div className="font-semibold text-primary-900">{edu.degree}</div>
                            <div className="text-primary-600">{edu.institution} — {edu.year} — {edu.percentage}%</div>
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

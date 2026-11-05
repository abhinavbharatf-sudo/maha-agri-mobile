import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, ArrowRight, Search, Building2, MapPin, Calendar, CreditCard,
  CheckCircle2, Clock, AlertCircle, Sparkles, ExternalLink, RefreshCw
} from 'lucide-react';
import { useCandidateAuth } from '../lib/CandidateAuthContext';
import { getMyApplications } from '../lib/api';
import type { RmsApplicationWithDetails, ApplicationStatus } from '../lib/types';
import ApplicationStatusBadge from '../components/ApplicationStatusBadge';
import { APPLICATION_STATUS_CONFIG } from '../lib/constants';

interface StatusFilterOption {
  value: ApplicationStatus | 'all';
  label: string;
}

const STATUS_FILTERS: StatusFilterOption[] = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Drafts' },
  { value: 'payment_pending', label: 'Payment Pending' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'interview_scheduled', label: 'Interview' },
  { value: 'selected', label: 'Selected' },
  { value: 'completed', label: 'Joined' },
  { value: 'rejected', label: 'Not Selected' },
];

export default function MyApplications() {
  const { profile, verifiedMobile, user, refreshProfile } = useCandidateAuth();
  const [apps, setApps] = useState<RmsApplicationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 'all'>('all');
  const [flashMessage, setFlashMessage] = useState<string | null>(null);

  // Check for any flash message set during Save & Exit
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const msg = sessionStorage.getItem('maha_flash_message');
        if (msg) {
          setFlashMessage(msg);
          sessionStorage.removeItem('maha_flash_message');
          const timer = setTimeout(() => setFlashMessage(null), 8000);
          return () => clearTimeout(timer);
        }
      } catch {}
    }
  }, []);

  const loadApplications = useCallback(async () => {
    setLoading(true);

    const activeMobile = (verifiedMobile || user?.phone || '').replace(/\D/g, '').slice(-10);
    let targetProfileId = profile?.id;

    // If profile is not yet in context, try refreshing from auth
    if (!targetProfileId && (activeMobile || user?.id)) {
      try {
        await refreshProfile(activeMobile || undefined);
      } catch {}
    }

    const effectiveCandidateId = targetProfileId || user?.id || (activeMobile ? `dummy-${activeMobile}` : null);
    let fetchedApps: RmsApplicationWithDetails[] = [];

    if (effectiveCandidateId) {
      try {
        const res = await getMyApplications(effectiveCandidateId);
        if (Array.isArray(res.data)) {
          fetchedApps = res.data;
        }
      } catch (err) {
        console.warn('[MyApplications] Remote fetch error, falling back to local store:', err);
      }
    }

    // ── Local / Session Storage Drafts Fallback & Merge ───────────────────────
    // Ensures drafts saved via Save & Exit are reliably displayed
    if (typeof window !== 'undefined') {
      try {
        const localDrafts: RmsApplicationWithDetails[] = [];
        const checkedJobIds = new Set(fetchedApps.map(a => a.job_posting_id));

        const scanStorage = (storage: Storage) => {
          for (let i = 0; i < storage.length; i++) {
            const key = storage.key(i);
            if (key && key.startsWith('maha_candidate_draft_')) {
              try {
                const raw = storage.getItem(key);
                if (!raw) continue;
                const parsed = JSON.parse(raw);
                const jobId = parsed.job_id || key.split('_')[3];
                if (!jobId || checkedJobIds.has(jobId)) continue;

                checkedJobIds.add(jobId);
                const stepLabelMap: Record<string, string> = {
                  step1: 'Step 1: Master Profile',
                  step2: 'Step 2: Basic Information',
                  job_specific: 'Step 2: Position Details',
                  questionnaire: 'Step 3: Questionnaire',
                  review: 'Step 4: Review & Submit',
                };
                const lastStep = parsed.last_active_step || 'job_specific';
                const stepName = stepLabelMap[lastStep] || 'In Progress';

                localDrafts.push({
                  id: `local-draft-${jobId}`,
                  candidate_id: effectiveCandidateId || 'local-candidate',
                  job_posting_id: jobId,
                  application_number: 'Draft Application',
                  status: 'draft' as ApplicationStatus,
                  created_at: parsed.last_saved_at || new Date().toISOString(),
                  updated_at: parsed.last_saved_at || new Date().toISOString(),
                  preferred_district: parsed.job_specific?.preferredDistrict || null,
                  preferred_location: parsed.job_specific?.preferredTaluka || null,
                  application_data: {
                    ...parsed,
                    draft_progress_label: stepName,
                  },
                  job_posting: {
                    id: jobId,
                    title: parsed.job_title || 'Agricultural Operations Position',
                    department: 'Abhinav Bharat Foundation',
                    location: parsed.job_location || 'Maharashtra',
                    slug: '',
                    application_fee_amount: 0,
                  } as any,
                } as RmsApplicationWithDetails);
              } catch {}
            }
          }
        };

        scanStorage(sessionStorage);
        scanStorage(localStorage);

        if (localDrafts.length > 0) {
          fetchedApps = [...fetchedApps, ...localDrafts];
        }
      } catch {}
    }

    setApps(fetchedApps);
    setLoading(false);
  }, [profile?.id, verifiedMobile, user?.phone, user?.id, refreshProfile]);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  const filtered = useMemo(() => {
    return apps.filter(a => {
      const title = a.job_posting?.title || '';
      const appNum = a.application_number || '';
      const matchSearch =
        !search ||
        title.toLowerCase().includes(search.toLowerCase()) ||
        appNum.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || a.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [apps, search, statusFilter]);

  // Status counts for badge numbers
  const counts = useMemo(() => {
    const res: Record<string, number> = { all: apps.length };
    for (const a of apps) {
      res[a.status] = (res[a.status] || 0) + 1;
    }
    return res;
  }, [apps]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 bg-white rounded-xl border border-slate-200 animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-2xl h-44 border border-slate-200 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── Flash Message / Success Notification ────────────────────────────── */}
      {flashMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs sm:text-sm font-semibold flex items-center justify-between gap-3 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{flashMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setFlashMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-bold px-2 py-1 rounded hover:bg-emerald-100/50 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ── Controls: Search & Status Filter Tabs ───────────────────────────── */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-[240px] bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 shadow-xs focus-within:border-[#102a43] focus-within:ring-1 focus-within:ring-[#102a43]">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by position title or application number..."
              className="flex-1 text-xs sm:text-sm text-[#102a43] placeholder-slate-400 bg-transparent focus:outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="text-xs text-slate-400 hover:text-slate-600 px-1"
              >
                Clear
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => loadApplications()}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-xs"
            title="Refresh applications list"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {/* Filter Tabs with Badge Counts */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-200">
          {STATUS_FILTERS.map(f => {
            const active = statusFilter === f.value;
            const count = counts[f.value] || 0;
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => setStatusFilter(f.value)}
                className={`text-xs font-bold px-3 py-2 rounded-xl border whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                  active
                    ? 'bg-[#102a43] text-white border-[#102a43] shadow-xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span>{f.label}</span>
                {count > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                      active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Applications Cards List ─────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 sm:p-14 text-center shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4 text-slate-400">
            <FileText className="w-7 h-7" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-[#102a43]">
            {apps.length === 0
              ? "You haven't started any job applications yet."
              : 'No applications match your filter.'}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto">
            {apps.length === 0
              ? 'Browse open positions across Abhinav Bharat Foundation digital operations, save drafts anytime, and track your recruitment stages here.'
              : 'Try clearing your search query or selecting a different status filter above.'}
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {apps.length === 0 ? (
              <Link
                to="/careers"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#102a43] hover:bg-[#0b69a3] text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-sm"
              >
                Browse Openings <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setStatusFilter('all');
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(app => {
            const isDraft = app.status === 'draft';
            const isPaymentPending = app.status === 'payment_pending';
            const feeAmount = Number(app.job_posting?.application_fee_amount ?? 0);
            const hasFee = feeAmount > 0;
            const draftProgress =
              (app.application_data as any)?.draft_progress_label ||
              ((app.application_data as any)?.last_active_step ? `Step: ${(app.application_data as any).last_active_step}` : null);

            return (
              <div
                key={app.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 hover:border-slate-300 hover:shadow-xs transition-all space-y-4"
              >
                {/* Card Header: Job Title & Status Badge */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[11px] font-bold text-[#627d98] uppercase tracking-wide">
                      <Building2 className="w-3.5 h-3.5 text-[#0b69a3]" />
                      <span>{app.job_posting?.department || 'Abhinav Bharat Foundation'}</span>
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-[#102a43]">
                      {app.job_posting?.title || 'Job Application'}
                    </h3>

                    {/* Metadata chips */}
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-slate-600 pt-1">
                      {/* Application ID vs Draft Badge */}
                      {isDraft ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-semibold">
                          <Clock className="w-3 h-3 text-amber-600" /> Draft Application
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-mono font-bold text-[#102a43] bg-slate-50 border border-slate-200 px-2 py-0.5 rounded text-[11px]">
                          ID: {app.application_number}
                        </span>
                      )}

                      {/* Location Chip */}
                      {(app.preferred_district || app.job_posting?.location) && (
                        <span className="inline-flex items-center gap-1 text-slate-500">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {app.preferred_district
                              ? `${app.preferred_district}${app.preferred_location ? `, ${app.preferred_location}` : ''}`
                              : app.job_posting?.location}
                          </span>
                        </span>
                      )}

                      {/* Date */}
                      <span className="inline-flex items-center gap-1 text-slate-500">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {isDraft ? 'Saved: ' : 'Applied: '}
                          {new Date(app.updated_at || app.created_at).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </span>

                      {/* Payment Status Chip (if applicable) */}
                      {hasFee && (
                        <span className="inline-flex items-center gap-1 text-xs">
                          <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                          {isPaymentPending ? (
                            <span className="text-amber-700 font-semibold">Fee ₹{feeAmount} Pending</span>
                          ) : !isDraft ? (
                            <span className="text-emerald-700 font-semibold">Fee ₹{feeAmount} Paid</span>
                          ) : (
                            <span className="text-slate-500">Fee: ₹{feeAmount}</span>
                          )}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="shrink-0 self-start">
                    <ApplicationStatusBadge status={app.status} size="md" />
                  </div>
                </div>

                {/* Progress Indicator for Incomplete Drafts */}
                {isDraft && draftProgress && (
                  <div className="p-3 bg-amber-50/60 border border-amber-200/70 rounded-xl flex items-center justify-between flex-wrap gap-2 text-xs">
                    <div className="flex items-center gap-2 text-amber-900 font-semibold">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      <span>Saved Progress: <span className="font-bold">{draftProgress}</span></span>
                    </div>
                    <span className="text-[11px] text-amber-700">Resume anytime without losing entered information</span>
                  </div>
                )}

                {/* Status Stepper Tracker (for active/submitted applications) */}
                {!isDraft && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center gap-1">
                      {Object.entries(APPLICATION_STATUS_CONFIG)
                        .filter(([, v]) => v.step > 0 && v.step <= 10)
                        .sort(([, a], [, b]) => a.step - b.step)
                        .slice(0, 8)
                        .map(([key, cfg]) => {
                          const currentStep = APPLICATION_STATUS_CONFIG[app.status]?.step ?? 0;
                          const isDone = cfg.step <= currentStep;
                          return (
                            <div
                              key={key}
                              className={`flex-1 h-1.5 rounded-full transition-all ${
                                isDone ? 'bg-[#0b69a3]' : 'bg-slate-200'
                              }`}
                              title={cfg.label}
                            />
                          );
                        })}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                      <span>Submitted</span>
                      <span>Review &amp; Verification</span>
                      <span>Interview</span>
                      <span>Final Outcome</span>
                    </div>
                  </div>
                )}

                {/* Card Action Footer */}
                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-xs text-slate-500">
                    {isDraft ? (
                      <span className="text-slate-600 font-medium">Application not yet submitted. Click continue to finish.</span>
                    ) : isPaymentPending ? (
                      <span className="text-amber-800 font-medium">Complete payment to finalize your official submission.</span>
                    ) : (
                      <span className="text-slate-500">All updates will be reflected directly in your dashboard.</span>
                    )}
                  </div>

                  {/* Status-Based Primary Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {/* Draft -> Continue Application */}
                    {app.status === 'draft' && (
                      <Link
                        to={`/careers/portal/apply/${app.job_posting?.id || app.job_posting_id}`}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#102a43] hover:bg-[#0b69a3] text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                      >
                        Continue Application <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    )}

                    {/* Payment Pending -> Complete Payment */}
                    {app.status === 'payment_pending' && (
                      <Link
                        to="/candidate/payments"
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                      >
                        Complete Payment <CreditCard className="w-3.5 h-3.5" />
                      </Link>
                    )}

                    {/* Payment Failed -> Retry Payment */}
                    {app.status === 'payment_failed' && (
                      <Link
                        to="/candidate/payments"
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                      >
                        Retry Payment <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    )}

                    {/* Interview Scheduled -> View Interview Details */}
                    {app.status === 'interview_scheduled' && (
                      <Link
                        to="/candidate/interviews"
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                      >
                        View Interview Details <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    )}

                    {/* Submitted / Under Review / Other Statuses */}
                    {app.status !== 'draft' && app.status !== 'payment_pending' && app.status !== 'payment_failed' && app.status !== 'interview_scheduled' && (
                      <Link
                        to={app.job_posting?.slug ? `/careers/jobs/${app.job_posting.slug}` : '/careers'}
                        className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                        {app.status === 'selected'
                          ? 'View Selection Details'
                          : app.status === 'completed'
                          ? 'View Joining Details'
                          : app.status === 'rejected'
                          ? 'View Application Status'
                          : 'View Position Details'}
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

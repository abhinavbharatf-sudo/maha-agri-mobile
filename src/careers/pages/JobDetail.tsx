import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, MapPin, Clock, Building2, CheckCircle2,
  FileText, IndianRupee, Users, Briefcase, Calendar,
  AlertCircle, ChevronRight, ChevronDown, Play, Download,
  ListChecks, HelpCircle, ShieldCheck, Square, CheckSquare,
  ExternalLink, X, Info, Lock, GraduationCap, Ban, CheckCircle,
  Flame, CalendarClock, Package,
} from 'lucide-react';
import { getJobBySlug, listPublishedJobs, listJobBadges, listRecruitmentSteps, listJobFaqs, incrementJobViews } from '../lib/api';
import type { RmsJobPosting, RmsJobBadge, RmsRecruitmentStep, RmsJobFaq } from '../lib/types';
import { EMPLOYMENT_TYPE_LABELS, JOB_STATUS_MESSAGES, formatSalaryDisplay, formatSalaryPackage } from '../lib/constants';
import { useCandidateAuth } from '../lib/CandidateAuthContext';
import OTPLoginModal from '../components/OTPLoginModal';
import { trackJobView } from '../../crm/lib/api';

// ─── Static data ──────────────────────────────────────────────────────────────

const SELECTION_STEPS = [
  { label: 'Application',                    desc: 'Submit your online application form with all required details.' },
  { label: 'Application Fee',                desc: 'Pay the applicable processing fee securely online.' },
  { label: 'Interview Slot Booking',         desc: 'Select a convenient date and time for your personal interview.' },
  { label: 'Interview',                      desc: 'Attend the scheduled interview (online or in-person at your district centre).' },
  { label: 'Preliminary Selection',          desc: 'Shortlisted candidates are notified via SMS and email.' },
  { label: 'Document Verification',          desc: 'Submit original documents for official verification at the designated centre.' },
  { label: 'Provisional Appointment Letter', desc: 'Receive your provisional offer letter pending final formalities.' },
  { label: 'Candidate Acceptance',           desc: 'Formally confirm acceptance of the appointment terms and conditions.' },
  { label: 'Onboarding Formalities',         desc: 'Complete all required pre-joining administrative formalities.' },
  { label: 'Training (Online / Offline)',     desc: 'Attend the designated induction and role-specific training programme.' },
  { label: 'Final Appointment Letter',       desc: 'Receive your official, confirmed appointment letter.' },
  { label: 'Joining',                        desc: 'Complete the official joining process at your assigned location.' },
  { label: 'Project Work Assignment (PWAN)', desc: 'Your project area, team and performance targets are formally assigned.' },
  { label: 'Project Deployment',             desc: 'Begin active deployment on the assigned project in your district.' },
];

const FAQ_ITEMS = [
  {
    q: 'What is the application fee for this position?',
    a: 'The application fee varies by position and is clearly mentioned on this page. Fee payment is processed securely online via our payment gateway. Some positions have no application fee.',
  },
  {
    q: 'Can I apply for multiple positions at the same time?',
    a: 'Yes. You may apply for multiple positions across different projects. However, each application is treated separately and requires its own acknowledgement and fee (if applicable).',
  },
  {
    q: 'What is the interview format?',
    a: 'Interviews may be conducted online (video call), offline (at a designated district centre), or in a hybrid format. The mode will be confirmed at the time of interview slot booking.',
  },
  {
    q: 'How will I be notified about my application status?',
    a: 'All updates — including interview scheduling, selection results, and document verification notices — are sent via SMS to your registered mobile number and via WhatsApp where available.',
  },
  {
    q: 'What documents are required for document verification?',
    a: 'Typically: Aadhaar Card, PAN Card, Educational Certificates (all levels), Bank Passbook / Cancelled Cheque, 2 recent Passport-size Photographs, and any experience certificates. A complete list will be provided in your appointment call letter.',
  },
];

const JOURNEY_STAGES = [
  'Application', 'Screening', 'Interview', 'Selection',
  'Training', 'Appointment', 'Joining', 'Deployment',
];

const VISIBLE_STEPS = 3;

// ─── Component ────────────────────────────────────────────────────────────────

export default function JobDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate  = useNavigate();
  const { user, profile } = useCandidateAuth();

  const [job,          setJob]          = useState<RmsJobPosting | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [otpOpen,      setOtpOpen]      = useState(false);
  const [relatedJobs,  setRelatedJobs]  = useState<RmsJobPosting[]>([]);
  const [badges,       setBadges]       = useState<RmsJobBadge[]>([]);
  const [customSteps,  setCustomSteps]  = useState<RmsRecruitmentStep[]>([]);
  const [customFaqs,   setCustomFaqs]   = useState<RmsJobFaq[]>([]);

  // Single acknowledgement checkbox
  const [acknowledged,   setAcknowledged]   = useState(false);
  // Validation dialog (shown when CTA clicked without ack)
  const [showDialog,     setShowDialog]     = useState(false);
  // Glow animation on ack section when triggered from dialog
  const [ackHighlight,   setAckHighlight]   = useState(false);
  // Track which resource cards the user has opened
  const [opened, setOpened] = useState<Record<string, boolean>>({ pdf: false, video: false });

  const [openFaq,        setOpenFaq]        = useState<number | null>(null);
  const [stepsExpanded,  setStepsExpanded]  = useState(false);

  const ackRef      = useRef<HTMLDivElement>(null);
  const ackInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!slug) return;
    Promise.all([getJobBySlug(slug), listPublishedJobs()]).then(([j, all]) => {
      const jobData = j.data;
      setJob(jobData);
      setRelatedJobs(all.data.filter(r => r.slug !== slug).slice(0, 3));
      setLoading(false);
      if (jobData?.id) {
        Promise.all([
          listJobBadges(jobData.id),
          listRecruitmentSteps(jobData.id),
          listJobFaqs(jobData.id),
        ]).then(([b, s, f]) => {
          setBadges(b.data.filter(x => x.enabled));
          setCustomSteps(s.data.filter(x => x.enabled));
          setCustomFaqs(f.data.filter(x => x.enabled));
        });
      }
    });
  }, [slug]);

  // Status-driven apply button control
  const applyDisabled = !job || ['coming_soon', 'applications_closed', 'filled', 'hidden', 'draft', 'archived'].includes(job.status);
  const statusMessage = job ? JOB_STATUS_MESSAGES[job.status] : null;

  // Increment views on load
  useEffect(() => {
    if (job?.id) {
      incrementJobViews(job.id);
      if (user?.id) {
        // Track for CRM if user is authenticated
        trackJobView(user.id, job.id, user.id).catch(console.error);
      }
    }
  }, [job?.id, user?.id]);

  const handleApply = useCallback(() => {
    if (applyDisabled) return;
    if (!acknowledged) {
      setShowDialog(true);
      return;
    }
    
    // As per user request: ALWAYS trigger the OTP popup, even if they are already logged in.
    return setOtpOpen(true);
  }, [acknowledged, applyDisabled]);

  const handleLoginSuccess = (isNewUser: boolean) => {
    setOtpOpen(false);
    if (isNewUser) {
      navigate('/candidate/profile?redirect=/careers/apply/' + job?.id);
    } else {
      navigate('/careers/apply/' + job?.id);
    }
  };

  const scrollToAck = () => {
    setShowDialog(false);
    ackRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => {
      setAckHighlight(true);
      ackInputRef.current?.focus();
      setTimeout(() => setAckHighlight(false), 2000);
    }, 600);
  };

  const openResource = (key: string, url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
    setOpened(prev => ({ ...prev, [key]: true }));
  };

  // ── Loading ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary-50">
        <div className="animate-spin w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-primary-50">
        <AlertCircle className="w-12 h-12 text-primary-400" />
        <p className="text-primary-600 font-semibold text-lg">Position not found.</p>
        <p className="text-sm text-primary-400">The job listing may have closed or the link may be incorrect.</p>
        <Link to="/careers" className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-primary-700 underline">
          <ArrowLeft className="w-4 h-4" /> Back to Careers
        </Link>
      </div>
    );
  }

  const eligibility = (job.eligibility_criteria as { label: string; required: boolean }[]) ?? [];
  const documents   = (job.required_documents   as { key: string; label: string; description?: string }[]) ?? [];
  const appFeeStr   = job.application_fee_amount === 0
    ? 'Free'
    : `₹${job.application_fee_amount.toLocaleString('en-IN')}`;

  const ageCriteria = (job.min_age && job.max_age)
    ? `${job.min_age}–${job.max_age} Years`
    : job.min_age
    ? `Min ${job.min_age} Years`
    : job.max_age
    ? `Max ${job.max_age} Years`
    : null;

  // Closing Soon: within 3 days of closing_date
  const now = new Date();
  const closingDate = job.closing_date ? new Date(job.closing_date) : null;
  const msToClose = closingDate ? closingDate.getTime() - now.getTime() : null;
  const isClosingSoon = msToClose != null && msToClose > 0 && msToClose <= 3 * 24 * 60 * 60 * 1000;

  // Candidate-friendly status
  const candidateStatus = (): { label: string; cls: string } => {
    if (job.status === 'filled') return { label: 'Position Filled', cls: 'bg-slate-100 text-slate-600' };
    if (job.status === 'applications_closed') return { label: 'Applications Closed', cls: 'bg-red-100 text-red-700' };
    if (job.status === 'coming_soon') return { label: 'Coming Soon', cls: 'bg-blue-100 text-blue-700' };
    if (isClosingSoon) return { label: 'Closing Soon', cls: 'bg-orange-100 text-orange-700' };
    return { label: 'Open', cls: 'bg-emerald-100 text-emerald-700' };
  };
  const cStatus = candidateStatus();

  // Date display helpers
  const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  const showOpenDate = job.status === 'coming_soon' && job.publish_date && new Date(job.publish_date) > now;
  const showDeadline = job.status === 'published'
    && job.display_deadline_public !== false
    && !job.never_close_applications
    && job.closing_date;
  const showNeverClose = job.status === 'published' && job.never_close_applications;

  const DEFAULT_ACK = 'I confirm that I have reviewed all project documents, eligibility criteria, recruitment process, responsibilities and terms before submitting my application.';
  const ackText = job.acknowledgement_text?.trim() || DEFAULT_ACK;

  // Active steps and FAQs — use DB-configured items if available, else static defaults
  const activeSteps = customSteps.length > 0
    ? customSteps.map(s => ({ label: s.label, desc: s.description ?? '' }))
    : SELECTION_STEPS;
  const activeFaqs = customFaqs.length > 0
    ? customFaqs.map(f => ({ q: f.question, a: f.answer }))
    : FAQ_ITEMS;

  return (
    <>
      <div className="min-h-screen bg-primary-50/60 pb-20 lg:pb-0">

        {/* ── Breadcrumb ──────────────────────────────────────────────────── */}
        <div className="bg-white border-b border-primary-100">
          <div className="container-government py-2.5">
            <div className="flex items-center gap-2 text-xs text-primary-500 flex-wrap">
              <Link to="/careers" className="hover:text-primary-700 transition-colors font-medium">Careers</Link>
              <ChevronRight className="w-3.5 h-3.5 shrink-0" />
              {job.department && (
                <>
                  <span className="text-primary-400">{job.department}</span>
                  <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                </>
              )}
              <span className="text-primary-900 font-semibold truncate">{job.title}</span>
            </div>
          </div>
        </div>

        {/* ── Hero strip ──────────────────────────────────────────────────── */}
        <div className="bg-primary-900 text-white">
          <div className="container-government py-5 md:py-6">
            <button
              onClick={() => navigate('/careers')}
              className="flex items-center gap-1.5 text-xs text-primary-300 hover:text-white mb-3 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> All Openings
            </button>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                {job.department && (
                  <p className="text-primary-300 text-[11px] font-bold uppercase tracking-widest mb-1.5">
                    {job.department}
                  </p>
                )}
                <h1 className="text-xl md:text-2xl font-bold text-white leading-tight">{job.title}</h1>

                {/* Meta row */}
                <div className="flex flex-wrap items-center gap-3 mt-3">
                  {job.location && (
                    <span className="flex items-center gap-1.5 text-xs text-primary-200">
                      <MapPin className="w-3.5 h-3.5" />{job.location}
                    </span>
                  )}
                  {job.employment_type && (
                    <span className="flex items-center gap-1.5 text-xs text-primary-200">
                      <Briefcase className="w-3.5 h-3.5" />{EMPLOYMENT_TYPE_LABELS[job.employment_type]}
                    </span>
                  )}
                  {job.experience_required && (
                    <span className="flex items-center gap-1.5 text-xs text-primary-200">
                      <Clock className="w-3.5 h-3.5" />{job.experience_required}
                    </span>
                  )}
                </div>

                {/* Dynamic recruitment badges */}
                {badges.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    {badges.map(badge => (
                      <span key={badge.id} className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        badge.color === 'emerald' ? 'bg-emerald-500 text-white' :
                        badge.color === 'amber'   ? 'bg-amber-400 text-amber-900' :
                        badge.color === 'orange'  ? 'bg-orange-400 text-white' :
                        badge.color === 'red'     ? 'bg-red-500 text-white' :
                        badge.color === 'blue'    ? 'bg-blue-500 text-white' :
                        badge.color === 'primary' ? 'bg-white text-primary-900' :
                        'bg-white/10 text-white border border-white/20'
                      }`}>
                        {badge.title}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Body ────────────────────────────────────────────────────────── */}
        <div className="container-government py-5">
          <div className="grid lg:grid-cols-3 gap-5 xl:gap-6 items-start">

            {/* ══ MAIN COLUMN ══════════════════════════════════════════════ */}
            <div className="lg:col-span-2 space-y-4">

              {/* 1. ROLE OVERVIEW */}
              <SectionCard delay={0} icon={<Briefcase className="w-4 h-4" />} label="Position Summary" title="Role Overview">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                  {job.location && <SummaryItem icon={MapPin} label="Location" value={job.location} />}
                  {job.employment_type && <SummaryItem icon={Calendar} label="Employment Type" value={EMPLOYMENT_TYPE_LABELS[job.employment_type]} />}
                  {job.experience_required && <SummaryItem icon={Clock} label="Experience" value={job.experience_required} />}
                  {eligibility.length > 0 && <SummaryItem icon={Info} label="Qualification" value={eligibility[0]?.label ?? 'As per JD'} />}
                  {ageCriteria && <SummaryItem icon={Calendar} label="Age Criteria" value={ageCriteria} />}
                  {(() => { const sd = formatSalaryDisplay(job); return sd && <SummaryItem icon={IndianRupee} label="Salary / Honorarium" value={sd} accent="amber" />; })()}
                  {job.application_fee_amount >= 0 && (
                    <SummaryItem
                      icon={IndianRupee}
                      label="Application Fee"
                      value={job.application_fee_amount === 0 ? 'Free of Cost' : `₹${job.application_fee_amount.toLocaleString('en-IN')}`}
                      accent={job.application_fee_amount > 0 ? 'amber' : 'green'}
                    />
                  )}
                  <SummaryItem icon={Info} label="Recruitment Mode" value={job.recruitment_mode ?? 'Online'} />
                  {job.total_vacancies != null && <SummaryItem icon={Users} label="Total Vacancies" value={job.total_vacancies.toLocaleString('en-IN') + ' Vacancies'} />}
                  {job.vacancies_per_district != null && <SummaryItem icon={MapPin} label="Per District" value={job.vacancies_per_district.toLocaleString('en-IN') + ' Vacancies'} />}
                  {job.vacancies_per_taluka != null && <SummaryItem icon={MapPin} label="Per Taluka" value={job.vacancies_per_taluka.toLocaleString('en-IN') + ' Vacanc' + (job.vacancies_per_taluka === 1 ? 'y' : 'ies')} />}
                  <SummaryItem
                    icon={CheckCircle2}
                    label="Application Status"
                    value={cStatus.label}
                    accent={
                      isClosingSoon ? 'amber' :
                      job.status === 'published' ? 'green' : undefined
                    }
                  />
                </div>

                {/* Description */}
                {job.description && (
                  <div className="text-sm text-primary-700 leading-relaxed whitespace-pre-wrap border-t border-primary-100 pt-3">
                    {job.description}
                  </div>
                )}

                {/* Project Overview — only if HR has entered content */}
                {job.project_overview?.trim() && (
                  <div className="mt-3 p-3.5 rounded-xl bg-primary-50 border border-primary-100">
                    <p className="text-[11px] font-bold text-primary-400 uppercase tracking-widest mb-1.5">Project Overview</p>
                    <p className="text-sm text-primary-700 leading-relaxed">{job.project_overview}</p>
                  </div>
                )}
              </SectionCard>

              {/* 2. PROJECT RESOURCES — compact link list */}
              <SectionCard delay={0.08} icon={<Download className="w-4 h-4" />} label="Before You Apply" title="Project Resources">
                {(job.project_pdf_enabled !== false && job.project_pdf_url?.trim()) || (job.project_video_enabled !== false && job.project_video_url?.trim()) ? (
                  <div className="divide-y divide-primary-50">
                    {job.project_pdf_enabled !== false && job.project_pdf_url?.trim() && (
                      <a href={job.project_pdf_url} target="_blank" rel="noopener noreferrer"
                        onClick={() => setOpened(p => ({ ...p, pdf: true }))}
                        className="flex items-center gap-3 py-3 first:pt-0 last:pb-0 group hover:bg-primary-50 rounded-xl px-2 -mx-2 transition-colors">
                        <div className="w-8 h-8 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4 text-red-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-primary-800 leading-tight">Project Information PDF</p>
                          <p className="text-xs text-primary-500 mt-0.5">Official project brief, scope &amp; guidelines</p>
                        </div>
                        <span className="flex items-center gap-1 text-xs font-bold text-primary-600 group-hover:text-primary-800 shrink-0">
                          View <ExternalLink className="w-3 h-3" />
                        </span>
                      </a>
                    )}
                    {job.project_video_enabled !== false && job.project_video_url?.trim() && (
                      <a href={job.project_video_url} target="_blank" rel="noopener noreferrer"
                        onClick={() => setOpened(p => ({ ...p, video: true }))}
                        className="flex items-center gap-3 py-3 first:pt-0 last:pb-0 group hover:bg-primary-50 rounded-xl px-2 -mx-2 transition-colors">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                          <Play className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-primary-800 leading-tight">Project Introduction Video</p>
                          <p className="text-xs text-primary-500 mt-0.5">Official project walkthrough &amp; overview</p>
                        </div>
                        <span className="flex items-center gap-1 text-xs font-bold text-primary-600 group-hover:text-primary-800 shrink-0">
                          Watch <ExternalLink className="w-3 h-3" />
                        </span>
                      </a>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-primary-400 py-2">Project resources will be made available shortly. Please check back before applying.</p>
                )}
              </SectionCard>

              {/* 3. JOB DESCRIPTION */}
              <SectionCard delay={0.12} icon={<FileText className="w-4 h-4" />} label="Role Details" title="Job Description">

                {/* JD PDF actions */}
                <div className={`flex items-center gap-3 p-3.5 rounded-xl border-2 mb-4 ${
                  opened.jd ? 'border-emerald-300 bg-emerald-50' : job.jd_pdf_url ? 'border-primary-200 bg-primary-50/40' : 'border-primary-100 bg-primary-50/30'
                }`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    opened.jd ? 'bg-emerald-100 text-emerald-600' : 'bg-white text-primary-500 border border-primary-100'
                  }`}>
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-primary-900">Job Description PDF</p>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">PDF</span>
                    </div>
                    <p className="text-xs text-primary-500 mt-0.5">Full JD with roles, KPIs, eligibility & responsibilities</p>
                  </div>
                  {job.jd_pdf_url ? (
                    <div className="flex gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => { window.open(job.jd_pdf_url!, '_blank', 'noopener,noreferrer'); setOpened(p => ({ ...p, jd: true })); }}
                        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-primary-900 text-white rounded-lg hover:bg-primary-800 transition-all"
                      >
                        <Download className="w-3.5 h-3.5" /> Download JD
                      </button>
                      <button
                        type="button"
                        onClick={() => { window.open(job.jd_pdf_url!, '_blank', 'noopener,noreferrer'); setOpened(p => ({ ...p, jd: true })); }}
                        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-primary-50 text-primary-700 rounded-lg border border-primary-200 hover:bg-primary-100 transition-all"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> View Online
                      </button>
                    </div>
                  ) : (
                    <span className="shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary-50 text-primary-400 border border-primary-100">
                      <Lock className="w-3 h-3" /> Available after HR upload
                    </span>
                  )}
                </div>

                {/* Quick Job Snapshot removed — info available in sidebar */}

                {/* Eligibility */}
                {eligibility.length > 0 && (
                  <div className="mb-3">
                    <p className="text-[11px] font-bold text-primary-400 uppercase tracking-widest mb-2">Eligibility Criteria</p>
                    <div className="grid sm:grid-cols-2 gap-1.5">
                      {eligibility.map((c, i) => (
                        <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-primary-50 border border-primary-100">
                          <CheckCircle2 className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${c.required ? 'text-emerald-500' : 'text-primary-300'}`} />
                          <div>
                            <span className="text-xs font-medium text-primary-800">{c.label}</span>
                            {c.required && <span className="ml-1.5 text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-px rounded-full">Required</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Required Documents */}
                {documents.length > 0 && (
                  <div className="mb-3">
                    <p className="text-[11px] font-bold text-primary-400 uppercase tracking-widest mb-2">Documents Required</p>
                    <div className="grid sm:grid-cols-2 gap-1.5">
                      {documents.map((doc, i) => (
                        <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-primary-50 border border-primary-100">
                          <FileText className="w-3.5 h-3.5 text-primary-400 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs font-semibold text-primary-800">{doc.label}</p>
                            {doc.description && <p className="text-[11px] text-primary-500 mt-0.5">{doc.description}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Skills */}
                {job.skills_required?.length > 0 && (
                  <div>
                    <p className="text-[11px] font-bold text-primary-400 uppercase tracking-widest mb-2">Skills Required</p>
                    <div className="flex flex-wrap gap-1.5">
                      {job.skills_required.map((s, i) => (
                        <span key={i} className="text-xs font-medium px-2.5 py-1 bg-primary-50 text-primary-700 rounded-full border border-primary-100">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
              </SectionCard>

              {/* 4. RECRUITMENT PROCESS */}
              <SectionCard delay={0.1} icon={<ListChecks className="w-4 h-4" />} label="How to Get Hired" title="Recruitment Process">
                <div className="relative pl-9">
                  <div className="absolute left-[13px] top-3 bottom-8 w-px bg-primary-100" />

              {activeSteps.slice(0, stepsExpanded ? activeSteps.length : VISIBLE_STEPS).map((step, i, arr) => (
                    <div key={i} className="relative mb-3 last:mb-0">
                      <div className={`absolute -left-9 top-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 shadow-sm z-10 ${
                        i === 0
                          ? 'bg-primary-900 border-primary-900 text-white'
                      : stepsExpanded && i === arr.length - 1
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'bg-white border-primary-200 text-primary-500'
                      }`}>
                        {i + 1}
                      </div>
                      <div className="bg-primary-50 rounded-xl p-3 border border-primary-100">
                        <p className={`text-sm font-semibold leading-tight ${
                        i === 0 ? 'text-primary-900' : stepsExpanded && i === arr.length - 1 ? 'text-emerald-700' : 'text-primary-800'
                        }`}>{step.label}</p>
                        <p className="text-xs text-primary-500 mt-0.5 leading-relaxed">{step.desc}</p>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => setStepsExpanded(e => !e)}
                    className="relative -left-9 mt-3 flex items-center gap-2 text-xs font-semibold text-primary-600 hover:text-primary-800 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-full border-2 border-dashed border-primary-300 flex items-center justify-center bg-white">
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${stepsExpanded ? 'rotate-180' : ''}`} />
                    </div>
                    {stepsExpanded
                      ? 'Hide remaining steps'
                      : `View complete process — ${activeSteps.length - VISIBLE_STEPS} more steps`
                    }
                  </button>
                </div>

                {/* Horizontal journey summary */}
                <div className="mt-5 pt-4 border-t border-primary-100">
                  <p className="text-[11px] font-bold text-primary-400 uppercase tracking-widest mb-3">Recruitment Journey</p>
                  <div className="flex items-start gap-0 overflow-x-auto pb-1">
                    {JOURNEY_STAGES.map((stage, i) => (
                      <div key={i} className="flex items-center shrink-0">
                        <div className="flex flex-col items-center">
                          <div className="w-8 h-8 rounded-full bg-primary-900 text-white flex items-center justify-center text-[10px] font-bold shadow-sm">
                            {i + 1}
                          </div>
                          <p className="text-[10px] font-semibold text-primary-600 mt-1 text-center leading-tight max-w-[56px]">{stage}</p>
                        </div>
                        {i < JOURNEY_STAGES.length - 1 && (
                          <div className="w-6 h-px bg-primary-200 mx-0.5 mt-[-12px] shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </SectionCard>

              {/* 5. FAQ */}
              <SectionCard delay={0.14} icon={<HelpCircle className="w-4 h-4" />} label="Frequently Asked Questions" title="Common Questions">
                <div className="space-y-1.5">
                  {activeFaqs.map((item, i) => (
                    <div key={i} className="rounded-xl border border-primary-100 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setOpenFaq(openFaq === i ? null : i)}
                        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-primary-50 transition-colors"
                      >
                        <span className="text-sm font-semibold text-primary-800 leading-snug">{item.q}</span>
                        <ChevronDown className={`w-4 h-4 text-primary-400 shrink-0 transition-transform duration-200 ${openFaq === i ? 'rotate-180' : ''}`} />
                      </button>
                      <AnimatePresence initial={false}>
                        {openFaq === i && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-3.5 pt-1 bg-primary-50/60 border-t border-primary-100">
                              <p className="text-sm text-primary-600 leading-relaxed">{item.a}</p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              </SectionCard>

              {/* 6. CANDIDATE DIGITAL ACKNOWLEDGEMENT */}
              <motion.div
                ref={ackRef}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18 }}
                className={`bg-white rounded-2xl border-2 shadow-card overflow-hidden transition-all duration-300 ${
                  ackHighlight
                    ? 'border-primary-500 shadow-[0_0_0_4px_rgba(var(--color-primary-500),0.15)]'
                    : acknowledged
                    ? 'border-emerald-300'
                    : 'border-primary-200'
                }`}
              >
                {/* Header */}
                <div className={`px-5 py-4 transition-colors duration-300 ${acknowledged ? 'bg-emerald-700' : 'bg-primary-900'}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-white">
                        {acknowledged ? 'Verification Completed' : 'Candidate Acknowledgement'}
                      </h2>
                      <p className="text-xs mt-0.5 text-white/70">
                        {acknowledged
                          ? 'You may now proceed with your application.'
                          : 'Please confirm before proceeding with your application.'}
                      </p>
                    </div>
                    {acknowledged && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="ml-auto"
                      >
                        <CheckCircle2 className="w-7 h-7 text-emerald-300" />
                      </motion.div>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-white/60 mb-1.5">
                      <span>Review Progress</span>
                      <span className="font-bold text-white">{acknowledged ? '100%' : '0%'}</span>
                    </div>
                    <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-white rounded-full"
                        animate={{ width: acknowledged ? '100%' : '0%' }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Checklist removed — single professional declaration only */}

                {/* Checkbox body */}
                <div className="p-5">
                  <label className={`flex items-start gap-4 cursor-pointer select-none p-4 rounded-xl border-2 transition-all ${
                    acknowledged
                      ? 'border-emerald-300 bg-emerald-50'
                      : 'border-primary-200 bg-primary-50/40 hover:border-primary-300 hover:bg-white'
                  }`}>
                    <input
                      ref={ackInputRef}
                      type="checkbox"
                      checked={acknowledged}
                      onChange={e => setAcknowledged(e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`mt-0.5 shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                      acknowledged
                        ? 'bg-emerald-600 border-emerald-600'
                        : 'bg-white border-primary-300'
                    }`}>
                      {acknowledged && <CheckSquare className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                    </div>
                    <p className="text-sm text-primary-800 leading-relaxed">
                      {ackText}
                    </p>
                  </label>

                  {/* Success message */}
                  <AnimatePresence>
                    {acknowledged && (
                      <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="mt-3 flex items-center gap-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <p className="text-sm font-semibold text-emerald-800">
                          Verification completed successfully. You may now continue with your application.
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Always-visible CTA button */}
                <div className="px-5 pb-5">
                  {statusMessage ? (
                    <div className="w-full flex items-center justify-center gap-2.5 px-6 py-4 font-bold rounded-xl text-sm min-h-[52px] bg-neutral-100 text-neutral-500">
                      {job.status === 'coming_soon' && <Clock className="w-5 h-5" />}
                      {job.status === 'applications_closed' && <Ban className="w-5 h-5" />}
                      {job.status === 'filled' && <CheckCircle className="w-5 h-5" />}
                      {statusMessage}
                    </div>
                  ) : (
                    <button
                      onClick={handleApply}
                      className={`w-full flex items-center justify-center gap-2.5 px-6 py-4 font-bold rounded-xl transition-all text-sm min-h-[52px] touch-manipulation ${
                        acknowledged
                          ? 'bg-primary-900 text-white hover:bg-primary-800 active:scale-[0.98] shadow-lg'
                          : 'bg-primary-100 text-primary-500 hover:bg-primary-200 cursor-pointer'
                      }`}
                    >
                      {acknowledged
                        ? <><ArrowRight className="w-5 h-5" /> Proceed to Application Form</>
                        : <><ArrowRight className="w-5 h-5" /> Continue to Application</>
                      }
                    </button>
                  )}
                  {!acknowledged && !statusMessage && (
                    <p className="text-xs text-center text-primary-400 mt-2">
                      Please confirm the acknowledgement above before proceeding.
                    </p>
                  )}
                </div>
              </motion.div>

            </div>{/* end main col */}

            {/* ══ SIDEBAR ══════════════════════════════════════════════════ */}
            <div className="space-y-4 lg:sticky lg:top-6">

              {/* Application Details */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.06 }}
                className="bg-white rounded-2xl border border-primary-100 shadow-card overflow-hidden"
              >
                <div className="bg-primary-900 px-4 py-3.5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-primary-400 mb-0.5">Application Details</p>
                  <p className="text-sm font-bold text-white leading-snug line-clamp-2">{job.title}</p>
                  {job.department && <p className="text-xs text-primary-300 mt-0.5">{job.department}</p>}

                {/* Candidate-friendly status badge */}
                <div className="mt-2">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${cStatus.cls}`}>
                    {isClosingSoon && <Flame className="inline w-3 h-3 mr-1 -mt-0.5" />}
                    {cStatus.label}
                  </span>
                  {showDeadline && (
                    <span className="ml-2 text-xs text-primary-300">
                      Last Date to Apply: {fmtDate(job.closing_date)}
                    </span>
                  )}
                </div>
                </div>

                <div className="p-4 space-y-2.5">
                  {/* Application Fee */}
                  {job.application_fee_amount > 0 ? (
                    <SidebarRow label="Application Fee" value={`₹${job.application_fee_amount.toLocaleString('en-IN')}`} accent="amber" icon={IndianRupee} />
                  ) : (
                    <SidebarRow label="Application Fee" value="Free of Cost" accent="green" icon={IndianRupee} />
                  )}

                  {/* Employment Type */}
                  {job.employment_type && (
                    <SidebarRow label="Employment Type" value={EMPLOYMENT_TYPE_LABELS[job.employment_type]} icon={Briefcase} />
                  )}

                  {/* Experience */}
                  {job.experience_required && (
                    <SidebarRow label="Experience Required" value={job.experience_required} icon={Clock} />
                  )}

                  {/* Qualification */}
                  {eligibility.length > 0 && (
                    <SidebarRow label="Qualification" value={eligibility[0]?.label ?? 'As per JD'} icon={Info} />
                  )}

                  {/* Age Criteria */}
                  {ageCriteria && (
                    <SidebarRow label="Age Criteria" value={ageCriteria} icon={Calendar} />
                  )}

                  {/* Total Vacancies */}
                  {job.total_vacancies != null && (
                    <SidebarRow label="Total Vacancies" value={job.total_vacancies.toLocaleString('en-IN') + ' Vacancies'} icon={Users} />
                  )}

                  {/* Vacancies Per District */}
                  {job.vacancies_per_district != null && (
                    <SidebarRow label="Per District" value={job.vacancies_per_district.toLocaleString('en-IN') + ' Vacancies'} icon={MapPin} />
                  )}

                  {/* Vacancies Per Taluka */}
                  {job.vacancies_per_taluka != null && (
                    <SidebarRow label="Per Taluka" value={job.vacancies_per_taluka.toLocaleString('en-IN') + (job.vacancies_per_taluka === 1 ? ' Vacancy' : ' Vacancies')} icon={MapPin} />
                  )}

                  {/* Salary / Honorarium */}
                  {(() => { const sd = formatSalaryDisplay(job); return sd && <SidebarRow label="Salary / Honorarium" value={sd} icon={IndianRupee} accent="amber" />; })()}

                  {/* Salary Package */}
                  {(() => { const sp = formatSalaryPackage(job); return sp && <SidebarRow label="Salary Package" value={sp} icon={Package} />; })()}

                  {/* Recruitment Mode */}
                  <SidebarRow label="Recruitment Mode" value={job.recruitment_mode ?? 'Online'} icon={Info} />

                  {/* Onboarding fee */}
                  {job.onboarding_fee_amount > 0 && (
                    <SidebarRow label={job.fee_label_onboarding || 'Onboarding Fee'} value={`₹${job.onboarding_fee_amount.toLocaleString('en-IN')}`} icon={IndianRupee} accent="amber" />
                  )}

                  {/* Candidate-friendly status */}
                  <div className="flex items-center justify-between pt-2 border-t border-primary-100">
                    <span className="text-xs text-primary-500 font-medium">Application Status</span>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${cStatus.cls}`}>{cStatus.label}</span>
                  </div>

                  {/* Date info */}
                  {showOpenDate && (
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-2 rounded-lg">
                      <CalendarClock className="w-3.5 h-3.5 shrink-0" />
                      Applications Open On: {fmtDate(job.publish_date)}
                    </div>
                  )}
                  {showDeadline && (
                    <div className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-2 rounded-lg border ${isClosingSoon ? 'text-orange-700 bg-orange-50 border-orange-200' : 'text-primary-700 bg-primary-50 border-primary-200'}`}>
                      {isClosingSoon ? <Flame className="w-3.5 h-3.5 shrink-0 text-orange-500" /> : <CalendarClock className="w-3.5 h-3.5 shrink-0" />}
                      Last Date to Apply: {fmtDate(job.closing_date)}
                    </div>
                  )}
                  {showNeverClose && (
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-2 rounded-lg">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      Applications Open Until Further Notice
                    </div>
                  )}

                  {/* Acknowledgement progress */}
                  <div className="border-t border-primary-100 pt-2.5">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-primary-400 font-medium">Acknowledgement</span>
                      <span className={`font-bold ${acknowledged ? 'text-emerald-600' : 'text-primary-400'}`}>
                        {acknowledged ? '100%' : '0%'}
                      </span>
                    </div>
                    <div className="h-1.5 bg-primary-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: acknowledged ? '100%' : '0%' }}
                      />
                    </div>
                    <p className={`text-[11px] mt-1.5 ${acknowledged ? 'text-emerald-600 font-semibold' : 'text-primary-400'}`}>
                      {acknowledged
                        ? '✓ Ready to apply'
                        : 'Complete the mandatory acknowledgement to unlock the application form.'}
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Related Jobs */}
              {relatedJobs.length > 0 && (
                <div className="bg-white rounded-2xl border border-primary-100 shadow-card p-4">
                  <h4 className="text-[11px] font-bold text-primary-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" /> Other Openings
                  </h4>
                  <div className="space-y-1.5">
                    {relatedJobs.map(rj => (
                      <Link
                        key={rj.id}
                        to={`/careers/jobs/${rj.slug}`}
                        className="block p-2.5 rounded-xl hover:bg-primary-50 transition-colors group border border-transparent hover:border-primary-100"
                      >
                        <p className="text-sm font-semibold text-primary-800 group-hover:text-primary-600 leading-tight">{rj.title}</p>
                        {rj.location && (
                          <p className="text-xs text-primary-400 mt-0.5 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />{rj.location}
                          </p>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Mobile sticky CTA */}
              <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-primary-100 px-4 py-3 z-50 shadow-xl">
                {statusMessage ? (
                  <div className="w-full flex items-center justify-center gap-2 px-6 py-3.5 font-bold rounded-xl text-sm min-h-[48px] bg-neutral-100 text-neutral-500">
                    {job.status === 'coming_soon' && <Clock className="w-5 h-5" />}
                    {job.status === 'applications_closed' && <Ban className="w-5 h-5" />}
                    {job.status === 'filled' && <CheckCircle className="w-5 h-5" />}
                    {statusMessage}
                  </div>
                ) : (
                  <button
                    onClick={handleApply}
                    className={`w-full flex items-center justify-center gap-2 px-6 py-3.5 font-bold rounded-xl text-sm min-h-[48px] touch-manipulation transition-all ${
                      acknowledged
                        ? 'bg-primary-900 text-white hover:bg-primary-800 active:scale-[0.98]'
                        : 'bg-primary-100 text-primary-500'
                    }`}
                  >
                    <ArrowRight className="w-5 h-5" />
                    Continue to Application
                  </button>
                )}
              </div>

            </div>{/* end sidebar */}
          </div>
        </div>
      </div>

      {/* ── Validation dialog ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {showDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={e => e.target === e.currentTarget && setShowDialog(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 12 }}
              transition={{ type: 'spring', stiffness: 320, damping: 30 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
            >
              {/* Dialog header */}
              <div className="bg-amber-50 border-b border-amber-100 px-5 py-4 flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-primary-900">Action Required</h3>
                  <p className="text-xs text-primary-500 mt-0.5">Acknowledgement not completed</p>
                </div>
                <button onClick={() => setShowDialog(false)} className="text-primary-400 hover:text-primary-600 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Dialog body */}
              <div className="p-5">
                <p className="text-sm text-primary-700 leading-relaxed">
                  Please review the Project Information, Introduction Video, Job Description and Recruitment Process, then complete the acknowledgement before continuing.
                </p>
              </div>

              {/* Dialog actions */}
              <div className="px-5 pb-5">
                <button
                  onClick={scrollToAck}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-primary-900 text-white font-bold rounded-xl text-sm hover:bg-primary-800 transition-all active:scale-[0.98]"
                >
                  <ChevronDown className="w-4 h-4" /> Go to Acknowledgement
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <OTPLoginModal
        isOpen={otpOpen}
        onClose={() => setOtpOpen(false)}
        onSuccess={handleLoginSuccess}
        title="Login to Apply"
        subtitle={`Apply for ${job.title} — login with your mobile number`}
      />
    </>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionCard({
  delay = 0,
  icon,
  label,
  title,
  children,
  accent = false,
}: {
  delay?: number;
  icon: React.ReactNode;
  label: string;
  title: string;
  children: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={`bg-white rounded-2xl border shadow-card overflow-hidden ${accent ? 'border-emerald-200' : 'border-primary-100'}`}
    >
      <div className={`px-4 py-2.5 border-b flex items-center gap-2 ${accent ? 'bg-emerald-50 border-emerald-100' : 'bg-primary-50 border-primary-100'}`}>
        <span className={accent ? 'text-emerald-600' : 'text-primary-500'}>{icon}</span>
        <div>
          <p className={`text-[10px] font-bold uppercase tracking-widest ${accent ? 'text-emerald-500' : 'text-primary-400'}`}>{label}</p>
          <p className={`text-sm font-bold leading-tight ${accent ? 'text-emerald-900' : 'text-primary-900'}`}>{title}</p>
        </div>
      </div>
      <div className="p-4">{children}</div>
    </motion.div>
  );
}

function SummaryItem({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  accent?: 'amber' | 'green';
}) {
  const bg   = accent === 'amber' ? 'bg-amber-50 border-amber-200' : accent === 'green' ? 'bg-emerald-50 border-emerald-200' : 'bg-primary-50 border-primary-100';
  const iClr = accent === 'amber' ? 'text-amber-600' : accent === 'green' ? 'text-emerald-600' : 'text-primary-500';
  const lClr = accent === 'amber' ? 'text-amber-600' : accent === 'green' ? 'text-emerald-600' : 'text-primary-400';
  const vClr = accent === 'amber' ? 'text-amber-900' : accent === 'green' ? 'text-emerald-800' : 'text-primary-800';
  return (
    <div className={`flex items-start gap-2 p-2.5 rounded-xl border ${bg}`}>
      <div className="w-6 h-6 rounded-md bg-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
        <Icon className={`w-3.5 h-3.5 ${iClr}`} />
      </div>
      <div className="min-w-0">
        <p className={`text-[10px] font-semibold uppercase tracking-wide ${lClr} mb-0.5`}>{label}</p>
        <p className={`text-xs font-semibold leading-snug ${vClr}`}>{value}</p>
      </div>
    </div>
  );
}

function SidebarRow({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  accent?: 'amber' | 'green';
}) {
  const vClr = accent === 'amber' ? 'text-amber-800 font-bold' : accent === 'green' ? 'text-emerald-800 font-bold' : 'text-primary-800 font-semibold';
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="flex items-center gap-1.5 text-primary-400 shrink-0">
        <Icon className="w-3.5 h-3.5" /> {label}
      </span>
      <span className={`text-right ${vClr}`}>{value}</span>
    </div>
  );
}

function SnapshotItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-[10px] font-bold text-primary-400 uppercase tracking-wide">{label}</p>
      <p className="text-xs font-semibold text-primary-800 leading-snug">{value}</p>
    </div>
  );
}

function ResourceCard({
  icon,
  title,
  subtitle,
  badge,
  badgeColor,
  url,
  opened,
  onOpen,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  badge: string;
  badgeColor: string;
  url: string | null;
  opened: boolean;
  onOpen: () => void;
}) {
  const hasUrl = Boolean(url);
  return (
    <motion.div
      whileHover={hasUrl && !opened ? { y: -2, boxShadow: '0 6px 20px rgba(0,0,0,0.08)' } : {}}
      transition={{ duration: 0.15 }}
      className={`relative flex flex-col p-4 rounded-2xl border-2 transition-all ${
        opened
          ? 'border-emerald-300 bg-emerald-50'
          : hasUrl
          ? 'border-primary-200 bg-white hover:border-primary-300'
          : 'border-primary-100 bg-primary-50/40'
      }`}
    >
      {opened && (
        <div className="absolute top-3 right-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
        </div>
      )}
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 ${
        opened ? 'bg-emerald-100 text-emerald-600' : 'bg-primary-50 text-primary-500 border border-primary-100'
      }`}>
        {icon}
      </div>
      <div className="flex items-center gap-1.5 mb-1">
        <p className="text-sm font-bold text-primary-900 leading-snug">{title}</p>
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${badgeColor}`}>{badge}</span>
      </div>
      <p className="text-xs text-primary-500 mb-3 leading-snug flex-1">{subtitle}</p>

      {hasUrl ? (
        <button
          type="button"
          onClick={onOpen}
          className={`w-full flex items-center justify-center gap-1.5 text-xs font-semibold py-2 px-3 rounded-lg border transition-all ${
            opened
              ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
              : 'bg-primary-50 text-primary-600 border-primary-200 hover:bg-primary-100 hover:border-primary-300'
          }`}
        >
          {opened
            ? <><CheckCircle2 className="w-3.5 h-3.5" /> Reviewed</>
            : <><ExternalLink className="w-3 h-3" /> Open &amp; Review</>
          }
        </button>
      ) : (
        <span className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold py-2 px-3 rounded-lg bg-primary-50 text-primary-400 border border-primary-100">
          <Lock className="w-3 h-3" /> {url === null ? 'Available after HR upload' : 'Locked'}
        </span>
      )}
    </motion.div>
  );
}

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, MapPin, Clock, Building2, CheckCircle2,
  FileText, IndianRupee, Users, Briefcase, Calendar,
  AlertCircle, ChevronRight, ChevronDown, Play, Download,
  ListChecks, ShieldCheck, ExternalLink, Info, GraduationCap,
  CalendarClock, Package, Award, Sparkles
} from 'lucide-react';
import {
  getJobBySlug, listPublishedJobs, listJobBadges,
  listRecruitmentSteps, listJobFaqs, incrementJobViews,
  getExistingApplication
} from '../lib/api';
import { subscribeToJobUpdates } from '../lib/jobEvents';
import type {
  RmsJobPosting, RmsJobBadge, RmsRecruitmentStep,
  RmsJobFaq, RmsApplication
} from '../lib/types';
import {
  EMPLOYMENT_TYPE_LABELS, JOB_STATUS_MESSAGES,
  formatSalaryDisplay, formatSalaryPackage
} from '../lib/constants';
import { useCandidateAuth } from '../lib/CandidateAuthContext';
import { isDummyOtpMode } from '../lib/dummyOtp';
import OTPLoginModal from '../components/OTPLoginModal';
import { trackJobView } from '../../crm/lib/api';

// ─── Default Static Data ───────────────────────────────────────────────────────

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
];

const FAQ_ITEMS = [
  {
    q: 'What is the application fee for this position?',
    a: 'The application fee varies by position and is clearly mentioned on this page. Fee payment is processed securely online via our payment gateway. Positions with zero fee require no payment.',
  },
  {
    q: 'Can I apply for multiple positions at the same time?',
    a: 'Yes. You may apply for multiple positions across different projects. Each application is reviewed independently.',
  },
  {
    q: 'What is the interview format?',
    a: 'Interviews may be conducted online (video conference), offline (at a designated district coordination centre), or in a hybrid format depending on the position.',
  },
  {
    q: 'How will I be notified about my application status?',
    a: 'All official updates — including interview schedules, document verification notices, and selection results — are sent via SMS and WhatsApp to your registered mobile number.',
  },
  {
    q: 'What documents are required for document verification?',
    a: 'Typically: Aadhaar Card, PAN Card, Educational Certificates, Bank Account Details (Passbook / Cancelled Cheque), recent Passport-size Photographs, and Experience Proof where applicable.',
  },
];

export default function JobDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user, profile, verifiedMobile, setVerifiedMobile } = useCandidateAuth();

  const [job, setJob] = useState<RmsJobPosting | null>(null);
  const [loading, setLoading] = useState(true);
  const [otpOpen, setOtpOpen] = useState(false);
  const [relatedJobs, setRelatedJobs] = useState<RmsJobPosting[]>([]);
  const [badges, setBadges] = useState<RmsJobBadge[]>([]);
  const [customSteps, setCustomSteps] = useState<RmsRecruitmentStep[]>([]);
  const [customFaqs, setCustomFaqs] = useState<RmsJobFaq[]>([]);
  const [existingApp, setExistingApp] = useState<RmsApplication | null>(null);

  // Digital acknowledgement checkbox
  const [acknowledged, setAcknowledged] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [ackHighlight, setAckHighlight] = useState(false);
  const [isSubmittingDeclaration, setIsSubmittingDeclaration] = useState(false);

  // Accordion section collapse state — Sensible compact default: Section 1 (Overview) open, others collapsed
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    overview: true,
    responsibilities: false,
    eligibility: false,
    experience: false,
    documents: false,
    process: false,
  });

  // Mobile drawer state for application summary
  const [mobileSummaryOpen, setMobileSummaryOpen] = useState(false);

  // FAQ accordion
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const ackRef = useRef<HTMLDivElement>(null);
  const ackInputRef = useRef<HTMLInputElement>(null);

  // ── Load Job & Metadata ─────────────────────────────────────────────────────
  const loadJobData = useCallback((targetSlug?: string) => {
    const s = targetSlug || slug;
    if (!s) return;
    Promise.all([getJobBySlug(s), listPublishedJobs()]).then(([j, all]) => {
      const jobData = j.data;
      setJob(jobData);
      setRelatedJobs((all.data || []).filter(r => r.slug !== s).slice(0, 3));
      setLoading(false);
      if (jobData?.id) {
        Promise.all([
          listJobBadges(jobData.id),
          listRecruitmentSteps(jobData.id),
          listJobFaqs(jobData.id),
        ]).then(([b, sSteps, f]) => {
          setBadges((b.data || []).filter(x => x.enabled));
          setCustomSteps((sSteps.data || []).filter(x => x.enabled));
          setCustomFaqs((f.data || []).filter(x => x.enabled));
        });
      }
    });
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    loadJobData();

    // Invalidate & refresh immediately when this job (or any job) is updated in Admin
    const unsubscribe = subscribeToJobUpdates(detail => {
      if (detail.slug && detail.slug !== slug && job?.id && detail.jobId === job.id) {
        // HR updated the job title/slug — navigate smoothly to the new slug
        navigate(`/careers/jobs/${detail.slug}`, { replace: true });
      } else if (!detail.slug || detail.slug === slug || (job?.id && detail.jobId === job.id)) {
        loadJobData();
      } else {
        // Another job was updated; refresh related jobs list
        listPublishedJobs().then(all => {
          setRelatedJobs((all.data || []).filter(r => r.slug !== slug).slice(0, 3));
        });
      }
    });

    // Invalidate & refresh whenever user switches back to this tab
    const handleFocus = () => loadJobData();
    const handleVisibility = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        loadJobData();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      unsubscribe();
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [slug, loadJobData, navigate, job?.id]);

  // Check if current authenticated candidate has an existing active application
  useEffect(() => {
    const activeMobile = (verifiedMobile || user?.phone || '').replace(/\D/g, '').slice(-10);
    const profileMobile = (profile?.mobile || '').replace(/\D/g, '').slice(-10);

    if (profile?.id && job?.id && (!activeMobile || profileMobile === activeMobile)) {
      getExistingApplication(profile.id, job.id)
        .then(res => {
          if (res.data && !res.data.is_trashed) {
            setExistingApp(res.data);
          } else {
            setExistingApp(null);
          }
        })
        .catch(() => setExistingApp(null));
    } else {
      setExistingApp(null);
    }
  }, [profile?.id, profile?.mobile, job?.id, verifiedMobile, user?.phone]);

  // View tracking
  useEffect(() => {
    if (job?.id) {
      incrementJobViews(job.id);
      if (user?.id) {
        trackJobView(user.id, job.id, user.id, user.phone || profile?.mobile).catch(() => {});
      }
    }
  }, [job?.id, user?.id, user?.phone, profile?.mobile]);

  // Status checks
  const isClosed = !job || ['coming_soon', 'applications_closed', 'filled', 'hidden', 'draft', 'archived'].includes(job.status);
  const statusMessage = job ? JOB_STATUS_MESSAGES[job.status] : null;

  // Core application navigation & auth progression logic
  const proceedToApplication = useCallback(() => {
    if (!job?.id) return;
    if (existingApp && !existingApp.is_trashed) {
      if (['interview_slot_pending', 'interview_scheduled'].includes(existingApp.status)) {
        navigate('/candidate/interviews');
      } else {
        navigate('/candidate/applications');
      }
      return;
    }
    if (isClosed) return;

    if (user?.id || (isDummyOtpMode() && verifiedMobile)) {
      navigate(`/careers/portal/apply/${job.id}`);
      return;
    }

    setOtpOpen(true);
  }, [existingApp, isClosed, navigate, user?.id, verifiedMobile, job?.id]);

  const handleApply = useCallback(() => {
    if (existingApp && !existingApp.is_trashed) {
      if (['interview_slot_pending', 'interview_scheduled'].includes(existingApp.status)) {
        navigate('/candidate/interviews');
      } else {
        navigate('/candidate/applications');
      }
      return;
    }
    if (isClosed) return;
    if (!acknowledged) {
      setShowDialog(true);
      return;
    }

    proceedToApplication();
  }, [existingApp, isClosed, acknowledged, proceedToApplication]);

  const handleAcceptDeclaration = useCallback(() => {
    if (isSubmittingDeclaration) return;
    setIsSubmittingDeclaration(true);
    setAcknowledged(true);
    setShowDialog(false);
    proceedToApplication();
    setTimeout(() => {
      setIsSubmittingDeclaration(false);
    }, 300);
  }, [isSubmittingDeclaration, proceedToApplication]);

  const handleLoginSuccess = (_isNewUser?: boolean, mobile?: string) => {
    setOtpOpen(false);
    setExistingApp(null);
    if (mobile) {
      const clean = mobile.replace(/\D/g, '').slice(-10);
      setVerifiedMobile(clean);
    }
    navigate(`/careers/portal/apply/${job?.id}`);
  };

  const toggleSection = (key: string) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const expandAll = () => {
    setOpenSections({
      overview: true,
      responsibilities: true,
      eligibility: true,
      experience: true,
      documents: true,
      process: true,
    });
  };

  const collapseAll = () => {
    setOpenSections({
      overview: false,
      responsibilities: false,
      eligibility: false,
      experience: false,
      documents: false,
      process: false,
    });
  };

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-slate-50">
        <div className="animate-spin w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 bg-slate-50 p-6">
        <AlertCircle className="w-12 h-12 text-slate-400" />
        <h2 className="text-xl font-bold text-slate-900">Position Not Found</h2>
        <p className="text-sm text-slate-600">The requested job opening does not exist or has been archived.</p>
        <Link to="/careers" className="inline-flex items-center gap-2 px-4 py-2 bg-primary-900 text-white rounded-xl text-sm font-bold hover:bg-primary-800 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Browse All Openings
        </Link>
      </div>
    );
  }

  // ── Derived data ───────────────────────────────────────────────────────────
  const rawEligibility = Array.isArray(job.eligibility_criteria) ? job.eligibility_criteria : [];
  const eligibility = rawEligibility.map((c: unknown) => {
    if (typeof c === 'string') return { label: c, required: true };
    if (typeof c === 'object' && c !== null) {
      const obj = c as Record<string, unknown>;
      return {
        label: String(obj.label || obj.criterion || obj.text || ''),
        required: obj.required !== false,
      };
    }
    return { label: String(c || ''), required: true };
  }).filter(c => c.label.trim().length > 0);

  const rawDocs = Array.isArray(job.required_documents) ? job.required_documents : [];
  const documents = rawDocs.map((doc: unknown) => {
    if (typeof doc === 'string') return { key: doc.toLowerCase().replace(/\s+/g, '_'), label: doc, description: undefined };
    if (typeof doc === 'object' && doc !== null) {
      const obj = doc as Record<string, unknown>;
      return {
        key: String(obj.key || obj.label || '').toLowerCase().replace(/\s+/g, '_'),
        label: String(obj.label || obj.name || obj.title || ''),
        description: obj.description ? String(obj.description) : undefined,
      };
    }
    return { key: '', label: String(doc || ''), description: undefined };
  }).filter(d => d.label.trim().length > 0);

  const ageCriteria = (job.min_age && job.max_age)
    ? `${job.min_age}–${job.max_age} Years`
    : job.min_age
    ? `Min ${job.min_age} Years`
    : job.max_age
    ? `Max ${job.max_age} Years`
    : '21–40 Years';

  const now = new Date();
  const closingDate = job.closing_date ? new Date(job.closing_date) : null;
  const msToClose = closingDate ? closingDate.getTime() - now.getTime() : null;
  const daysToClose = msToClose != null && msToClose > 0 ? Math.ceil(msToClose / (1000 * 60 * 60 * 24)) : null;
  const isClosingSoon = daysToClose != null && daysToClose <= 3;

  const candidateStatus = () => {
    if (job.status === 'filled') return { label: 'Position Filled', cls: 'bg-slate-100 text-slate-700 border-slate-200' };
    if (job.status === 'applications_closed') return { label: 'Applications Closed', cls: 'bg-red-50 text-red-700 border-red-200' };
    if (job.status === 'coming_soon') return { label: 'Coming Soon', cls: 'bg-blue-50 text-blue-700 border-blue-200' };
    if (isClosingSoon) return { label: `Closing Soon (${daysToClose}d left)`, cls: 'bg-amber-50 text-amber-800 border-amber-200' };
    return { label: 'Open for Applications', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
  };
  const cStatus = candidateStatus();

  const isFree = Number(job.application_fee_amount ?? 0) === 0;
  const isDistrictLevel = job.vacancy_level === 'district' || job.vacancy_allocations?.vacancy_level === 'district';

  const activeSteps = customSteps.length > 0
    ? customSteps.map(s => ({ label: s.label, desc: s.description ?? '' }))
    : isFree
    ? SELECTION_STEPS.filter(s => s.label !== 'Application Fee')
    : SELECTION_STEPS;

  const activeFaqs = customFaqs.length > 0
    ? customFaqs.map(f => ({ q: f.question, a: f.answer }))
    : isFree
    ? FAQ_ITEMS.map(item =>
        item.q.toLowerCase().includes('application fee')
          ? { q: item.q, a: 'There is no application fee for this position. Applying is completely free of cost.' }
          : item
      )
    : FAQ_ITEMS;

  const hasProjectPdf = job.project_pdf_enabled !== false && Boolean(job.project_pdf_url?.trim());
  const hasProjectVideo = job.project_video_enabled !== false && Boolean(job.project_video_url?.trim());
  const hasJdPdf = job.jd_pdf_enabled !== false && Boolean(job.jd_pdf_url?.trim());
  const experienceDetails = ((job.experience_details || job.vacancy_allocations?.experience_details || '') as string).trim();

  const allExpanded = Object.values(openSections).every(Boolean);

  const topQualification = eligibility[0]?.label?.trim() || 'Degree / Diploma in relevant discipline';

  return (
    <div className="bg-slate-50 min-h-screen text-slate-900 pb-28 lg:pb-16">

      {/* ── BREADCRUMB STRIP ─────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200">
        <div className="container-government py-2.5">
          <div className="flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-slate-500 truncate">
              <Link to="/" className="hover:text-primary-700 transition-colors">Home</Link>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <Link to="/careers" className="hover:text-primary-700 transition-colors">Careers</Link>
              {job.department && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="text-slate-500 truncate">{job.department}</span>
                </>
              )}
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="font-semibold text-slate-800 truncate">{job.title}</span>
            </div>
            <Link
              to="/careers"
              className="inline-flex items-center gap-1 text-primary-700 hover:text-primary-900 font-semibold shrink-0 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> All Openings
            </Link>
          </div>
        </div>
      </div>

      {/* ── COMPACT HERO SUMMARY BANNER ──────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 shadow-2xs">
        <div className="container-government py-5 md:py-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="space-y-2 flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                {job.department && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-50 text-primary-800 border border-primary-200 uppercase tracking-wider">
                    {job.department}
                  </span>
                )}
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${cStatus.cls}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  {cStatus.label}
                </span>
                {badges.map(b => (
                  <span key={b.id} className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                    {b.label}
                  </span>
                ))}
              </div>

              <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
                {job.title}
              </h1>

              {/* Inline Metadata Row */}
              <div className="flex flex-wrap items-center gap-y-1.5 gap-x-4 text-xs sm:text-sm text-slate-600 pt-0.5">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                  <strong className="text-slate-800 font-semibold">{job.location || 'Maharashtra'}</strong>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{job.employment_type ? EMPLOYMENT_TYPE_LABELS[job.employment_type] : 'Full-time'}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 text-emerald-700 font-bold">
                  <IndianRupee className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{formatSalaryDisplay(job)}</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{job.total_vacancies ? `${job.total_vacancies} Vacancies` : job.vacancies_count ? `${job.vacancies_count} Vacancies` : 'Multiple Openings'}</span>
                </span>
                {closingDate && !job.never_close_applications && (
                  <span className={`inline-flex items-center gap-1.5 font-semibold ${isClosingSoon ? 'text-amber-700' : 'text-slate-600'}`}>
                    <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>Last Date: {closingDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Header Action Button (Desktop) */}
            <div className="hidden lg:flex shrink-0 items-center gap-3">
              {existingApp && !existingApp.is_trashed ? (
                <button
                  type="button"
                  onClick={handleApply}
                  className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-sm transition-colors flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  View Application Status
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleApply}
                  disabled={isClosed}
                  className="px-7 py-3 rounded-xl bg-primary-900 hover:bg-primary-800 disabled:bg-slate-300 text-white font-bold text-sm shadow-sm hover:shadow-md transition-all flex items-center gap-2 group cursor-pointer disabled:cursor-not-allowed"
                >
                  <span>Apply Now</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT CONTAINER ───────────────────────────────────────────── */}
      <div className="container-government py-6">

        {/* ── 1. STATIC JOB HIGHLIGHTS STRIP (No flip cards, immediate info) ─── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">

          {/* Highlight 1: Salary & Remuneration */}
          <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-2xs flex flex-col justify-between transition-shadow hover:shadow-xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">Salary / Remuneration</span>
              <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                <IndianRupee className="w-3.5 h-3.5" />
              </div>
            </div>
            <div>
              <div className="text-sm sm:text-base font-extrabold text-emerald-800 leading-tight">
                {formatSalaryDisplay(job)}
              </div>
              <p className="text-[11px] text-slate-500 mt-1 line-clamp-1 font-medium" title={formatSalaryPackage(job) || undefined}>
                {formatSalaryPackage(job) || (job.salary_type ? `Frequency: ${job.salary_type}` : 'Monthly Disbursement')}
              </p>
            </div>
          </div>

          {/* Highlight 2: Total Vacancies & Scope */}
          <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-2xs flex flex-col justify-between transition-shadow hover:shadow-xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Vacancies</span>
              <div className="w-6 h-6 rounded-md bg-primary-50 text-primary-800 flex items-center justify-center shrink-0">
                <Users className="w-3.5 h-3.5" />
              </div>
            </div>
            <div>
              <div className="text-sm sm:text-base font-extrabold text-slate-900 leading-tight">
                {job.total_vacancies != null ? `${job.total_vacancies.toLocaleString('en-IN')} Posts` : job.vacancies_count ? `${job.vacancies_count} Posts` : 'Multiple Posts'}
              </div>
              <p className="text-[11px] text-slate-500 mt-1 line-clamp-1 font-medium">
                {isDistrictLevel ? 'District-Level Quota' : 'Taluka-Level Quota'}
              </p>
            </div>
          </div>

          {/* Highlight 3: Experience & Age Criteria */}
          <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-2xs flex flex-col justify-between transition-shadow hover:shadow-xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">Experience & Age</span>
              <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                <Clock className="w-3.5 h-3.5" />
              </div>
            </div>
            <div>
              <div className="text-sm sm:text-base font-extrabold text-slate-900 leading-tight truncate">
                {job.experience_required || '0 to 2 Years'}
              </div>
              <p className="text-[11px] text-slate-500 mt-1 line-clamp-1 font-medium">
                Age: {ageCriteria}
              </p>
            </div>
          </div>

          {/* Highlight 4: Education Qualification */}
          <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-2xs flex flex-col justify-between transition-shadow hover:shadow-xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">Qualification</span>
              <div className="w-6 h-6 rounded-md bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
                <GraduationCap className="w-3.5 h-3.5" />
              </div>
            </div>
            <div>
              <div className="text-sm sm:text-base font-extrabold text-slate-900 leading-tight truncate" title={topQualification}>
                {topQualification}
              </div>
              <p className="text-[11px] text-slate-500 mt-1 line-clamp-1 font-medium">
                {eligibility.length > 1 ? `+${eligibility.length - 1} more criteria` : 'Standard Criteria'}
              </p>
            </div>
          </div>

          {/* Highlight 5: Application Fee & Mode */}
          <div className="col-span-2 sm:col-span-1 bg-white rounded-xl p-3.5 border border-slate-200 shadow-2xs flex flex-col justify-between transition-shadow hover:shadow-xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">Application Fee</span>
              <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${isFree ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </div>
            <div>
              <div className={`text-sm sm:text-base font-extrabold leading-tight ${isFree ? 'text-emerald-700' : 'text-slate-900'}`}>
                {isFree ? 'Free of Cost' : `₹${job.application_fee_amount}`}
              </div>
              <p className="text-[11px] text-slate-500 mt-1 line-clamp-1 font-medium">
                {job.recruitment_mode ? `${job.recruitment_mode} Process` : 'Online Application'}
              </p>
            </div>
          </div>

        </div>

        {/* ── 2-COLUMN RESPONSIVE LAYOUT ───────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

          {/* ══ LEFT COLUMN: COMPACT ACCORDIONS ══ */}
          <div className="lg:col-span-2 space-y-3.5 min-w-0">

            {/* Global Accordion Control */}
            <div className="flex items-center justify-between pb-1">
              <h2 className="text-xs sm:text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary-600" />
                Position Specifications & Details
              </h2>
              <button
                type="button"
                onClick={allExpanded ? collapseAll : expandAll}
                className="text-xs font-semibold text-primary-700 hover:text-primary-900 underline transition-colors"
              >
                {allExpanded ? 'Collapse All' : 'Expand All'}
              </button>
            </div>

            {/* SECTION 1: JOB OVERVIEW & DISTRICT ALLOCATIONS */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
              <button
                type="button"
                onClick={() => toggleSection('overview')}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50/70 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary-100 text-primary-800 flex items-center justify-center shrink-0">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900">1. Job Overview & District Allocations</h3>
                    <p className="text-xs text-slate-500">Project scope, eligible districts, and orientation resources</p>
                  </div>
                </div>
                <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-200 shrink-0 ${openSections.overview ? 'rotate-180' : ''}`} />
              </button>

              {openSections.overview && (
                <div className="px-5 pb-5 pt-1 border-t border-slate-100 space-y-4 text-sm text-slate-700">
                  {job.project_overview?.trim() ? (
                    <div>
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Project Overview</h4>
                      <p className="leading-relaxed bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-slate-800 text-xs sm:text-sm">
                        {job.project_overview.trim()}
                      </p>
                    </div>
                  ) : null}

                  {/* District / Taluka Allocation Summary */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Eligible Posting Locations ({Array.isArray(job.location_districts) ? job.location_districts.length : 0} Districts)
                    </h4>
                    {Array.isArray(job.location_districts) && job.location_districts.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {job.location_districts.map(d => (
                          <span key={d} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200">
                            <MapPin className="w-3 h-3 text-slate-500" />
                            {d}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">Open across all administrative districts in Maharashtra.</p>
                    )}
                  </div>

                  {/* Project PDF & Video Resources */}
                  {(hasProjectPdf || hasProjectVideo) && (
                    <div className="pt-2 border-t border-slate-100">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Project Brief Resources</h4>
                      <div className="flex flex-wrap gap-2.5">
                        {hasProjectPdf && (
                          <a
                            href={job.project_pdf_url!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 transition-colors"
                          >
                            <FileText className="w-4 h-4 text-red-600" />
                            <span>Download Project Blueprint (PDF)</span>
                            <ExternalLink className="w-3 h-3 text-slate-400" />
                          </a>
                        )}
                        {hasProjectVideo && (
                          <a
                            href={job.project_video_url!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 transition-colors"
                          >
                            <Play className="w-4 h-4 text-blue-600" />
                            <span>Watch Project Walkthrough</span>
                            <ExternalLink className="w-3 h-3 text-slate-400" />
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* SECTION 2: ROLES & RESPONSIBILITIES */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
              <button
                type="button"
                onClick={() => toggleSection('responsibilities')}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50/70 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900">2. Roles & Responsibilities</h3>
                    <p className="text-xs text-slate-500">Core duties, key deliverables, and official JD document</p>
                  </div>
                </div>
                <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-200 shrink-0 ${openSections.responsibilities ? 'rotate-180' : ''}`} />
              </button>

              {openSections.responsibilities && (
                <div className="px-5 pb-5 pt-1 border-t border-slate-100 space-y-4 text-sm text-slate-700">
                  {hasJdPdf && (
                    <div className="flex items-center justify-between gap-3 p-3 bg-primary-50/60 rounded-lg border border-primary-100">
                      <div className="flex items-center gap-2.5">
                        <FileText className="w-5 h-5 text-primary-700 shrink-0" />
                        <div>
                          <div className="text-xs font-bold text-primary-900">Official Job Description Document (PDF)</div>
                          <div className="text-[11px] text-primary-600">Complete verified notification and guidelines</div>
                        </div>
                      </div>
                      <a
                        href={job.jd_pdf_url!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-900 text-white rounded-lg text-xs font-bold hover:bg-primary-800 transition-colors shrink-0"
                      >
                        <Download className="w-3.5 h-3.5" /> Download
                      </a>
                    </div>
                  )}

                  {job.description?.trim() ? (
                    <div className="whitespace-pre-wrap leading-relaxed text-slate-800 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs sm:text-sm font-sans">
                      {job.description.trim()}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">Official job responsibilities will be provided during induction.</p>
                  )}
                </div>
              )}
            </div>

            {/* SECTION 3: ELIGIBILITY & QUALIFICATIONS */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
              <button
                type="button"
                onClick={() => toggleSection('eligibility')}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50/70 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900">3. Eligibility & Qualifications</h3>
                    <p className="text-xs text-slate-500">Education requirements, skills, and minimum prerequisites</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                    {eligibility.length} Criteria
                  </span>
                  <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-200 shrink-0 ${openSections.eligibility ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {openSections.eligibility && (
                <div className="px-5 pb-5 pt-1 border-t border-slate-100 space-y-4 text-sm text-slate-700">
                  {eligibility.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {eligibility.map((c, i) => (
                        <div key={i} className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                          <div className="min-w-0">
                            <span className="text-xs font-semibold text-slate-800 leading-snug">{c.label}</span>
                            {c.required && (
                              <span className="ml-2 text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.2 rounded">
                                Mandatory
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">Standard educational qualifications as per project rules.</p>
                  )}

                  {/* Skills tags */}
                  {job.skills_required && job.skills_required.length > 0 && (
                    <div className="pt-2 border-t border-slate-100">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Recommended Skills</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {job.skills_required.map((skill, i) => (
                          <span key={i} className="px-2.5 py-1 rounded-md text-xs font-semibold bg-primary-50 text-primary-900 border border-primary-200">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* SECTION 4: EXPERIENCE & WORK PROFILE */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
              <button
                type="button"
                onClick={() => toggleSection('experience')}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50/70 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900">4. Experience & Work Profile</h3>
                    <p className="text-xs text-slate-500">Domain experience, field parameters, and licensing</p>
                  </div>
                </div>
                <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-200 shrink-0 ${openSections.experience ? 'rotate-180' : ''}`} />
              </button>

              {openSections.experience && (
                <div className="px-5 pb-5 pt-1 border-t border-slate-100 space-y-3.5 text-sm text-slate-700">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <span className="text-slate-400 block mb-0.5">Required Experience</span>
                      <span className="font-bold text-slate-800 text-sm">{job.experience_required || '0 to 2 Year Experience'}</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <span className="text-slate-400 block mb-0.5">Permissible Age Range</span>
                      <span className="font-bold text-slate-800 text-sm">{ageCriteria}</span>
                    </div>
                  </div>

                  {experienceDetails ? (
                    <div>
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Profile Context</h4>
                      <p className="leading-relaxed bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-slate-800 text-xs sm:text-sm">
                        {experienceDetails}
                      </p>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            {/* SECTION 5: DOCUMENTS REQUIRED */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
              <button
                type="button"
                onClick={() => toggleSection('documents')}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50/70 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900">5. Documents Required</h3>
                    <p className="text-xs text-slate-500">Original and copy certificates needed during onboarding</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                    {documents.length > 0 ? `${documents.length} Items` : 'Standard'}
                  </span>
                  <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-200 shrink-0 ${openSections.documents ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {openSections.documents && (
                <div className="px-5 pb-5 pt-1 border-t border-slate-100 space-y-3 text-sm text-slate-700">
                  <p className="text-xs text-slate-500">
                    Candidates must carry authentic original documents along with one set of self-attested photocopies:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(documents.length > 0 ? documents : [
                      { label: 'Aadhaar Card (Identity & Address Proof)' },
                      { label: 'PAN Card' },
                      { label: 'Highest Education Degree / Marksheet' },
                      { label: 'Bank Account Passbook / Cancelled Cheque' },
                      { label: '2 Passport Size Photographs' },
                      { label: 'Experience Certificate (if applicable)' },
                    ]).map((doc, idx) => (
                      <div key={idx} className="flex items-center gap-2.5 p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                        <FileText className="w-4 h-4 text-purple-600 shrink-0" />
                        <span className="font-semibold text-slate-800">{doc.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 6: RECRUITMENT PROCESS & FAQS */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
              <button
                type="button"
                onClick={() => toggleSection('process')}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50/70 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
                    <ListChecks className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900">6. Recruitment Process & FAQs</h3>
                    <p className="text-xs text-slate-500">Candidate hiring journey, timelines, and frequent questions</p>
                  </div>
                </div>
                <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-200 shrink-0 ${openSections.process ? 'rotate-180' : ''}`} />
              </button>

              {openSections.process && (
                <div className="px-5 pb-5 pt-1 border-t border-slate-100 space-y-5 text-sm text-slate-700">
                  {/* Process Roadmap */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Recruitment Roadmap</h4>
                    <div className="space-y-2">
                      {activeSteps.map((s, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                          <span className="w-6 h-6 rounded-full bg-primary-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <div>
                            <div className="text-xs font-bold text-slate-900">{s.label}</div>
                            <div className="text-[11px] text-slate-500 mt-0.5">{s.desc}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Frequently Asked Questions */}
                  <div className="pt-3 border-t border-slate-100">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">Frequently Asked Questions</h4>
                    <div className="space-y-1.5">
                      {activeFaqs.map((faq, idx) => (
                        <div key={idx} className="border border-slate-200 rounded-lg overflow-hidden">
                          <button
                            type="button"
                            onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                            className="w-full flex items-center justify-between p-3 text-left text-xs font-bold text-slate-800 hover:bg-slate-50 transition-colors"
                          >
                            <span>{faq.q}</span>
                            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${openFaq === idx ? 'rotate-180' : ''}`} />
                          </button>
                          {openFaq === idx && (
                            <div className="px-3 pb-3 text-xs text-slate-600 bg-slate-50/50 border-t border-slate-100 leading-relaxed">
                              {faq.a}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* ══ RIGHT COLUMN: APPLICATION SUMMARY SIDEBAR ══ */}
          <div className="lg:col-span-1 space-y-4 lg:sticky lg:top-[185px]">

            {/* Mobile collapsible toggle for Application Summary */}
            <div className="lg:hidden">
              <button
                type="button"
                onClick={() => setMobileSummaryOpen(!mobileSummaryOpen)}
                className="w-full flex items-center justify-between p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs text-xs font-bold text-slate-800"
              >
                <span className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-primary-700" />
                  Application Summary & Verification Specs
                </span>
                <span className="flex items-center gap-1 text-primary-700 font-semibold">
                  {mobileSummaryOpen ? 'Hide' : 'View Summary'}
                  <ChevronDown className={`w-4 h-4 transition-transform ${mobileSummaryOpen ? 'rotate-180' : ''}`} />
                </span>
              </button>
            </div>

            {/* Main Application Summary Card */}
            <div className={`${mobileSummaryOpen ? 'block' : 'hidden lg:block'} bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden`}>

              {/* Card Header */}
              <div className="bg-primary-900 px-4 py-3.5 text-white">
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary-200 mb-0.5">Application Summary</p>
                <h3 className="text-sm font-bold leading-snug line-clamp-2">{job.title}</h3>
                {job.department && (
                  <p className="text-xs text-primary-200 mt-0.5">{job.department}</p>
                )}
                <div className="mt-2.5 flex items-center justify-between">
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${cStatus.cls}`}>
                    {cStatus.label}
                  </span>
                  {closingDate && !job.never_close_applications && (
                    <span className="text-[11px] text-primary-200 font-medium">
                      Last: {closingDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </span>
                  )}
                </div>
              </div>

              {/* Spec Rows */}
              <div className="p-4 space-y-2.5">

                {/* Application Fee */}
                {job.application_fee_amount != null && (
                  <SidebarRow
                    icon={IndianRupee}
                    label="Application Fee"
                    value={job.application_fee_amount === 0 ? 'Free of Cost' : `₹${job.application_fee_amount.toLocaleString('en-IN')}`}
                    accent={job.application_fee_amount > 0 ? 'amber' : 'green'}
                  />
                )}

                {/* Employment Type */}
                {job.employment_type && (
                  <SidebarRow
                    icon={Briefcase}
                    label="Employment Type"
                    value={EMPLOYMENT_TYPE_LABELS[job.employment_type] || job.employment_type}
                  />
                )}

                {/* Experience */}
                {job.experience_required?.trim() ? (
                  <SidebarRow
                    icon={Clock}
                    label="Experience Required"
                    value={job.experience_required.trim()}
                  />
                ) : null}

                {/* Qualification */}
                {topQualification ? (
                  <SidebarRow
                    icon={Info}
                    label="Qualification"
                    value={topQualification}
                  />
                ) : null}

                {/* Age Criteria */}
                {ageCriteria && (
                  <SidebarRow
                    icon={Calendar}
                    label="Age Criteria"
                    value={ageCriteria}
                  />
                )}

                {/* Total Vacancies */}
                {job.total_vacancies != null ? (
                  <SidebarRow
                    icon={Users}
                    label="Total Vacancies"
                    value={`${job.total_vacancies.toLocaleString('en-IN')} Vacancies`}
                  />
                ) : job.vacancies_count ? (
                  <SidebarRow
                    icon={Users}
                    label="Total Vacancies"
                    value={`${job.vacancies_count} Vacancies`}
                  />
                ) : null}

                {/* District / Taluka Quota Scope */}
                <SidebarRow
                  icon={MapPin}
                  label="Quota Scope"
                  value={isDistrictLevel ? 'District-Level Quota' : 'Taluka-Level Quota'}
                  accent="green"
                />

                {/* Vacancies Per District */}
                {job.vacancies_per_district != null && job.vacancies_per_district > 0 && (
                  <SidebarRow
                    icon={MapPin}
                    label="Per District"
                    value={`${job.vacancies_per_district.toLocaleString('en-IN')} Vacancies`}
                  />
                )}

                {/* Vacancies Per Taluka */}
                {!isDistrictLevel && job.vacancies_per_taluka != null && job.vacancies_per_taluka > 0 && (
                  <SidebarRow
                    icon={MapPin}
                    label="Per Taluka"
                    value={`${job.vacancies_per_taluka.toLocaleString('en-IN')} ${job.vacancies_per_taluka === 1 ? 'Vacancy' : 'Vacancies'}`}
                  />
                )}

                {/* Salary / Remuneration */}
                {(() => {
                  const sd = formatSalaryDisplay(job);
                  return sd ? <SidebarRow icon={IndianRupee} label="Salary / Remuneration" value={sd} accent="amber" /> : null;
                })()}

                {/* Salary Package */}
                {(() => {
                  const sp = formatSalaryPackage(job);
                  return sp ? <SidebarRow icon={Package} label="Salary Package" value={sp} /> : null;
                })()}

                {/* Recruitment Mode */}
                {job.recruitment_mode?.trim() ? (
                  <SidebarRow
                    icon={Info}
                    label="Recruitment Mode"
                    value={job.recruitment_mode.trim()}
                  />
                ) : null}

                {/* Selection Mode */}
                <SidebarRow
                  icon={Award}
                  label="Selection Mode"
                  value="Online & District Interview"
                />

                {/* Deadline Notice */}
                {closingDate && !job.never_close_applications && (
                  <div className={`mt-2 p-2.5 rounded-lg border text-xs flex items-center gap-2 ${
                    isClosingSoon ? 'bg-amber-50 text-amber-900 border-amber-200' : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}>
                    <CalendarClock className="w-4 h-4 shrink-0 text-slate-500" />
                    <div className="min-w-0">
                      <span className="font-bold block truncate">
                        Last Date: {closingDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                      <span className="text-[11px] text-slate-500">{isClosingSoon ? `Hurry! Only ${daysToClose} days left` : 'Applications currently active'}</span>
                    </div>
                  </div>
                )}

                {/* Acknowledgement Checkbox */}
                <div className="pt-3 border-t border-slate-100">
                  {existingApp && !existingApp.is_trashed ? (
                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800">
                      <div className="font-bold flex items-center gap-1.5 mb-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Application Submitted
                      </div>
                      <p className="text-[11px] text-emerald-700">
                        Application ID: <strong>{existingApp.application_number || 'Under Review'}</strong>
                      </p>
                    </div>
                  ) : (
                    <div
                      ref={ackRef}
                      className={`p-3 rounded-xl border transition-all ${
                        ackHighlight ? 'ring-2 ring-amber-400 bg-amber-50/80 border-amber-300' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <label className="flex items-start gap-2.5 cursor-pointer">
                        <input
                          ref={ackInputRef}
                          type="checkbox"
                          checked={acknowledged}
                          onChange={e => setAcknowledged(e.target.checked)}
                          className="w-4 h-4 rounded text-primary-900 focus:ring-primary-500 mt-0.5 border-slate-300 shrink-0"
                        />
                        <span className="text-xs text-slate-700 leading-snug select-none font-medium">
                          I have reviewed the eligibility criteria, responsibilities, and terms for this position.
                        </span>
                      </label>
                    </div>
                  )}
                </div>

                {/* Primary Action Button */}
                <div className="pt-1">
                  {existingApp && !existingApp.is_trashed ? (
                    <button
                      type="button"
                      onClick={handleApply}
                      className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      View Application Status
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleApply}
                      disabled={isClosed}
                      className="w-full py-3.5 px-4 rounded-xl bg-primary-900 hover:bg-primary-800 disabled:bg-slate-300 text-white font-bold text-sm shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 group cursor-pointer disabled:cursor-not-allowed"
                    >
                      <span>{isClosed ? 'Applications Closed' : 'Apply Now'}</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                  )}
                </div>

              </div>
            </div>

            {/* Other Openings Widget */}
            {relatedJobs.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Other Open Positions</div>
                <div className="divide-y divide-slate-100">
                  {relatedJobs.map(rj => (
                    <Link
                      key={rj.id}
                      to={`/careers/jobs/${rj.slug}`}
                      className="block py-2.5 first:pt-0 last:pb-0 group"
                    >
                      <div className="text-xs font-bold text-slate-900 group-hover:text-primary-700 transition-colors line-clamp-1">
                        {rj.title}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                        <span>{rj.department || 'MAHA-AGRI'}</span>
                        <span>•</span>
                        <span>{formatSalaryDisplay(rj)}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

          </div>

        </div>

      </div>

      {/* ── MOBILE STICKY BOTTOM BAR ─────────────────────────────────────────── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 px-4 py-2.5 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-lg flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-bold text-slate-900 truncate">{job.title}</div>
          <div className="text-[11px] text-emerald-700 font-semibold">{isFree ? 'Free Application' : `Fee: ₹${job.application_fee_amount}`}</div>
        </div>
        <button
          type="button"
          onClick={handleApply}
          disabled={isClosed}
          className="shrink-0 px-5 py-2.5 min-h-[44px] rounded-xl bg-primary-900 hover:bg-primary-800 disabled:bg-slate-300 text-white font-bold text-xs shadow-sm transition-colors flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
        >
          {existingApp && !existingApp.is_trashed ? 'View Status' : isClosed ? 'Closed' : 'Apply Now'}
        </button>
      </div>

      {/* ── VALIDATION DIALOG MODAL ──────────────────────────────────────────── */}
      <AnimatePresence>
        {showDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-center border border-slate-200"
            >
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-6 h-6 text-amber-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Declaration Required</h3>
              <p className="text-xs text-slate-600 mb-6 leading-relaxed">
                Please confirm that you have reviewed the eligibility criteria, responsibilities, and guidelines for this position before proceeding.
              </p>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowDialog(false)}
                  className="flex-1 py-2.5 px-4 min-h-[44px] border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmittingDeclaration}
                  onClick={handleAcceptDeclaration}
                  className="flex-1 py-2.5 px-4 min-h-[44px] bg-primary-900 text-white font-bold rounded-xl hover:bg-primary-800 disabled:opacity-60 disabled:cursor-not-allowed text-xs transition-colors shadow-sm cursor-pointer"
                >
                  Accept &amp; Continue
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── OTP LOGIN MODAL ─────────────────────────────────────────────────── */}
      <OTPLoginModal
        isOpen={otpOpen}
        onClose={() => setOtpOpen(false)}
        onSuccess={handleLoginSuccess}
        title="Candidate Login to Apply"
        subtitle={`Please log in to submit your application for ${job.title}`}
      />

    </div>
  );
}

// ─── Compact Sidebar Key-Value Row ─────────────────────────────────────────────

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
  const vClr = accent === 'amber' ? 'text-amber-800 font-bold' : accent === 'green' ? 'text-emerald-800 font-bold' : 'text-slate-800 font-semibold';
  return (
    <div className="flex items-center justify-between gap-2 text-xs py-1 border-b border-slate-100 last:border-0">
      <span className="flex items-center gap-1.5 text-slate-500 shrink-0">
        <Icon className="w-3.5 h-3.5 text-slate-400" /> {label}
      </span>
      <span className={`text-right line-clamp-1 ${vClr}`} title={value}>{value}</span>
    </div>
  );
}

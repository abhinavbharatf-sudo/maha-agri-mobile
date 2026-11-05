import { useState, useEffect } from 'react';
import {
  X, Building2, Briefcase, MapPin, Users, IndianRupee,
  Clock, GraduationCap, Calendar, CheckCircle2,
  ChevronDown, FileText, ShieldCheck, ListChecks, Play,
  Download, ExternalLink, Info, CalendarClock, Package, Award
} from 'lucide-react';
import type {
  RmsJobPosting, RmsJobBadge, RmsRecruitmentStep, RmsJobFaq
} from '../lib/types';
import {
  EMPLOYMENT_TYPE_LABELS,
  formatSalaryDisplay, formatSalaryPackage
} from '../lib/constants';
import {
  listJobBadges, listRecruitmentSteps, listJobFaqs
} from '../lib/api';

// ── Default Static Data (Reused identically from JobDetail.tsx) ───────────────

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

// ── Compact Sidebar Key-Value Row (Reused identically from JobDetail.tsx) ─────

function SidebarRow({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  icon: any;
  accent?: 'green' | 'amber' | 'blue';
}) {
  const accentCls = accent === 'green'
    ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
    : accent === 'amber'
    ? 'text-amber-800 bg-amber-50 border-amber-200'
    : accent === 'blue'
    ? 'text-blue-700 bg-blue-50 border-blue-200'
    : 'text-slate-800 bg-slate-50 border-slate-200';

  return (
    <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-slate-100 bg-slate-50/60 text-xs">
      <span className="flex items-center gap-2 text-slate-500 font-medium">
        <Icon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        {label}
      </span>
      <span
        className={`font-semibold px-2 py-0.5 rounded-md border text-[11px] truncate max-w-[180px] text-right ${accentCls}`}
        title={typeof value === 'string' ? value : undefined}
      >
        {value}
      </span>
    </div>
  );
}

export interface JobDetailsModalProps {
  job: RmsJobPosting;
  isOpen: boolean;
  onClose: () => void;
}

export default function JobDetailsModal({ job, isOpen, onClose }: JobDetailsModalProps) {
  // Accordion state (Section 1 overview expanded by default, others collapsed)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    overview: true,
    responsibilities: true,
    eligibility: true,
    experience: false,
    documents: false,
    process: false,
  });

  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [badges, setBadges] = useState<RmsJobBadge[]>([]);
  const [customSteps, setCustomSteps] = useState<RmsRecruitmentStep[]>([]);
  const [customFaqs, setCustomFaqs] = useState<RmsJobFaq[]>([]);

  // Fetch optional badges, steps, and FAQs if job.id exists
  useEffect(() => {
    if (!isOpen || !job?.id) return;
    Promise.all([
      listJobBadges(job.id),
      listRecruitmentSteps(job.id),
      listJobFaqs(job.id),
    ]).then(([b, sSteps, f]) => {
      setBadges((b.data || []).filter(x => x.enabled));
      setCustomSteps((sSteps.data || []).filter(x => x.enabled));
      setCustomFaqs((f.data || []).filter(x => x.enabled));
    }).catch(() => {
      // Graceful fallback to static defaults
    });
  }, [isOpen, job?.id]);

  // Keyboard accessibility and body scroll lock
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen || !job) return null;

  // ── Computed helpers (Exact parity with JobDetail.tsx) ──────────────────────
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

  const allExpanded = Object.values(openSections).every(Boolean);

  const now = new Date();
  const closingDate = job.closing_date ? new Date(job.closing_date) : null;
  const daysToClose = closingDate ? Math.ceil((closingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 999;
  const isClosingSoon = closingDate ? daysToClose <= 5 && daysToClose >= 0 : false;

  // Application Availability Status (Differentiates candidate application availability from administrative status)
  const candidateStatus = () => {
    if (job.status === 'filled') {
      return { label: 'Position Filled', cls: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
    if (job.status === 'applications_closed' || (closingDate && !job.never_close_applications && daysToClose < 0)) {
      return { label: 'Applications Closed', cls: 'bg-red-50 text-red-700 border-red-200' };
    }
    if (job.status === 'coming_soon') {
      return { label: 'Coming Soon', cls: 'bg-blue-50 text-blue-700 border-blue-200' };
    }
    if (job.status === 'archived' || job.status === 'hidden' || job.status === 'draft') {
      return { label: 'Not Accepting Applications', cls: 'bg-slate-100 text-slate-600 border-slate-200' };
    }
    if (isClosingSoon) {
      return { label: `Closing Soon (${daysToClose}d left)`, cls: 'bg-amber-50 text-amber-800 border-amber-200' };
    }
    return { label: 'Open for Applications', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
  };
  const cStatus = candidateStatus();

  const eligibility = Array.isArray(job.eligibility_criteria) ? job.eligibility_criteria : [];
  const documents = Array.isArray(job.required_documents) ? job.required_documents : [];
  const isDistrictLevel = job.vacancy_level === 'district' || job.vacancy_allocations?.vacancy_level === 'district';
  const topQualification = eligibility.find(e =>
    e.label.toLowerCase().includes('degree') ||
    e.label.toLowerCase().includes('graduate') ||
    e.label.toLowerCase().includes('diploma') ||
    e.label.toLowerCase().includes('12th') ||
    e.label.toLowerCase().includes('10th')
  )?.label || eligibility[0]?.label || 'Any Recognized Degree';

  const ageCriteria = '18 to 38 Years';
  const experienceDetails = job.experience_details || job.vacancy_allocations?.experience_details || '';
  const hasProjectPdf = Boolean(job.project_pdf_enabled && job.project_pdf_url?.trim());
  const hasProjectVideo = Boolean(job.project_video_enabled && job.project_video_url?.trim());
  const hasJdPdf = Boolean(job.jd_pdf_enabled !== false && job.jd_pdf_url?.trim());

  const activeSteps = customSteps.length > 0 ? customSteps : SELECTION_STEPS;
  const activeFaqs = customFaqs.length > 0 ? customFaqs : FAQ_ITEMS;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="job-details-modal-title"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl h-full sm:h-[90vh] max-h-[90vh] flex flex-col overflow-hidden">

        {/* ── STICKY MODAL HEADER ────────────────────────────────────────────── */}
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-xs border-b border-slate-200 px-5 sm:px-6 py-4 flex items-center justify-between gap-4 shrink-0">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary-50 text-primary-800 border border-primary-200">
                Official Position Specifications
              </span>
              {job.department && (
                <span className="text-xs font-semibold text-slate-500 truncate">
                  • {job.department}
                </span>
              )}
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${cStatus.cls}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                {cStatus.label}
              </span>
            </div>
            <h2
              id="job-details-modal-title"
              className="text-lg sm:text-xl font-bold text-[#102a43] leading-snug truncate"
            >
              {job.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── SCROLLABLE MODAL BODY ─────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5">

          {/* ── 2-COLUMN MODAL CONTENT GRID ─────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

            {/* ══ SECTION A: JOB INFORMATION (LEFT COLUMN) ══ */}
            <div className="lg:col-span-2 space-y-3.5 min-w-0">

              <div className="flex items-center justify-between pb-1">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary-600" />
                  Section A: Job Specifications &amp; Overview
                </h3>
                <button
                  type="button"
                  onClick={allExpanded ? collapseAll : expandAll}
                  className="text-xs font-semibold text-primary-700 hover:text-primary-900 underline transition-colors cursor-pointer"
                >
                  {allExpanded ? 'Collapse All' : 'Expand All'}
                </button>
              </div>

              {/* 1. Job Overview & District Allocations */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                <button
                  type="button"
                  onClick={() => toggleSection('overview')}
                  className="w-full flex items-center justify-between p-3.5 sm:p-4 text-left hover:bg-slate-50/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary-100 text-primary-800 flex items-center justify-center shrink-0">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900">1. Job Overview &amp; District Allocations</h4>
                      <p className="text-[11px] text-slate-500">Project scope, eligible districts, and orientation resources</p>
                    </div>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${openSections.overview ? 'rotate-180' : ''}`} />
                </button>

                {openSections.overview && (
                  <div className="px-4 pb-4 pt-2.5 border-t border-slate-100 space-y-3.5 text-xs text-slate-700">
                    {job.project_overview?.trim() ? (
                      <div>
                        <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Project Overview</h5>
                        <p className="leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200 text-slate-800">
                          {job.project_overview.trim()}
                        </p>
                      </div>
                    ) : null}

                    <div>
                      <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Eligible Posting Locations ({Array.isArray(job.location_districts) ? job.location_districts.length : 0} Districts)
                      </h5>
                      {Array.isArray(job.location_districts) && job.location_districts.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {job.location_districts.map(d => (
                            <span key={d} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-100 text-slate-800 border border-slate-200">
                              <MapPin className="w-3 h-3 text-slate-500" />
                              {d}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-slate-500">Open across all administrative districts in Maharashtra.</p>
                      )}
                    </div>

                    {(hasProjectPdf || hasProjectVideo) && (
                      <div className="pt-2 border-t border-slate-100">
                        <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Project Brief Resources</h5>
                        <div className="flex flex-wrap gap-2">
                          {hasProjectPdf && (
                            <a
                              href={job.project_pdf_url!}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 transition-colors"
                            >
                              <FileText className="w-3.5 h-3.5 text-red-600" />
                              <span>Project Blueprint (PDF)</span>
                              <ExternalLink className="w-3 h-3 text-slate-400" />
                            </a>
                          )}
                          {hasProjectVideo && (
                            <a
                              href={job.project_video_url!}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 transition-colors"
                            >
                              <Play className="w-3.5 h-3.5 text-blue-600" />
                              <span>Project Walkthrough Video</span>
                              <ExternalLink className="w-3 h-3 text-slate-400" />
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 2. Roles & Responsibilities */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                <button
                  type="button"
                  onClick={() => toggleSection('responsibilities')}
                  className="w-full flex items-center justify-between p-3.5 sm:p-4 text-left hover:bg-slate-50/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                      <Briefcase className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900">2. Roles &amp; Responsibilities</h4>
                      <p className="text-[11px] text-slate-500">Core duties, deliverables, and official JD document</p>
                    </div>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${openSections.responsibilities ? 'rotate-180' : ''}`} />
                </button>

                {openSections.responsibilities && (
                  <div className="px-4 pb-4 pt-2.5 border-t border-slate-100 space-y-3.5 text-xs text-slate-700">
                    {hasJdPdf && (
                      <div className="flex items-center justify-between gap-3 p-3 bg-primary-50/60 rounded-lg border border-primary-100">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-primary-700 shrink-0" />
                          <div>
                            <div className="text-xs font-bold text-primary-900">Official Job Description Document (PDF)</div>
                            <div className="text-[10px] text-primary-600">Complete verified notification and guidelines</div>
                          </div>
                        </div>
                        <a
                          href={job.jd_pdf_url!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-primary-900 text-white rounded-lg text-xs font-bold hover:bg-primary-800 transition-colors shrink-0"
                        >
                          <Download className="w-3 h-3" /> Download
                        </a>
                      </div>
                    )}

                    {job.description?.trim() ? (
                      <div className="whitespace-pre-wrap leading-relaxed text-slate-800 bg-slate-50 p-3.5 rounded-xl border border-slate-200 font-sans">
                        {job.description.trim()}
                      </div>
                    ) : (
                      <p className="text-slate-500">Official job responsibilities will be provided during induction.</p>
                    )}
                  </div>
                )}
              </div>

              {/* 3. Eligibility & Qualifications */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                <button
                  type="button"
                  onClick={() => toggleSection('eligibility')}
                  className="w-full flex items-center justify-between p-3.5 sm:p-4 text-left hover:bg-slate-50/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                      <GraduationCap className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900">3. Eligibility &amp; Qualifications</h4>
                      <p className="text-[11px] text-slate-500">Education requirements, skills, and prerequisites</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                      {eligibility.length} Criteria
                    </span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${openSections.eligibility ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {openSections.eligibility && (
                  <div className="px-4 pb-4 pt-2.5 border-t border-slate-100 space-y-3.5 text-xs text-slate-700">
                    {eligibility.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {eligibility.map((c, i) => (
                          <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                            <div className="min-w-0">
                              <span className="font-semibold text-slate-800 leading-snug">{c.label}</span>
                              {c.required && (
                                <span className="ml-2 text-[9px] font-bold text-red-600 bg-red-50 border border-red-200 px-1 py-0.2 rounded">
                                  Mandatory
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-500">Standard educational qualifications as per project rules.</p>
                    )}

                    {job.skills_required && job.skills_required.length > 0 && (
                      <div className="pt-2 border-t border-slate-100">
                        <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Recommended Skills</h5>
                        <div className="flex flex-wrap gap-1.5">
                          {job.skills_required.map((skill, i) => (
                            <span key={i} className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-primary-50 text-primary-900 border border-primary-200">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 4. Experience & Work Profile */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                <button
                  type="button"
                  onClick={() => toggleSection('experience')}
                  className="w-full flex items-center justify-between p-3.5 sm:p-4 text-left hover:bg-slate-50/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center shrink-0">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900">4. Experience &amp; Work Profile</h4>
                      <p className="text-[11px] text-slate-500">Domain parameters, experience, and age range</p>
                    </div>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${openSections.experience ? 'rotate-180' : ''}`} />
                </button>

                {openSections.experience && (
                  <div className="px-4 pb-4 pt-2.5 border-t border-slate-100 space-y-3 text-xs text-slate-700">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                        <span className="text-slate-400 block text-[10px] mb-0.5">Required Experience</span>
                        <span className="font-bold text-slate-800 text-xs">{job.experience_required || '0 to 2 Years Experience'}</span>
                      </div>
                      <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                        <span className="text-slate-400 block text-[10px] mb-0.5">Permissible Age Range</span>
                        <span className="font-bold text-slate-800 text-xs">{ageCriteria}</span>
                      </div>
                    </div>

                    {experienceDetails ? (
                      <div>
                        <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Profile Context</h5>
                        <p className="leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200 text-slate-800">
                          {experienceDetails}
                        </p>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>

              {/* 5. Documents Required */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                <button
                  type="button"
                  onClick={() => toggleSection('documents')}
                  className="w-full flex items-center justify-between p-3.5 sm:p-4 text-left hover:bg-slate-50/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900">5. Documents Required</h4>
                      <p className="text-[11px] text-slate-500">Official certificates needed during onboarding</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                      {documents.length > 0 ? `${documents.length} Items` : 'Standard'}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${openSections.documents ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {openSections.documents && (
                  <div className="px-4 pb-4 pt-2.5 border-t border-slate-100 space-y-2.5 text-xs text-slate-700">
                    <p className="text-slate-500">
                      Authentic original certificates along with self-attested copies:
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
                        <div key={idx} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
                          <FileText className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                          <span className="font-semibold text-slate-800">{doc.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 6. Recruitment Process & FAQs */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                <button
                  type="button"
                  onClick={() => toggleSection('process')}
                  className="w-full flex items-center justify-between p-3.5 sm:p-4 text-left hover:bg-slate-50/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
                      <ListChecks className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900">6. Recruitment Process &amp; FAQs</h4>
                      <p className="text-[11px] text-slate-500">Candidate hiring journey, timelines, and frequent questions</p>
                    </div>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${openSections.process ? 'rotate-180' : ''}`} />
                </button>

                {openSections.process && (
                  <div className="px-4 pb-4 pt-2.5 border-t border-slate-100 space-y-4 text-xs text-slate-700">
                    <div>
                      <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Recruitment Roadmap</h5>
                      <div className="space-y-1.5">
                        {activeSteps.map((s, idx) => (
                          <div key={idx} className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-50 border border-slate-200">
                            <span className="w-5 h-5 rounded-full bg-primary-900 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <div>
                              <div className="font-bold text-slate-900">{s.label}</div>
                              <div className="text-[10px] text-slate-500 mt-0.5">{s.desc}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100">
                      <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Frequently Asked Questions</h5>
                      <div className="space-y-1.5">
                        {activeFaqs.map((faq, idx) => (
                          <div key={idx} className="border border-slate-200 rounded-lg overflow-hidden">
                            <button
                              type="button"
                              onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                              className="w-full flex items-center justify-between p-2.5 text-left font-bold text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer"
                            >
                              <span>{faq.q}</span>
                              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${openFaq === idx ? 'rotate-180' : ''}`} />
                            </button>
                            {openFaq === idx && (
                              <div className="px-2.5 pb-2.5 text-slate-600 bg-slate-50/50 border-t border-slate-100 leading-relaxed">
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

            {/* ══ SECTION B: APPLICATION SUMMARY (RIGHT COLUMN - STICKY & REUSED EXACT SPEC) ══ */}
            <div className="lg:col-span-1 space-y-4 lg:sticky lg:top-0">

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Card Header (Identical to JobDetail.tsx) */}
                <div className="bg-primary-900 px-4 py-3.5 text-white">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-primary-200 mb-0.5">
                    Section B: Application Summary
                  </p>
                  <h4 className="text-sm font-bold leading-snug line-clamp-2">{job.title}</h4>
                  {job.department && (
                    <p className="text-xs text-primary-200 mt-0.5">{job.department}</p>
                  )}
                  <div className="mt-2.5 flex items-center justify-between">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cStatus.cls}`}>
                      {cStatus.label}
                    </span>
                    {closingDate && !job.never_close_applications && (
                      <span className="text-[10px] text-primary-200 font-medium">
                        Last: {closingDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Spec Rows (Identical to JobDetail.tsx) */}
                <div className="p-3.5 space-y-2">
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

                  {/* Experience Required */}
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

                  {/* Quota Scope */}
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
                    <div className={`mt-2 p-2 rounded-lg border text-[11px] flex items-center gap-2 ${
                      isClosingSoon ? 'bg-amber-50 text-amber-900 border-amber-200' : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}>
                      <CalendarClock className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                      <div className="min-w-0">
                        <span className="font-bold block truncate">
                          Last Date: {closingDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {isClosingSoon ? `Hurry! Only ${daysToClose} days left` : 'Applications active'}
                        </span>
                      </div>
                    </div>
                  )}

                </div>
              </div>

              {/* Candidate Verification & Recruitment Guidance Card (Solves empty visual space in right column) */}
              <div className="bg-slate-50/90 rounded-2xl border border-slate-200/90 p-4 space-y-2.5 text-xs text-slate-600 shadow-2xs">
                <div className="flex items-center gap-2 text-primary-900 font-bold text-xs">
                  <ShieldCheck className="w-4 h-4 text-primary-700 shrink-0" />
                  Candidate Instructions &amp; Security
                </div>
                <ul className="space-y-1.5 text-[11px] text-slate-500 leading-relaxed list-disc list-inside">
                  <li>Review all eligibility criteria and district allocations before proceeding.</li>
                  <li>Draft progress is automatically saved to your verified candidate profile.</li>
                  <li>No additional charges apply beyond the official application fee.</li>
                  <li>For application support, contact the recruitment desk through your dashboard.</li>
                </ul>
              </div>

            </div>

          </div>

        </div>

        {/* ── STICKY MODAL FOOTER ────────────────────────────────────────────── */}
        <div className="sticky bottom-0 z-20 bg-white/95 backdrop-blur-xs border-t border-slate-200 px-5 sm:px-6 py-3.5 flex items-center justify-end gap-3 shrink-0 shadow-lg">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Close
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 sm:px-6 sm:py-2.5 rounded-xl bg-[#102a43] hover:bg-[#243b53] text-white text-xs font-bold transition-colors shadow-sm cursor-pointer"
          >
            Continue Application
          </button>
        </div>

      </div>
    </div>
  );
}

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Briefcase, MapPin, Clock, Users, ChevronRight,
  Search, ArrowRight, Megaphone, Calendar,
  GraduationCap, IndianRupee, ChevronDown, Lock, CheckCircle2, XCircle,
  Sprout, Siren, BookOpen, Stethoscope, Heart, Trees,
  ArrowDownUp, CalendarClock, TrendingUp, TrendingDown, Building2,
  AlertCircle, RefreshCw, User,
} from 'lucide-react';
import { listPublicCampaigns, listPublicDrives, listPublishedJobs } from '../lib/api';
import { subscribeToJobUpdates } from '../lib/jobEvents';
import type { RmsCampaign, RmsRecruitmentDrive, RmsJobPosting, JobStatus } from '../lib/types';
import { DRIVE_TYPE_LABELS, MAHARASHTRA_DISTRICTS, formatSalaryDisplay, formatSalaryPackage, parseSalaryValue } from '../lib/constants';
import { useCandidateAuth } from '../lib/CandidateAuthContext';
import OTPLoginModal from '../components/OTPLoginModal';

// ─── Department Theme + Icon ─────────────────────────────────────────────────

interface DeptTheme {
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  accentBar: string;
  iconBg: string;
  iconText: string;
  headerAccent: string;
  icon: React.ElementType;
}

const DEFAULT_THEME: DeptTheme = {
  badgeBg: 'bg-primary-50', badgeText: 'text-primary-700', badgeBorder: 'border-primary-200',
  accentBar: 'bg-primary-500', iconBg: 'bg-primary-100', iconText: 'text-primary-600',
  headerAccent: 'text-primary-900', icon: Building2,
};

const DEPT_THEMES: Record<string, Omit<DeptTheme, 'icon'>> = {
  'green': {
    badgeBg: 'bg-green-50', badgeText: 'text-green-700', badgeBorder: 'border-green-200',
    accentBar: 'bg-green-500', iconBg: 'bg-green-100', iconText: 'text-green-600',
    headerAccent: 'text-green-900',
  },
  'red': {
    badgeBg: 'bg-red-50', badgeText: 'text-red-700', badgeBorder: 'border-red-200',
    accentBar: 'bg-red-500', iconBg: 'bg-red-100', iconText: 'text-red-600',
    headerAccent: 'text-red-900',
  },
  'blue': {
    badgeBg: 'bg-blue-50', badgeText: 'text-blue-700', badgeBorder: 'border-blue-200',
    accentBar: 'bg-blue-500', iconBg: 'bg-blue-100', iconText: 'text-blue-600',
    headerAccent: 'text-blue-900',
  },
  'cyan': {
    badgeBg: 'bg-cyan-50', badgeText: 'text-cyan-700', badgeBorder: 'border-cyan-200',
    accentBar: 'bg-cyan-500', iconBg: 'bg-cyan-100', iconText: 'text-cyan-600',
    headerAccent: 'text-cyan-900',
  },
  'purple': {
    badgeBg: 'bg-purple-50', badgeText: 'text-purple-700', badgeBorder: 'border-purple-200',
    accentBar: 'bg-purple-500', iconBg: 'bg-purple-100', iconText: 'text-purple-600',
    headerAccent: 'text-purple-900',
  },
  'emerald': {
    badgeBg: 'bg-emerald-50', badgeText: 'text-emerald-700', badgeBorder: 'border-emerald-200',
    accentBar: 'bg-emerald-500', iconBg: 'bg-emerald-100', iconText: 'text-emerald-600',
    headerAccent: 'text-emerald-900',
  },
};

const DEPT_ICONS: Record<string, React.ElementType> = {
  green: Sprout,
  red: Siren,
  blue: BookOpen,
  cyan: Stethoscope,
  purple: Heart,
  emerald: Trees,
};

const DEPT_KEYWORDS: { keywords: string[]; theme: keyof typeof DEPT_THEMES }[] = [
  { keywords: ['agri', 'agridoot', 'farmer', 'agriculture'], theme: 'green' },
  { keywords: ['emergency', 'qr', 'help', 'rescue', 'ambulance'], theme: 'red' },
  { keywords: ['education', 'school', 'learn', 'teach', 'vidya', 'shiksha'], theme: 'blue' },
  { keywords: ['health', 'healthcare', 'medical', 'clinic', 'swasthya'], theme: 'cyan' },
  { keywords: ['women', 'swayam', 'sevika', 'empower', 'mahila'], theme: 'purple' },
  { keywords: ['environment', 'green', 'tree', 'forest', 'paryavaran', 'eco'], theme: 'emerald' },
];

function getDeptTheme(deptName: string): DeptTheme {
  const lower = deptName.toLowerCase();
  for (const { keywords, theme } of DEPT_KEYWORDS) {
    if (keywords.some(k => lower.includes(k))) {
      return { ...DEPT_THEMES[theme], icon: DEPT_ICONS[theme] };
    }
  }
  return DEFAULT_THEME;
}

// ─── Labels ────────────────────────────────────────────────────────────────────

const EMP_TYPE_LABELS: Record<string, string> = {
  full_time: 'Full-time', part_time: 'Part-time', contract: 'Contract',
  volunteer: 'Volunteer', internship: 'Internship',
};

const RECRUITMENT_MODE_LABELS: Record<string, string> = {
  Online: 'Online', Offline: 'Offline', Hybrid: 'Hybrid',
};

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'deadline', label: 'Last Date to Apply' },
  { value: 'salary_high', label: 'Highest Salary' },
  { value: 'salary_low', label: 'Lowest Salary' },
  { value: 'vacancies', label: 'Most Vacancies' },
] as const;

type SortValue = typeof SORT_OPTIONS[number]['value'];

// ─── Helpers ────────────────────────────────────────────────────────────────────

function fmtNum(n: number | null | undefined): string {
  if (n == null) return '—';
  return n.toLocaleString('en-IN');
}

function fmtSalary(job: { salary_amount?: number | null; salary_type?: string | null; salary_honorarium?: string | null }): string | null {
  return formatSalaryDisplay(job);
}

function parseSalaryNum(job: { salary_amount?: number | null; salary_honorarium?: string | null }): number {
  return parseSalaryValue(job);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CareersHome() {
  const { session } = useCandidateAuth();

  const [campaigns, setCampaigns] = useState<RmsCampaign[]>([]);
  const [drives, setDrives] = useState<RmsRecruitmentDrive[]>([]);
  const [publishedJobs, setPublishedJobs] = useState<RmsJobPosting[]>([]);
  const [loading, setLoading] = useState(true);

  const [otpOpen, setOtpOpen] = useState(false);
  const [pendingJobSlug, setPendingJobSlug] = useState<string | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectParam = searchParams.get('redirect');
  const loginParam = searchParams.get('login');

  useEffect(() => {
    if (loginParam === 'true') {
      setPendingJobSlug(null);
      setOtpOpen(true);
    }
  }, [loginParam]);

  const handleJobClick = (slug: string) => {
    // As per user request: Require OTP when clicking "View Details"
    setPendingJobSlug(slug);
    setOtpOpen(true);
  };

  const handleLoginSuccess = async (isNewUser?: boolean, _mobile?: string) => {
    setOtpOpen(false);

    if (pendingJobSlug) {
      navigate(`/careers/jobs/${pendingJobSlug}`);
    } else if (redirectParam) {
      navigate(redirectParam);
    } else if (isNewUser) {
      navigate('/candidate/profile');
    } else {
      navigate('/candidate/dashboard');
    }
  };

  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [districtFilter, setDistrictFilter] = useState('');
  const [empTypeFilter, setEmpTypeFilter] = useState('');
  const [experienceFilter, setExperienceFilter] = useState('');
  const [recModeFilter, setRecModeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState<SortValue>('newest');
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([listPublicCampaigns(), listPublicDrives(), listPublishedJobs()])
      .then(([c, d, j]) => {
        if (j.error) {
          setError(j.error.message || 'Failed to load open positions. Please check your network connection.');
          return;
        }
        setCampaigns(c.data ?? []);
        setDrives(d.data ?? []);
        setPublishedJobs(j.data ?? []);
      })
      .catch(err => {
        setError(err?.message || 'An unexpected network error occurred while loading careers data.');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadData();

    // Invalidate & refresh immediately when any job is updated in Admin (same-tab or cross-tab)
    const unsubscribe = subscribeToJobUpdates(() => {
      loadData();
    });

    // Invalidate & refresh whenever user switches back to this tab
    const handleFocus = () => loadData();
    const handleVisibility = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        loadData();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      unsubscribe();
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [loadData]);

  // Group jobs by department
  const departments = useMemo(() => {
    const byDept: Record<string, RmsJobPosting[]> = {};
    publishedJobs.forEach(j => {
      const key = j.department?.trim() || 'Open Positions';
      (byDept[key] = byDept[key] ?? []).push(j);
    });
    return Object.entries(byDept).map(([dept, jobs]) => ({
      id: dept.toLowerCase().replace(/\s+/g, '-'),
      name: dept,
      jobs,
    }));
  }, [publishedJobs]);

  // Filter + sort
  const filteredDepartments = useMemo(() => {
    const filterFn = (j: RmsJobPosting, deptId: string) => {
      if (search) {
        const q = search.toLowerCase();
        if (!j.title.toLowerCase().includes(q) && !j.department.toLowerCase().includes(q)) return false;
      }
      if (projectFilter && deptId !== projectFilter) return false;
      if (empTypeFilter && j.employment_type !== empTypeFilter) return false;
      if (recModeFilter && j.recruitment_mode !== recModeFilter) return false;
      if (statusFilter && j.status !== statusFilter) return false;
      if (experienceFilter && j.experience_required !== experienceFilter) return false;
      if (districtFilter) {
        const d = districtFilter.toLowerCase();
        const loc = (j.location || '').toLowerCase();
        const inDistricts = Array.isArray(j.location_districts) &&
          j.location_districts.some(dist => dist.toLowerCase() === d);
        const directMatch = inDistricts || loc.includes(d);
        const isStateWide = (j.location_type === 'State-wide' || loc.includes('maharashtra') || loc.includes('state') || !loc) &&
          ((j.vacancies_per_district != null && j.vacancies_per_district > 0) || (j.total_vacancies != null && j.total_vacancies > 0));
        if (!directMatch && !isStateWide) return false;
      }
      return true;
    };

    const sortFn = (a: RmsJobPosting, b: RmsJobPosting) => {
      switch (sortBy) {
        case 'newest': return b.created_at.localeCompare(a.created_at);
        case 'oldest': return a.created_at.localeCompare(b.created_at);
        case 'deadline': {
          const ad = a.closing_date ?? '9999';
          const bd = b.closing_date ?? '9999';
          return ad.localeCompare(bd);
        }
        case 'salary_high': return parseSalaryNum(b) - parseSalaryNum(a);
        case 'salary_low': return parseSalaryNum(a) - parseSalaryNum(b);
        case 'vacancies': return (b.total_vacancies ?? 0) - (a.total_vacancies ?? 0);
        default: return 0;
      }
    };

    return departments
      .map(d => ({ ...d, jobs: d.jobs.filter(j => filterFn(j, d.id)).sort(sortFn) }))
      .filter(d => d.jobs.length > 0);
  }, [departments, search, projectFilter, empTypeFilter, recModeFilter, statusFilter, experienceFilter, districtFilter, sortBy]);

  const totalFiltered = filteredDepartments.reduce((s, d) => s + d.jobs.length, 0);
  const totalVacancies = publishedJobs.reduce((s, j) => s + (j.total_vacancies ?? 0), 0);
  const hasOpenJobs = publishedJobs.some(j => j.status === 'published');

  // Filter options from live data
  const projectOptions = departments.map(d => ({ id: d.id, name: d.name }));
  const empTypeOptions = useMemo(() => {
    const types = new Set(publishedJobs.map(j => j.employment_type).filter(Boolean));
    return Array.from(types);
  }, [publishedJobs]);
  const experienceOptions = useMemo(() => {
    const exps = new Set(publishedJobs.map(j => j.experience_required).filter(Boolean));
    return Array.from(exps);
  }, [publishedJobs]);
  const recModeOptions = useMemo(() => {
    const modes = new Set(publishedJobs.map(j => j.recruitment_mode).filter(Boolean));
    return Array.from(modes);
  }, [publishedJobs]);

  const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

  const clearAll = () => {
    setSearch(''); setProjectFilter(''); setEmpTypeFilter(''); setStatusFilter('');
    setExperienceFilter(''); setRecModeFilter(''); setDistrictFilter('');
  };

  return (
    <div className="min-h-screen bg-white">

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="relative bg-gradient-to-br from-primary-900 via-primary-800 to-primary-900 text-white py-12 md:py-18 overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
            backgroundSize: '40px 40px',
          }}
        />
        <div className="container-government relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-full text-xs sm:text-sm font-medium mb-4">
              <Briefcase className="w-4 h-4 shrink-0" />
              Careers at Abhinav Bharat Foundation
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 leading-tight">
              Join the Mission of
              <span className="block text-primary-200">Transforming Rural India</span>
            </h1>

            <p className="text-base sm:text-lg text-primary-200 leading-relaxed mb-5">
              Be part of a team creating real impact across Maharashtra. We are looking for
              passionate individuals committed to rural development and community empowerment.
            </p>

            {/* Stats row */}
            <div className="flex flex-wrap gap-4 sm:gap-8 mb-4">
              {[
                { label: 'Open Positions', value: error ? '—' : String(publishedJobs.length) },
                { label: 'Total Vacancies', value: error ? '—' : totalVacancies > 0 ? fmtNum(totalVacancies) + '+' : '—' },
                { label: 'Departments', value: error ? '—' : String(departments.length) },
                { label: 'Districts Covered', value: '36' },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <div className="text-xl sm:text-2xl font-bold text-white">{s.value}</div>
                  <div className="text-xs text-primary-300 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Live status badge */}
            <div className="mb-5">
              <span className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-semibold ${
                hasOpenJobs
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                  : 'bg-red-500/20 text-red-300 border border-red-400/30'
              }`}>
                <span className={`w-2 h-2 rounded-full ${hasOpenJobs ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                {hasOpenJobs ? 'Currently Hiring Across Maharashtra' : 'Recruitment Closed'}
              </span>
            </div>

            {/* Search bar */}
            <div className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 max-w-xl shadow-lg">
              <Search className="w-4 h-4 sm:w-5 sm:h-5 text-primary-400 shrink-0" />
              <input
                type="text"
                placeholder="Search by position or department..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="flex-1 text-primary-900 placeholder-primary-400 bg-transparent focus:outline-none text-sm min-w-0"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="shrink-0 text-xs text-primary-400 hover:text-primary-700 font-medium transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Filter + Sort Bar ──────────────────────────────────────────────────── */}
      <div className="sticky top-[128px] md:top-[156px] lg:top-[168px] z-30 bg-white border-b border-primary-100 shadow-sm">
        <div className="container-government py-2">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-0.5">
            <span className="text-xs font-bold text-primary-400 uppercase tracking-wider shrink-0 hidden sm:block pr-0.5">
              Filter:
            </span>

            {/* Department */}
            <FilterSelect value={projectFilter} onChange={setProjectFilter} placeholder="All Departments">
              {projectOptions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </FilterSelect>

            {/* District */}
            <FilterSelect value={districtFilter} onChange={setDistrictFilter} placeholder="All Districts">
              {MAHARASHTRA_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
            </FilterSelect>

            {/* Employment Type */}
            <FilterSelect value={empTypeFilter} onChange={setEmpTypeFilter} placeholder="All Types">
              {empTypeOptions.map(t => <option key={t} value={t}>{EMP_TYPE_LABELS[t] ?? t}</option>)}
            </FilterSelect>

            {/* Experience */}
            <FilterSelect value={experienceFilter} onChange={setExperienceFilter} placeholder="All Experience">
              {experienceOptions.map(e => <option key={e} value={e}>{e}</option>)}
            </FilterSelect>

            {/* Recruitment Mode */}
            <FilterSelect value={recModeFilter} onChange={setRecModeFilter} placeholder="All Modes">
              {recModeOptions.map(m => <option key={m} value={m}>{RECRUITMENT_MODE_LABELS[m] ?? m}</option>)}
            </FilterSelect>

            {/* Status — candidate-friendly only */}
            <FilterSelect value={statusFilter} onChange={setStatusFilter} placeholder="All Statuses">
              <option value="published">Open</option>
              <option value="coming_soon">Coming Soon</option>
              <option value="applications_closed">Applications Closed</option>
              <option value="filled">Position Filled</option>
            </FilterSelect>

            {/* Sort */}
            <div className="relative shrink-0">
              <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                <ArrowDownUp className="w-3.5 h-3.5 text-primary-400" />
              </div>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as SortValue)}
                className="appearance-none pl-8 pr-7 py-2 text-xs sm:text-sm bg-white border border-primary-200 rounded-lg text-primary-700 focus:outline-none focus:border-primary-400 cursor-pointer hover:border-primary-300 transition-colors font-medium"
              >
                {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-primary-400 pointer-events-none" />
            </div>

            {/* Results count */}
            <div className="ml-auto shrink-0 pl-2">
              <span className="text-xs font-semibold text-primary-500 bg-primary-50 border border-primary-200 px-3 py-1.5 rounded-lg whitespace-nowrap">
                {totalFiltered} position{totalFiltered !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Active Campaigns Banner ───────────────────────────────────────────── */}
      {campaigns.length > 0 && (
        <section className="bg-accent-saffron-50 border-b border-accent-saffron-200 py-2.5">
          <div className="container-government">
            <div className="flex items-center gap-3 overflow-x-auto pb-0.5">
              <div className="flex items-center gap-2 shrink-0">
                <Megaphone className="w-4 h-4 text-accent-saffron-600" />
                <span className="text-xs sm:text-sm font-bold text-accent-saffron-700">Active Campaigns:</span>
              </div>
              {campaigns.map(c => (
                <Link
                  key={c.id}
                  to={`/careers/campaigns/${c.id}`}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-accent-saffron-200 rounded-full text-xs sm:text-sm font-medium text-primary-900 hover:bg-accent-saffron-100 transition-colors"
                >
                  {c.name}
                  <ChevronRight className="w-3 h-3" />
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Upcoming Drives ───────────────────────────────────────────────────── */}
      {drives.length > 0 && (
        <section className="py-8 md:py-12 bg-primary-50">
          <div className="container-government">
            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-100 rounded-full text-xs font-bold text-primary-700 mb-2">
                  <Calendar className="w-3.5 h-3.5" />
                  Upcoming Recruitment Drives
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-primary-900">Attend a Drive Near You</h2>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
              {drives.slice(0, 3).map((drive, i) => (
                <motion.div
                  key={drive.id}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-white rounded-xl border border-primary-100 p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-xs font-bold px-2 py-1 bg-primary-100 text-primary-700 rounded-full">
                      {DRIVE_TYPE_LABELS[drive.drive_type]}
                    </span>
                    {drive.date && (
                      <span className="text-xs font-medium text-primary-500">
                        {new Date(drive.date).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-primary-900 mb-1.5 text-sm">{drive.name}</h3>
                  {drive.venue && (
                    <div className="flex items-center gap-1.5 text-xs text-primary-500 mb-3">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      {drive.venue}
                    </div>
                  )}
                  <Link
                    to={`/careers/drives/${drive.id}`}
                    className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-primary-700 hover:text-primary-900 transition-colors"
                  >
                    View Drive <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Current Openings ─────────────────────────────────────────────────── */}
      <section className="py-8 md:py-12 bg-primary-50">
        <div className="container-government">

          {/* Section header */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-100 rounded-full text-xs font-bold text-primary-700 mb-2">
                <Users className="w-3.5 h-3.5" />
                Current Openings
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-primary-900">
                {search
                  ? `${totalFiltered} position${totalFiltered !== 1 ? 's' : ''} found`
                  : `${publishedJobs.length} Positions across ${departments.length} Department${departments.length !== 1 ? 's' : ''}`}
              </h2>
              <p className="text-primary-500 text-sm mt-1">
                {totalVacancies > 0 && `${fmtNum(totalVacancies)}+ total vacancies across Maharashtra`}
              </p>
            </div>
          </div>

          {/* Loading state */}
          {loading && (
            <div className="bg-white rounded-2xl border border-primary-100 p-10 sm:p-16 text-center">
              <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-primary-500 font-medium">Loading positions...</p>
            </div>
          )}

          {/* Error state with retry */}
          {!loading && error && (
            <div className="bg-white rounded-2xl border border-red-200 p-10 sm:p-14 text-center">
              <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-3">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <p className="text-base sm:text-lg font-bold text-red-900 mb-1">Unable to Load Positions</p>
              <p className="text-sm text-red-600 max-w-md mx-auto mb-5 leading-relaxed">{error}</p>
              <button
                type="button"
                onClick={loadData}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-900 text-white text-sm font-semibold rounded-xl hover:bg-primary-800 transition-all active:scale-95 shadow-sm"
              >
                <RefreshCw className="w-4 h-4" /> Try Again
              </button>
            </div>
          )}

          {/* Genuine empty state (only when query succeeds and filters match nothing) */}
          {!loading && !error && filteredDepartments.length === 0 && (
            <div className="bg-white rounded-2xl border border-primary-100 p-10 sm:p-16 text-center">
              <Search className="w-10 h-10 text-primary-200 mx-auto mb-3" />
              <p className="text-base sm:text-lg font-semibold text-primary-600 mb-2">No positions match your search.</p>
              <p className="text-sm text-primary-400 mb-5">Try searching for a role or department name.</p>
              <button
                type="button"
                onClick={clearAll}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-900 text-white text-sm font-semibold rounded-xl hover:bg-primary-800 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          )}

          {/* Department groups */}
          <div className="space-y-5">
            {filteredDepartments.map((dept, pi) => {
              const theme = getDeptTheme(dept.name);
              const DeptIcon = theme.icon;
              const deptVacancies = dept.jobs.reduce((s, j) => s + (j.total_vacancies ?? 0), 0);

              return (
                <motion.div
                  key={dept.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: pi * 0.08 }}
                  className="rounded-2xl overflow-hidden border border-primary-200 shadow-card bg-white"
                >
                  {/* Department header with icon + summary */}
                  <div className="flex items-center gap-3 px-4 sm:px-5 py-3 bg-primary-50 border-b border-primary-100">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${theme.iconBg}`}>
                      <DeptIcon className={`w-4.5 h-4.5 ${theme.iconText}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm sm:text-base font-bold text-primary-900 tracking-wide leading-tight truncate">
                        {dept.name}
                      </h3>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-primary-500 font-medium">
                          {dept.jobs.length} Role{dept.jobs.length !== 1 ? 's' : ''}
                        </span>
                        {deptVacancies > 0 && (
                          <span className="text-xs text-primary-500 font-medium">
                            {fmtNum(deptVacancies)} Vacanc{deptVacancies !== 1 ? 'ies' : 'y'}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${theme.badgeBg} ${theme.badgeText} border ${theme.badgeBorder}`}>
                      {dept.jobs.length} Role{dept.jobs.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Job cards */}
                  <div className="divide-y divide-primary-100">
                    {dept.jobs.map((job, ji) => (
                      <JobCard key={job.id} job={job} theme={theme} ji={ji} fmtDate={fmtDate} onClick={() => job.slug && handleJobClick(job.slug)} />
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────────── */}
      <section className="section-padding bg-primary-900 text-white">
        <div className="container-government text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">Don't See a Suitable Role?</h2>
            <p className="text-base sm:text-xl text-primary-200 mb-8 max-w-2xl mx-auto">
              We are always looking for talented individuals passionate about rural development.
              Send us your profile and we will reach out when a suitable opportunity arises.
            </p>
            <a
              href="mailto:careers@abhinavbharatfoundation.org"
              className="inline-flex items-center gap-2 px-6 sm:px-8 py-3.5 bg-white text-primary-900 font-bold rounded-xl hover:bg-primary-100 transition-colors touch-manipulation min-h-[44px]"
            >
              Send Your Profile <ArrowRight className="w-5 h-5" />
            </a>
          </motion.div>
        </div>
      </section>

      <OTPLoginModal 
        isOpen={otpOpen} 
        onClose={() => setOtpOpen(false)} 
        onSuccess={handleLoginSuccess} 
        title={pendingJobSlug ? "Candidate Registration" : "Candidate Login"}
        subtitle={
          pendingJobSlug 
            ? "Verify your mobile number to view job details and apply." 
            : "Verify your registered mobile number with OTP to access your candidate dashboard and applications."
        }
      />
    </div>
  );
}

// ─── Filter Select ──────────────────────────────────────────────────────────────

function FilterSelect({
  value, onChange, placeholder, children,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative shrink-0">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="appearance-none pl-3 pr-7 py-2 text-xs sm:text-sm bg-white border border-primary-200 rounded-lg text-primary-700 focus:outline-none focus:border-primary-400 cursor-pointer hover:border-primary-300 transition-colors font-medium"
      >
        <option value="">{placeholder}</option>
        {children}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-primary-400 pointer-events-none" />
    </div>
  );
}

// ─── Job Card ─────────────────────────────────────────────────────────────────

function JobCard({ job, theme, ji, fmtDate, onClick }: {
  job: RmsJobPosting;
  theme: DeptTheme;
  ji: number;
  fmtDate: (d: string | null) => string;
  onClick: () => void;
}) {
  const status: JobStatus = job.status;
  const isComingSoon = status === 'coming_soon';
  const isClosed = status === 'applications_closed';
  const isFilled = status === 'filled';
  const showDeadline = status === 'published'
    && job.display_deadline_public !== false
    && !job.never_close_applications
    && job.closing_date;
  const showNeverClose = status === 'published' && job.never_close_applications;
  const showOpenDate = isComingSoon && job.publish_date && new Date(job.publish_date) > new Date();

  const empLabel = EMP_TYPE_LABELS[job.employment_type] ?? job.employment_type ?? 'Full-time';
  const recModeLabel = RECRUITMENT_MODE_LABELS[job.recruitment_mode ?? ''] ?? job.recruitment_mode;
  const salaryDisplay = fmtSalary(job);

  // Candidate-friendly status badge only
  const statusBadge = () => {
    if (isFilled) return { text: 'Position Filled', cls: 'bg-slate-100 text-slate-600 border-slate-200', icon: CheckCircle2 };
    if (isClosed) return { text: 'Applications Closed', cls: 'bg-red-50 text-red-700 border-red-200', icon: XCircle };
    if (isComingSoon) return { text: 'Coming Soon', cls: 'bg-blue-50 text-blue-700 border-blue-200', icon: Clock };
    if (job.recruitment_status === 'filling_fast') return { text: 'Filling Fast', cls: 'bg-orange-50 text-orange-700 border-orange-200 animate-pulse', icon: Briefcase };
    return { text: 'Open', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 };
  };
  const sBadge = statusBadge();
  const SIcon = sBadge.icon;

  // Button config
  const buttonConfig = () => {
    if (isComingSoon) return { label: 'Coming Soon', disabled: true, icon: Clock, cls: 'bg-primary-100 text-primary-400 cursor-not-allowed' };
    if (isClosed) return { label: 'Applications Closed', disabled: true, icon: Lock, cls: 'bg-red-50 text-red-400 cursor-not-allowed' };
    if (isFilled) return { label: 'Position Filled', disabled: true, icon: CheckCircle2, cls: 'bg-slate-100 text-slate-400 cursor-not-allowed' };
    return { label: 'View Details', disabled: false, icon: ChevronRight, cls: 'bg-primary-900 text-white hover:bg-primary-800 hover:shadow-md active:scale-[0.97]' };
  };
  const btn = buttonConfig();
  const BtnIcon = btn.icon;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ delay: ji * 0.04 }}
      className="relative p-3 sm:p-4 hover:bg-primary-50/40 transition-all duration-200 group hover:-translate-y-0.5 hover:shadow-md"
    >
      {/* Left accent border */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${theme.accentBar} group-hover:w-1.5 transition-all duration-200`} />

      {/* Badges row */}
      <div className="flex flex-wrap items-center gap-1.5 mb-2 pl-1">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${theme.badgeBg} ${theme.badgeText} border ${theme.badgeBorder}`}>
          {empLabel}
        </span>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${sBadge.cls}`}>
          <SIcon className="w-3 h-3" />
          {sBadge.text}
        </span>
        {Number(job.application_fee_amount ?? 0) === 0 && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            No Fee
          </span>
        )}
      </div>

      {/* Position title */}
      <h4 className="text-base sm:text-lg font-bold text-primary-900 group-hover:text-primary-700 transition-colors mb-2.5 pl-1">
        {job.title}
      </h4>

      {/* Details grid — compact */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-3 gap-y-2 mb-3 pl-1">
        {(() => {
          const loc = job.location?.trim() || (job.location_type === 'Remote' ? 'Remote' : (job.location_type === 'State-wide' ? 'Maharashtra' : ''));
          return loc ? <DetailItem icon={MapPin} label="Location" value={loc} /> : null;
        })()}
        {job.total_vacancies != null && (
          <DetailItem icon={Users} label="Vacancies" value={`${fmtNum(job.total_vacancies)} Vacanc${job.total_vacancies !== 1 ? 'ies' : 'y'}`} />
        )}
        {job.vacancies_per_district != null && job.vacancies_per_district > 0 && (
          <DetailItem icon={MapPin} label="Per District" value={fmtNum(job.vacancies_per_district)} />
        )}
        {(() => {
          const isDistLevel = job.vacancy_level === 'district' || job.vacancy_allocations?.vacancy_level === 'district';
          return !isDistLevel && job.vacancies_per_taluka != null && job.vacancies_per_taluka > 0 ? (
            <DetailItem icon={MapPin} label="Per Taluka" value={fmtNum(job.vacancies_per_taluka)} />
          ) : null;
        })()}
        {(() => {
          const rawCrit = Array.isArray(job.eligibility_criteria) ? job.eligibility_criteria[0] : null;
          const qual = typeof rawCrit === 'string' ? rawCrit.trim() : (rawCrit as { label?: string } | null)?.label?.trim();
          return qual ? <DetailItem icon={GraduationCap} label="Qualification" value={qual} /> : null;
        })()}
        {job.experience_required?.trim() ? (
          <DetailItem icon={Clock} label="Experience" value={job.experience_required.trim()} />
        ) : null}
        {(job.min_age != null || job.max_age != null) && (
          <DetailItem
            icon={Calendar}
            label="Age Limit"
            value={
              job.min_age != null && job.max_age != null
                ? `${job.min_age}–${job.max_age} Years`
                : job.min_age != null ? `Min ${job.min_age} Years` : `Max ${job.max_age} Years`
            }
          />
        )}
        {salaryDisplay && (
          <DetailItem icon={IndianRupee} label="Salary / Honorarium" value={salaryDisplay} highlight />
        )}
        {(() => { const sp = formatSalaryPackage(job); return sp && <DetailItem icon={IndianRupee} label="Salary Package" value={sp} />; })()}
        {job.application_fee_amount != null && (
          <DetailItem
            icon={IndianRupee}
            label="Application Fee"
            value={Number(job.application_fee_amount) === 0 ? 'Free' : `₹${fmtNum(Number(job.application_fee_amount))}`}
            feeHighlight={Number(job.application_fee_amount) > 0}
          />
        )}
        {recModeLabel?.trim() ? (
          <DetailItem icon={Briefcase} label="Recruitment Mode" value={recModeLabel.trim()} />
        ) : null}
      </div>

      {/* Footer: date badges (left) + button (right) */}
      <div className="flex flex-wrap items-center justify-between gap-2 pl-1">
        {/* Date info */}
        <div className="flex flex-wrap gap-2">
          {showOpenDate && (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-1.5 rounded-lg">
              <Clock className="w-3.5 h-3.5" />
              Applications Open On: {fmtDate(job.publish_date)}
            </div>
          )}
          {showDeadline && (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-orange-700 bg-orange-50 px-2.5 py-1.5 rounded-lg">
              <CalendarClock className="w-3.5 h-3.5" />
              Application Last Date: {fmtDate(job.closing_date)}
            </div>
          )}
          {showNeverClose && (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg">
              <Clock className="w-3.5 h-3.5" />
              Applications Open Until Further Notice
            </div>
          )}
        </div>

        {/* Action button — bottom-right, content-width */}
        {btn.disabled || !job.slug ? (
          <button
            type="button"
            disabled
            className={`inline-flex items-center justify-center gap-1.5 px-5 py-2.5 text-sm font-bold rounded-xl transition-all min-h-[42px] ${btn.cls}`}
          >
            {btn.label}
            <BtnIcon className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onClick}
            className={`inline-flex items-center justify-center gap-1.5 px-5 py-2.5 text-sm font-bold rounded-xl transition-all touch-manipulation min-h-[42px] ${btn.cls}`}
          >
            {btn.label}
            <BtnIcon className="w-4 h-4" />
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ─── Sub-component: detail item ───────────────────────────────────────────────

function DetailItem({
  icon: Icon,
  label,
  value,
  highlight = false,
  feeHighlight = false,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  highlight?: boolean;
  feeHighlight?: boolean;
}) {
  return (
    <div className="flex items-start gap-1.5">
      <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5 ${
        highlight ? 'bg-emerald-100' : feeHighlight ? 'bg-amber-100' : 'bg-primary-100'
      }`}>
        <Icon className={`w-3 h-3 ${
          highlight ? 'text-emerald-700' : feeHighlight ? 'text-amber-700' : 'text-primary-500'
        }`} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-primary-400 font-medium leading-none mb-0.5">{label}</p>
        <p className={`text-xs sm:text-[13px] font-semibold leading-snug truncate ${
          highlight ? 'text-emerald-800' : feeHighlight ? 'text-amber-800' : 'text-primary-800'
        }`}>
          {value}
        </p>
      </div>
    </div>
  );
}

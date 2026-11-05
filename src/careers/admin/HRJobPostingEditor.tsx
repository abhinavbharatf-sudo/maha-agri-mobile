import { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Edit2, ArrowRight, Briefcase, CheckCircle, AlertCircle, Archive, Eye, X,
  Trash2, MoreVertical, Copy, EyeOff, Clock, Star, Flame, ChevronUp, ChevronDown,
  Pin, Search, Filter, Users, FileText, Calendar, TrendingUp, MousePointerClick,
  UserCheck, Award, ArrowLeftCircle, Ban, Send, RotateCcw,
  CalendarClock, Radio, CheckSquare, ShieldAlert, Zap, Activity, Info,
  GraduationCap, HelpCircle, GitBranch, MapPin, IndianRupee, ExternalLink,
  Save, CheckCircle2, ClipboardList, Mail, Settings, Loader2,
  Building2, Globe, Compass, Layers, Calculator, Sliders, Square, ChevronRight,
  Sparkles,
} from 'lucide-react';
import HRBadgeManager from './HRBadgeManager';
import HRFlowManager from './HRFlowManager';
import HRFaqManager from './HRFaqManager';
import HRLocationAndVacancyManager from './components/HRLocationAndVacancyManager';
import HRQuestionnaireBuilder from './components/HRQuestionnaireBuilder';
import { broadcastJobUpdate } from '../lib/jobEvents';
import { supabase } from '../../lib/supabase/client';
import {
  listAllJobs, upsertJob, listWorkflowTemplates, archiveJob, duplicateJob,
  setJobStatus, toggleJobFeatured, toggleJobUrgent, reorderJobs,
  bulkJobStatus, bulkArchiveJobs, getJobStats, getJobAnalytics,
  getJobHealth, type JobHealthData,
} from '../lib/api';
import type {
  RmsJobPosting, RmsWorkflowTemplate, RmsWorkflowStage, RmsJobStats, RmsJobAnalytics,
  JobLocationType, VacancyAllocationsConfig,
} from '../lib/types';
import {
  EMPLOYMENT_TYPE_LABELS, JOB_STATUS_OPTIONS, JOB_STATUS_CONFIG,
  JOB_LOCATION_TYPES, MAHARASHTRA_REGIONS, MAHARASHTRA_DISTRICTS,
} from '../lib/constants';
import {
  calculateVacancies, generatePublicLocationString, validateVacancyAllocations,
} from '../lib/vacancyCalculator';
import { getTalukasForDistrict } from '../../data/maharashtraGeography';

const EMPTY_JOB: Partial<RmsJobPosting> = {
  title: '', slug: '', department: '', location: '', employment_type: 'full_time',
  experience_required: '', status: 'draft',
  experience_details: '',
  description: '', project_duration: '',
  eligibility_criteria: [], required_documents: [], skills_required: [],
  application_fee_amount: 0, onboarding_fee_amount: 0,
  fee_label_application: 'Application Fee', fee_label_onboarding: 'Onboarding Fee',
  total_vacancies: null, vacancies_per_district: null, vacancies_per_taluka: null,
  min_age: null, max_age: null, salary_honorarium: '',
  salary_amount: null, salary_type: null, salary_package_type: null, salary_package_custom: '',
  recruitment_mode: 'Online',
  project_pdf_url: '', project_video_url: '', jd_pdf_url: '',
  project_overview: '',
  recruitment_status: 'open',
  project_pdf_enabled: true,
  project_video_enabled: true,
  jd_pdf_enabled: true,
  is_trashed: false,
  is_featured: false,
  is_urgent: false,
  sort_order: 0,
  publish_date: null,
  closing_date: null,
  application_close_date: null,
  never_close_applications: false,
  display_deadline_public: true,
  acknowledgement_text: '',
  location_type: 'Multiple Locations',
  vacancy_level: 'taluka',
  posting_level: 'Taluka-wise',
  location_questions: null,
  location_regions: [],
  location_districts: [],
  location_talukas: [],
  internal_location: '',
  show_city_publicly: true,
  city_name: '',
  vacancy_allocations: {},
  multiple_locations_config: null,
  auto_calculate_vacancies: false,
  questionnaire: null,
};

// ─── Unified Form Tabs ────────────────────────────────────────────────────────
const FORM_TABS = [
  { id: 'position',       label: '1. Position Setup',           icon: Briefcase     },
  { id: 'qualifications', label: '2. Qualifications & Media',    icon: FileText      },
  { id: 'workflow',       label: '3. Workflow & Badges',        icon: GitBranch     },
  { id: 'questionnaire',  label: '4. Job-Specific Questionnaire', icon: ClipboardList },
  { id: 'faqs',           label: '5. FAQs & Declaration',       icon: HelpCircle    },
  { id: 'scheduling',     label: '6. Scheduling & Publish',      icon: CalendarClock },
] as const;

type FormTabId = typeof FORM_TABS[number]['id'];

// ─── Quick Action Menu Items ──────────────────────────────────────────────
type ActionKey =
  | 'edit' | 'preview' | 'publish' | 'hide' | 'coming_soon'
  | 'close_apps' | 'mark_filled' | 'duplicate' | 'archive'
  | 'feature' | 'unfeature' | 'urgent' | 'unurgent'
  | 'move_up' | 'move_down' | 'pin_top';

interface ActionItem {
  key: ActionKey;
  label: string;
  icon: React.ElementType;
  color: string;
}

function getActionsForJob(job: RmsJobPosting): ActionItem[] {
  const items: ActionItem[] = [
    { key: 'edit',       label: 'Edit',                icon: Edit2,       color: 'text-primary-600' },
    { key: 'preview',    label: 'Preview',             icon: Eye,         color: 'text-primary-600' },
  ];
  if (job.status !== 'published')
    items.push({ key: 'publish',    label: 'Publish',            icon: Send,        color: 'text-emerald-600' });
  if (job.status !== 'hidden')
    items.push({ key: 'hide',       label: 'Hide',               icon: EyeOff,      color: 'text-neutral-600' });
  if (job.status !== 'coming_soon')
    items.push({ key: 'coming_soon', label: 'Coming Soon',       icon: Clock,       color: 'text-blue-600' });
  if (job.status !== 'applications_closed')
    items.push({ key: 'close_apps', label: 'Close Applications', icon: Ban,         color: 'text-orange-600' });
  if (job.status !== 'filled')
    items.push({ key: 'mark_filled', label: 'Mark as Filled',    icon: CheckCircle, color: 'text-purple-600' });
  items.push({ key: 'duplicate',  label: 'Duplicate Job',       icon: Copy,        color: 'text-primary-600' });
  if (job.is_featured)
    items.push({ key: 'unfeature',  label: 'Remove Featured',    icon: Star,        color: 'text-amber-600' });
  else
    items.push({ key: 'feature',    label: 'Mark as Featured',   icon: Star,        color: 'text-amber-600' });
  if (job.is_urgent)
    items.push({ key: 'unurgent',   label: 'Remove Urgent',      icon: Flame,       color: 'text-red-600' });
  else
    items.push({ key: 'urgent',     label: 'Mark Urgent Hiring', icon: Flame,      color: 'text-red-600' });
  items.push({ key: 'move_up',    label: 'Move Up',              icon: ChevronUp,   color: 'text-primary-500' });
  items.push({ key: 'move_down',  label: 'Move Down',            icon: ChevronDown, color: 'text-primary-500' });
  items.push({ key: 'pin_top',    label: 'Pin to Top',          icon: Pin,         color: 'text-primary-500' });
  items.push({ key: 'archive',    label: 'Archive',             icon: Archive,     color: 'text-amber-600' });
  return items;
}

// ─── Stats Bar ─────────────────────────────────────────────────────────────
function StatsBar({ stats }: { stats: RmsJobStats | null }) {
  if (!stats) return null;
  const items = [
    { label: 'Apps',      value: stats.total,             color: 'text-primary-600' },
    { label: 'Shortlist',  value: stats.shortlisted,       color: 'text-blue-600' },
    { label: 'Interview',  value: stats.interview_scheduled, color: 'text-amber-600' },
    { label: 'Selected',   value: stats.selected,         color: 'text-purple-600' },
    { label: 'Joined',     value: stats.joined,            color: 'text-emerald-600' },
    { label: 'Rejected',   value: stats.rejected,          color: 'text-red-500' },
  ];
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
      {items.map(s => (
        <span key={s.label} className="text-[11px] font-medium">
          <span className={s.color}>{s.value}</span>
          <span className="text-primary-400 ml-0.5">{s.label}</span>
        </span>
      ))}
    </div>
  );
}

// ─── Analytics Row ─────────────────────────────────────────────────────────
function AnalyticsRow({ analytics }: { analytics: RmsJobAnalytics | null }) {
  if (!analytics) return null;
  const rate = analytics.apps_started > 0
    ? Math.round((analytics.apps_completed / analytics.apps_started) * 100)
    : 0;
  const items = [
    { icon: Eye,             label: 'Views',     value: analytics.views },
    { icon: Users,           label: 'Unique',    value: analytics.unique_visitors },
    { icon: MousePointerClick, label: 'Clicks',   value: analytics.apply_clicks },
    { icon: FileText,        label: 'Started',    value: analytics.apps_started },
    { icon: CheckCircle,     label: 'Completed',  value: analytics.apps_completed },
    { icon: TrendingUp,      label: 'Conv. Rate', value: `${rate}%` },
  ];
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 pt-1.5 border-t border-primary-50">
      {items.map(a => (
        <span key={a.label} className="flex items-center gap-1 text-[11px] text-primary-500">
          <a.icon className="w-3 h-3" />
          <span className="font-semibold text-primary-700">{a.value}</span>
          {a.label}
        </span>
      ))}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────
export default function HRJobPostingEditor() {
  const [jobs, setJobs] = useState<RmsJobPosting[]>([]);
  const [templates, setTemplates] = useState<(RmsWorkflowTemplate & { stages: RmsWorkflowStage[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const [showForm, setShowForm] = useState(searchParams.get('new') === '1');
  const [activeTab, setActiveTab] = useState<FormTabId>('position');
  const [formData, setFormData] = useState<Partial<RmsJobPosting>>(EMPTY_JOB);
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  const [saving, setSaving] = useState(false);
  const [eligInput, setEligInput] = useState('');
  const [docInput, setDocInput] = useState('');
  const [skillInput, setSkillInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<RmsJobPosting | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);

  // Quick action menu
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Stats and analytics
  const [statsMap, setStatsMap] = useState<Record<string, RmsJobStats>>({});
  const [analyticsMap, setAnalyticsMap] = useState<Record<string, RmsJobAnalytics>>({});

  // Search & filters
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterFeatured, setFilterFeatured] = useState('all');
  const [filterUrgent, setFilterUrgent] = useState('all');

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<string | null>(null);

  // Expanded analytics
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);

  // Authentication status check
  const [authWarning, setAuthWarning] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session?.user) {
        setAuthWarning('You are currently viewing in read-only preview mode. Please sign in with an authorized admin account to modify or publish positions.');
      } else {
        setAuthWarning(null);
      }
    });
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenuId(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const load = () => Promise.all([listAllJobs(), listWorkflowTemplates()]).then(([j, t]) => {
    setJobs(j.data); setTemplates(t.data); setLoading(false);
    // Load stats and analytics for each job
    j.data.forEach(job => {
      getJobStats(job.id).then(r => { if (r.data) setStatsMap(prev => ({ ...prev, [job.id]: r.data! })); });
      getJobAnalytics(job.id).then(r => { if (r.data) setAnalyticsMap(prev => ({ ...prev, [job.id]: r.data! })); });
    });
  });

  useEffect(() => { load(); }, []);

  const set = (key: keyof RmsJobPosting, v: unknown) => setFormData(f => ({ ...f, [key]: v }));

  const generateSlug = (title: string) =>
    title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4500);
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async (
    e?: React.FormEvent,
    mode: 'continue' | 'close' | 'stay' = 'continue',
  ) => {
    if (e) e.preventDefault();
    if (!formData.title?.trim()) {
      setActiveTab('position');
      return setError('Job Title is required in Position Setup.');
    }

    // Validate City-specific configuration
    if (formData.location_type === 'City-specific') {
      const mode = formData.vacancy_allocations?.city_selection_mode || 'single';
      if (mode === 'single') {
        if (!formData.city_name?.trim()) {
          setActiveTab('position');
          return setError('City / Headquarters Name is required for City-specific positions.');
        }
      } else {
        const cities = formData.vacancy_allocations?.cities || [];
        if (cities.length === 0) {
          setActiveTab('position');
          return setError('Please configure at least one city in Position Setup.');
        }
        const seenCombinations = new Set<string>();
        for (let i = 0; i < cities.length; i++) {
          const c = cities[i];
          if (!c.cityName?.trim()) {
            setActiveTab('position');
            return setError(`City Location #${i + 1} is missing a City Name.`);
          }
          if (!c.parentDistrict?.trim()) {
            setActiveTab('position');
            return setError(`City Location #${i + 1} (${c.cityName}) is missing a Parent District.`);
          }
          const combo = `${c.cityName.trim().toLowerCase()}::${c.parentDistrict.trim().toLowerCase()}`;
          if (seenCombinations.has(combo)) {
            setActiveTab('position');
            return setError(`Duplicate City and Parent District detected for "${c.cityName}". Each city location must be unique.`);
          }
          seenCombinations.add(combo);
        }
      }
    }

    // Validate vacancy allocation consistency before publishing or on save & close
    if (formData.status === 'published' || (formData.auto_calculate_vacancies && mode === 'close')) {
      const validation = validateVacancyAllocations(formData);
      if (!validation.isValid && validation.error) {
        setActiveTab('position');
        return setError(validation.error);
      }
    }

    setSaving(true);
    setError(null);

    // Auto-commit any pending inputs that the user typed but didn't click "Add" for
    let currentEligibility = Array.isArray(formData.eligibility_criteria)
      ? (formData.eligibility_criteria as any[]).map(item =>
          typeof item === 'string' ? { label: item, required: true } : item
        )
      : [];
    if (eligInput.trim()) {
      currentEligibility = [...currentEligibility, { label: eligInput.trim(), required: true }];
      setEligInput('');
    }

    let currentSkills = Array.isArray(formData.skills_required)
      ? [...(formData.skills_required as string[])]
      : [];
    if (skillInput.trim() && !currentSkills.includes(skillInput.trim())) {
      currentSkills = [...currentSkills, skillInput.trim()];
      setSkillInput('');
    }

    let currentDocs = Array.isArray(formData.required_documents)
      ? (formData.required_documents as any[]).map(item =>
          typeof item === 'string' ? { key: item.toLowerCase().replace(/\s+/g, '_'), label: item } : item
        )
      : [];
    if (docInput.trim()) {
      currentDocs = [
        ...currentDocs,
        { key: docInput.trim().toLowerCase().replace(/\s+/g, '_'), label: docInput.trim() },
      ];
      setDocInput('');
    }

    const payload = {
      ...formData,
      eligibility_criteria: currentEligibility,
      skills_required: currentSkills,
      required_documents: currentDocs,
    };
    if (!payload.slug?.trim() && payload.title?.trim()) payload.slug = generateSlug(payload.title);
    if (!payload.id && !payload.created_by) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) payload.created_by = user.id;
    }
    if (payload.vacancy_level) {
      payload.vacancy_allocations = {
        ...(payload.vacancy_allocations ?? {}),
        vacancy_level: payload.vacancy_level,
      };
      delete payload.vacancy_level;
    }
    if (payload.posting_level) {
      payload.vacancy_allocations = {
        ...(payload.vacancy_allocations ?? {}),
        posting_level: payload.posting_level,
      };
      delete payload.posting_level;
    }
    if (payload.location_questions) {
      payload.vacancy_allocations = {
        ...(payload.vacancy_allocations ?? {}),
        location_questions: payload.location_questions,
      };
      delete payload.location_questions;
    }
    if (payload.multiple_locations_config !== undefined) {
      payload.vacancy_allocations = {
        ...(payload.vacancy_allocations ?? {}),
        multiple_locations_config: payload.multiple_locations_config,
      };
      delete (payload as any).multiple_locations_config;
    }
    const { data: savedJob, error: err } = await upsertJob(payload);
    setSaving(false);
    if (err) return setError(err.message || 'Failed to save position. Please try again.');

    showSuccess('Changes saved successfully.');
    if (savedJob) {
      setFormData(savedJob);
      setIsSlugManuallyEdited(Boolean(savedJob.slug && savedJob.title && savedJob.slug !== generateSlug(savedJob.title)));
      broadcastJobUpdate(savedJob);
    }
    load();

    if (mode === 'close') {
      setShowForm(false);
      setFormData(EMPTY_JOB);
      setIsSlugManuallyEdited(false);
    } else if (mode === 'continue') {
      const currentIdx = FORM_TABS.findIndex(t => t.id === activeTab);
      if (currentIdx >= 0 && currentIdx < FORM_TABS.length - 1) {
        setActiveTab(FORM_TABS[currentIdx + 1].id);
      }
    }
  };

  // ── Preview ────────────────────────────────────────────────────────────────
  const handlePreview = (job: Partial<RmsJobPosting>) => {
    if (!job.slug) return;
    window.open(`/careers/jobs/${job.slug}`, '_blank', 'noopener,noreferrer');
  };

  // ── Archive ────────────────────────────────────────────────────────────────
  const handleArchive = async () => {
    if (!archiveTarget) return;
    setArchiving(true); setArchiveError(null);
    const { error: err } = await archiveJob(archiveTarget.id);
    setArchiving(false);
    if (err) { setArchiveError(err.message); return; }
    setArchiveTarget(null);
    showSuccess(`"${archiveTarget.title}" has been moved to trash.`);
    load();
  };

  // ── Open Edit Form ────────────────────────────────────────────────────────
  const openEditForm = (job: RmsJobPosting) => {
    const isCustomSlug = Boolean(job.slug && job.title && job.slug !== generateSlug(job.title));
    setIsSlugManuallyEdited(isCustomSlug);

    const normalizedEligibility = Array.isArray(job.eligibility_criteria)
      ? job.eligibility_criteria.map(item =>
          typeof item === 'string' ? { label: item, required: true } : item
        )
      : [];
    const normalizedDocs = Array.isArray(job.required_documents)
      ? job.required_documents.map(item =>
          typeof item === 'string' ? { key: item.toLowerCase().replace(/\s+/g, '_'), label: item } : item
        )
      : [];
    const normalizedSkills = Array.isArray(job.skills_required) ? job.skills_required : [];

    setFormData({
      ...EMPTY_JOB,
      ...job,
      project_overview: job.project_overview || '',
      experience_details: job.experience_details || job.vacancy_allocations?.experience_details || '',
      eligibility_criteria: normalizedEligibility,
      required_documents: normalizedDocs,
      skills_required: normalizedSkills,
      location_type: job.location_type || 'Multiple Locations',
      location_districts: job.location_districts || [],
      location_regions: job.location_regions || [],
      location_talukas: job.location_talukas || [],
      show_city_publicly: job.show_city_publicly !== false,
      city_name: job.city_name || '',
      internal_location: job.internal_location || '',
      project_pdf_enabled: job.project_pdf_enabled !== false,
      project_video_enabled: job.project_video_enabled !== false,
      jd_pdf_enabled: job.jd_pdf_enabled !== false,
      vacancy_level: job.vacancy_level || job.vacancy_allocations?.vacancy_level || 'taluka',
      posting_level: job.posting_level || job.vacancy_allocations?.posting_level || (
        job.vacancy_level === 'district' || job.vacancy_allocations?.vacancy_level === 'district'
          ? 'District-wise'
          : 'Taluka-wise'
      ),
      location_questions: job.location_questions || job.vacancy_allocations?.location_questions || null,
      auto_calculate_vacancies: !!job.auto_calculate_vacancies,
      multiple_locations_config: job.multiple_locations_config || job.vacancy_allocations?.multiple_locations_config || null,
      vacancy_allocations: job.vacancy_allocations || {},
      questionnaire: job.questionnaire || (job.vacancy_allocations as any)?.questionnaire || null,
    });
    setEligInput('');
    setDocInput('');
    setSkillInput('');
    setActiveTab('position');
    setShowForm(true);
  };

  // ── Quick Actions ──────────────────────────────────────────────────────────
  const handleAction = async (action: ActionKey, job: RmsJobPosting) => {
    setOpenMenuId(null);
    setError(null);
    switch (action) {
      case 'edit':
        openEditForm(job);
        break;
      case 'preview':
        handlePreview(job);
        break;
      case 'publish': {
        const validation = validateVacancyAllocations(job);
        if (!validation.isValid && validation.error) {
          setError(validation.error);
          break;
        }
        const { error: err } = await setJobStatus(job.id, 'published');
        if (err) { setError(err); break; }
        showSuccess(`"${job.title}" published.`); load(); break;
      }
      case 'hide': {
        const { error: err } = await setJobStatus(job.id, 'hidden');
        if (err) { setError(err); break; }
        showSuccess(`"${job.title}" hidden.`); load(); break;
      }
      case 'coming_soon': {
        const { error: err } = await setJobStatus(job.id, 'coming_soon');
        if (err) { setError(err); break; }
        showSuccess(`"${job.title}" marked as Coming Soon.`); load(); break;
      }
      case 'close_apps': {
        const { error: err } = await setJobStatus(job.id, 'applications_closed');
        if (err) { setError(err); break; }
        showSuccess(`Applications closed for "${job.title}".`); load(); break;
      }
      case 'mark_filled': {
        const { error: err } = await setJobStatus(job.id, 'filled');
        if (err) { setError(err); break; }
        showSuccess(`"${job.title}" marked as Filled.`); load(); break;
      }
      case 'duplicate': {
        const { data, error: dupErr } = await duplicateJob(job.id);
        if (dupErr) { setError(dupErr); break; }
        showSuccess(`Duplicated "${job.title}" as "${data?.title}".`); load(); break;
      }
      case 'feature': {
        const { error: err } = await toggleJobFeatured(job.id, true);
        if (err) { setError(err); break; }
        showSuccess(`"${job.title}" marked as Featured.`); load(); break;
      }
      case 'unfeature': {
        const { error: err } = await toggleJobFeatured(job.id, false);
        if (err) { setError(err); break; }
        showSuccess(`Removed Featured from "${job.title}".`); load(); break;
      }
      case 'urgent': {
        const { error: err } = await toggleJobUrgent(job.id, true);
        if (err) { setError(err); break; }
        showSuccess(`"${job.title}" marked as Urgent Hiring.`); load(); break;
      }
      case 'unurgent': {
        const { error: err } = await toggleJobUrgent(job.id, false);
        if (err) { setError(err); break; }
        showSuccess(`Removed Urgent from "${job.title}".`); load(); break;
      }
      case 'archive':
        setArchiveTarget(job); setArchiveError(null); break;
      case 'move_up':
      case 'move_down':
      case 'pin_top': {
        const sorted = [...filteredJobs];
        const idx = sorted.findIndex(j => j.id === job.id);
        if (idx === -1) break;
        if (action === 'pin_top') {
          const [item] = sorted.splice(idx, 1);
          sorted.unshift(item);
        } else if (action === 'move_up' && idx > 0) {
          [sorted[idx - 1], sorted[idx]] = [sorted[idx], sorted[idx - 1]];
        } else if (action === 'move_down' && idx < sorted.length - 1) {
          [sorted[idx], sorted[idx + 1]] = [sorted[idx + 1], sorted[idx]];
        }
        const { error: err } = await reorderJobs(sorted.map(j => j.id));
        if (err) { setError(err); break; }
        showSuccess('Job order updated.');
        load(); break;
      }
    }
  };

  // ── Bulk Actions ───────────────────────────────────────────────────────────
  const handleBulkAction = async (action: string) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    let err: { message?: string } | null = null;
    switch (action) {
      case 'publish':        err = await bulkJobStatus(ids, 'published'); break;
      case 'hide':           err = await bulkJobStatus(ids, 'hidden'); break;
      case 'archive':        err = await bulkArchiveJobs(ids); break;
      case 'close_apps':     err = await bulkJobStatus(ids, 'applications_closed'); break;
    }
    if (err?.message) { setError(err.message); setBulkAction(null); return; }
    showSuccess(`${ids.length} job(s) updated.`);
    setSelectedIds(new Set());
    setBulkAction(null);
    load();
  };

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filteredJobs = useMemo(() => {
    let result = [...jobs];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(j =>
        j.title.toLowerCase().includes(q) ||
        j.department?.toLowerCase().includes(q) ||
        j.location?.toLowerCase().includes(q) ||
        j.slug.toLowerCase().includes(q)
      );
    }
    if (filterStatus !== 'all') result = result.filter(j => j.status === filterStatus);
    if (filterFeatured === 'yes') result = result.filter(j => j.is_featured);
    if (filterFeatured === 'no') result = result.filter(j => !j.is_featured);
    if (filterUrgent === 'yes') result = result.filter(j => j.is_urgent);
    if (filterUrgent === 'no') result = result.filter(j => !j.is_urgent);
    result.sort((a, b) => {
      if ((b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0) !== 0)
        return (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0);
      if ((b.is_urgent ? 1 : 0) - (a.is_urgent ? 1 : 0) !== 0)
        return (b.is_urgent ? 1 : 0) - (a.is_urgent ? 1 : 0);
      return (b.sort_order ?? 0) - (a.sort_order ?? 0);
    });
    return result;
  }, [jobs, search, filterStatus, filterFeatured, filterUrgent]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredJobs.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredJobs.map(j => j.id)));
  };

  // ── Eligibility / Document / Skill helpers ─────────────────────────────────
  const addEligibility = () => {
    if (!eligInput.trim()) return;
    const current = Array.isArray(formData.eligibility_criteria)
      ? (formData.eligibility_criteria as any[]).map(item =>
          typeof item === 'string' ? { label: item, required: true } : item
        )
      : [];
    set('eligibility_criteria', [...current, { label: eligInput.trim(), required: true }]);
    setEligInput('');
  };
  const removeEligibility = (i: number) => {
    const list = Array.isArray(formData.eligibility_criteria)
      ? (formData.eligibility_criteria as any[]).map(item =>
          typeof item === 'string' ? { label: item, required: true } : item
        )
      : [];
    list.splice(i, 1);
    set('eligibility_criteria', list);
  };

  const addSkill = () => {
    if (!skillInput.trim()) return;
    const current = Array.isArray(formData.skills_required) ? (formData.skills_required as string[]) : [];
    if (!current.includes(skillInput.trim())) {
      set('skills_required', [...current, skillInput.trim()]);
    }
    setSkillInput('');
  };
  const removeSkill = (i: number) => {
    const list = Array.isArray(formData.skills_required) ? [...(formData.skills_required as string[])] : [];
    list.splice(i, 1);
    set('skills_required', list);
  };

  const addDocument = () => {
    if (!docInput.trim()) return;
    const key = docInput.trim().toLowerCase().replace(/\s+/g, '_');
    const current = Array.isArray(formData.required_documents)
      ? (formData.required_documents as any[]).map(item =>
          typeof item === 'string' ? { key: item.toLowerCase().replace(/\s+/g, '_'), label: item } : item
        )
      : [];
    set('required_documents', [...current, { key, label: docInput.trim() }]);
    setDocInput('');
  };
  const removeDocument = (i: number) => {
    const list = Array.isArray(formData.required_documents)
      ? (formData.required_documents as any[]).map(item =>
          typeof item === 'string' ? { key: item.toLowerCase().replace(/\s+/g, '_'), label: item } : item
        )
      : [];
    list.splice(i, 1);
    set('required_documents', list);
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* Archive confirmation dialog */}
      <AnimatePresence>
        {archiveTarget && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={e => e.target === e.currentTarget && !archiving && setArchiveTarget(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 12 }}
              transition={{ type: 'spring', stiffness: 320, damping: 30 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="flex items-start gap-4 p-6 pb-4">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                  <Archive className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-primary-900">Archive Job Posting</h3>
                  <p className="text-sm text-primary-500 mt-0.5">Archive this job? It will no longer be visible to applicants.</p>
                </div>
                <button onClick={() => { setArchiveTarget(null); setArchiveError(null); }} disabled={archiving}
                  className="p-1.5 rounded-lg text-primary-400 hover:text-primary-600 hover:bg-primary-50 transition-colors disabled:opacity-40">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="px-6 pb-4">
                <div className="p-3 bg-primary-50 rounded-xl border border-primary-100">
                  <p className="text-sm font-semibold text-primary-900 truncate">{archiveTarget.title}</p>
                  {archiveTarget.department && <p className="text-xs text-primary-500 mt-0.5">{archiveTarget.department}</p>}
                </div>
                <p className="text-sm text-amber-600 font-medium mt-3">This Job will be moved to Trash. Existing applications will remain safe.</p>
                {archiveError && (
                  <div className="flex items-start gap-2 mt-3 p-3 bg-red-50 border border-red-100 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-red-700">{archiveError}</p>
                  </div>
                )}
              </div>
              <div className="flex gap-3 px-6 pb-6">
                <button type="button" onClick={() => { setArchiveTarget(null); setArchiveError(null); }} disabled={archiving}
                  className="flex-1 py-2.5 border-2 border-primary-200 text-primary-700 font-semibold rounded-xl hover:bg-primary-50 text-sm transition-colors disabled:opacity-40">
                  Cancel
                </button>
                <button type="button" onClick={handleArchive} disabled={archiving}
                  className="flex-1 py-2.5 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 text-sm transition-colors disabled:opacity-60">
                  {archiving ? 'Archiving…' : 'Archive Job'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success notification */}
      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-2.5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800 font-medium shadow-sm"
          >
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            {successMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error notification for Quick Actions */}
      <AnimatePresence>
        {error && !showForm && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="flex items-center justify-between p-3.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800 font-medium shadow-sm"
          >
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 text-xs font-semibold ml-3">
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Unauthenticated session notice */}
      {authWarning && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-800 shadow-sm">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{authWarning}</span>
          </div>
          <Link to="/login" className="px-3 py-1 bg-amber-600 text-white rounded-lg font-bold hover:bg-amber-700 transition-colors shrink-0 ml-3">
            Sign In
          </Link>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-primary-900">Position &amp; Job Postings</h2>
          <p className="text-sm text-primary-500">{jobs.length} total positions</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/admin/rms/trash" className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-primary-600 hover:text-primary-800 bg-white border border-primary-200 rounded-xl hover:bg-primary-50 transition-colors">
            <Trash2 className="w-3.5 h-3.5" /> Job Trash
          </Link>
          <button onClick={() => { setFormData(EMPTY_JOB); setIsSlugManuallyEdited(false); setActiveTab('position'); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-primary-900 text-white text-sm font-bold rounded-xl hover:bg-primary-800 transition-colors">
            <Plus className="w-4 h-4" /> New Position
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-xl border border-primary-100 p-3 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by title, department, location..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-primary-200 rounded-lg focus:outline-none focus:border-primary-500"
            />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="border border-primary-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500 bg-white">
            <option value="all">All Status</option>
            {JOB_STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select value={filterFeatured} onChange={e => setFilterFeatured(e.target.value)}
            className="border border-primary-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500 bg-white">
            <option value="all">All Featured</option>
            <option value="yes">Featured Only</option>
            <option value="no">Not Featured</option>
          </select>
          <select value={filterUrgent} onChange={e => setFilterUrgent(e.target.value)}
            className="border border-primary-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500 bg-white">
            <option value="all">All Urgent</option>
            <option value="yes">Urgent Only</option>
            <option value="no">Not Urgent</option>
          </select>
        </div>

        {/* Bulk Actions Bar */}
        {selectedIds.size > 0 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            className="flex flex-wrap items-center gap-2 pt-2 border-t border-primary-100">
            <span className="text-sm font-semibold text-primary-700">{selectedIds.size} selected</span>
            <button onClick={() => handleBulkAction('publish')} className="px-3 py-1.5 text-xs font-semibold bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200 hover:bg-emerald-100 transition-colors">Bulk Publish</button>
            <button onClick={() => handleBulkAction('hide')} className="px-3 py-1.5 text-xs font-semibold bg-neutral-100 text-neutral-700 rounded-lg border border-neutral-200 hover:bg-neutral-200 transition-colors">Bulk Hide</button>
            <button onClick={() => handleBulkAction('close_apps')} className="px-3 py-1.5 text-xs font-semibold bg-orange-50 text-orange-700 rounded-lg border border-orange-200 hover:bg-orange-100 transition-colors">Bulk Close Apps</button>
            <button onClick={() => handleBulkAction('archive')} className="px-3 py-1.5 text-xs font-semibold bg-amber-50 text-amber-700 rounded-lg border border-amber-200 hover:bg-amber-100 transition-colors">Bulk Archive</button>
            <button onClick={() => setSelectedIds(new Set())} className="px-3 py-1.5 text-xs font-semibold text-primary-500 hover:text-primary-700 transition-colors">Clear</button>
          </motion.div>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          5-TAB UNIFIED POSITION CREATION & EDITING WIZARD
      ════════════════════════════════════════════════════════════════════════ */}
      {showForm && (
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border-2 border-primary-200 shadow-xl overflow-hidden">
          
          {/* Top Form Header */}
          <div className="p-4 sm:p-5 border-b border-primary-100 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-primary-50/50 to-white">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-primary-900">
                  {formData.id ? `Edit Position: ${formData.title || 'Untitled'}` : 'Create New Position'}
                </h3>
                {formData.id && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold border border-emerald-200">
                    ID: {formData.id.slice(0, 8)}…
                  </span>
                )}
              </div>
              <p className="text-xs text-primary-500 mt-0.5">
                Unified Position Configuration • Database-backed &amp; synchronized with public Careers Portal
              </p>
            </div>
            <div className="flex items-center gap-2">
              {formData.slug && (
                <button type="button" onClick={() => handlePreview(formData)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary-700 bg-primary-100 hover:bg-primary-200 rounded-lg transition-colors">
                  <Eye className="w-3.5 h-3.5" /> Preview Public View
                </button>
              )}
              <button type="button" onClick={() => { setShowForm(false); setError(null); }}
                className="p-1.5 text-primary-400 hover:text-primary-600 rounded-lg hover:bg-primary-100 transition-colors" title="Close Form">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* 5-Tab Bar */}
          <div className="flex overflow-x-auto border-b border-primary-100 bg-slate-50/60 px-1 sm:px-2 scrollbar-thin scrollbar-thumb-primary-200">
            {FORM_TABS.map(tab => {
              const active = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-xs font-bold whitespace-nowrap border-b-2 transition-all shrink-0 ${
                    active
                      ? 'border-primary-900 text-primary-900 bg-white shadow-sm'
                      : 'border-transparent text-primary-500 hover:text-primary-800 hover:bg-slate-100/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? 'text-primary-900' : 'text-primary-400'}`} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Form Content */}
          <form onSubmit={e => handleSave(e, 'continue')} className="p-4 sm:p-6 space-y-6">

            {/* ═════ TAB 1: POSITION SETUP ═════ */}
            {activeTab === 'position' && (
              <div className="space-y-6">
                <div className="border-b border-primary-100 pb-3">
                  <h4 className="text-sm font-bold text-primary-900 flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-primary-600" /> Basic Role &amp; Location Details
                  </h4>
                  <p className="text-xs text-primary-500 mt-0.5">Define core identifiers, department, location and employment classification.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { label: 'Job Title *', key: 'title', placeholder: 'e.g. District Coordinator' },
                    { label: 'URL Slug *', key: 'slug', placeholder: 'auto-generated from title' },
                    { label: 'Department / Project', key: 'department', placeholder: 'e.g. MAHA-AGRI PROJECT / Operations' },
                    { label: 'Experience Required', key: 'experience_required', placeholder: 'e.g. 2+ years' },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="block text-xs font-semibold text-primary-700 mb-1.5">{f.label}</label>
                      <input value={(formData[f.key as keyof RmsJobPosting] as string) ?? ''} placeholder={f.placeholder}
                        onChange={e => {
                          const val = e.target.value;
                          if (f.key === 'title') {
                            setFormData(prev => {
                              const isSlugEmpty = !prev.slug || !prev.slug.trim();
                              const shouldAutoSlug = !isSlugManuallyEdited || isSlugEmpty;
                              return {
                                ...prev,
                                title: val,
                                slug: shouldAutoSlug ? generateSlug(val) : prev.slug,
                              };
                            });
                          } else if (f.key === 'slug') {
                            if (!val.trim()) {
                              setIsSlugManuallyEdited(false);
                            } else {
                              setIsSlugManuallyEdited(true);
                            }
                            set('slug', val);
                          } else {
                            set(f.key as keyof RmsJobPosting, val);
                          }
                        }}
                        className="w-full border border-primary-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary-500 bg-white" />
                    </div>
                  ))}
                  <div>
                    <label className="block text-xs font-semibold text-primary-700 mb-1.5">Employment Type</label>
                    <select value={formData.employment_type} onChange={e => set('employment_type', e.target.value)}
                      className="w-full border border-primary-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary-500 bg-white">
                      {Object.entries(EMPLOYMENT_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-primary-700 mb-1.5">Project Duration</label>
                    <input value={formData.project_duration ?? ''} placeholder="e.g. 1 Year / 6 Months / Regular"
                      onChange={e => set('project_duration', e.target.value)}
                      className="w-full border border-primary-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary-500 bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-primary-700 mb-1.5">Recruitment Mode</label>
                    <select value={formData.recruitment_mode ?? 'Online'} onChange={e => set('recruitment_mode', e.target.value)}
                      className="w-full border border-primary-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary-500 bg-white">
                      <option value="Online">Online</option>
                      <option value="Offline">Offline</option>
                      <option value="Hybrid">Hybrid</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-primary-700 mb-1.5">Recruitment Status</label>
                    <select value={formData.recruitment_status ?? 'open'} onChange={e => set('recruitment_status', e.target.value)}
                      className="w-full border border-primary-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary-500 bg-white">
                      <option value="open">Open</option>
                      <option value="filling_fast">Filling Fast</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                </div>

                {/* Smart Location Configuration & Automatic Vacancy Calculator */}
                <HRLocationAndVacancyManager
                  formData={formData}
                  set={set}
                  setFormData={setFormData}
                />

                {/* Fees Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 sm:p-4 bg-amber-50/70 rounded-xl border border-amber-200">
                  <div>
                    <label className="block text-xs font-semibold text-amber-900 mb-1.5">Application Fee (₹) — 0 for Free</label>
                    <input type="number" min="0" step="1" value={formData.application_fee_amount ?? 0}
                      onChange={e => set('application_fee_amount', parseFloat(e.target.value) || 0)}
                      className="w-full border border-amber-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-amber-900 mb-1.5">Onboarding Fee (₹) — 0 for None</label>
                    <input type="number" min="0" step="1" value={formData.onboarding_fee_amount ?? 0}
                      onChange={e => set('onboarding_fee_amount', parseFloat(e.target.value) || 0)}
                      className="w-full border border-amber-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 bg-white" />
                  </div>
                </div>

                {/* Salary / Honorarium Configuration */}
                <div className="border border-primary-200 rounded-xl p-3.5 sm:p-4 bg-primary-50/30 space-y-3">
                  <label className="block text-xs font-bold text-primary-800 uppercase tracking-wide">
                    Salary / Honorarium Configuration (Enterprise HRMS)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-primary-700 mb-1.5">Amount (₹)</label>
                      <input type="number" min="0" step="any"
                        value={formData.salary_amount ?? ''} placeholder="e.g. 35000"
                        onChange={e => set('salary_amount', e.target.value === '' ? null : parseFloat(e.target.value) || null)}
                        className="w-full border border-primary-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary-500 bg-white" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-primary-700 mb-1.5">Salary Type / Frequency</label>
                      <select value={formData.salary_type ?? ''} onChange={e => set('salary_type', e.target.value || null)}
                        className="w-full border border-primary-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary-500 bg-white">
                        <option value="">— Select Frequency —</option>
                        <option>Per Month</option><option>Per Week</option><option>Per Day</option><option>Per Year</option>
                        <option>Per Project</option><option>Per Assignment</option><option>Per Visit</option><option>Per Camp</option>
                        <option>Per Sample</option><option>Per Farmer</option><option>Per Registration</option><option>Per Training</option>
                        <option>Per Survey</option><option>Fixed Amount</option><option>Negotiable</option>
                        <option>As Per Organization Norms</option><option>As Per Government Rules</option>
                        <option>Performance Based</option><option>Commission Based</option><option>Incentive Based</option>
                        <option>Stipend</option><option>Volunteer (No Honorarium)</option><option>Other</option>
                      </select>
                    </div>
                  </div>
                  {formData.salary_type === 'Other' && (
                    <div>
                      <label className="block text-xs font-semibold text-primary-700 mb-1.5">Custom Salary Type Description</label>
                      <input value={formData.salary_honorarium ?? ''} placeholder="Enter custom salary type"
                        onChange={e => set('salary_honorarium', e.target.value)}
                        className="w-full border border-primary-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary-500 bg-white" />
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-semibold text-primary-700 mb-1.5">Salary Package Inclusions</label>
                    <select value={formData.salary_package_type ?? ''} onChange={e => set('salary_package_type', e.target.value || null)}
                      className="w-full border border-primary-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary-500 bg-white">
                      <option value="">— Select Inclusions —</option>
                      <option>Salary Includes Incentive, T.A. &amp; D.A.</option>
                      <option>Salary Excludes Incentive, T.A. &amp; D.A.</option>
                      <option>Salary Includes Incentive Only</option>
                      <option>Salary Excludes Incentive Only</option>
                      <option>Salary Includes T.A. &amp; D.A. Only</option>
                      <option>Salary Excludes T.A. &amp; D.A. Only</option>
                      <option>Fixed Salary (No Additional Benefits)</option>
                      <option>Variable Pay / Performance Incentive</option>
                      <option>Commission Based Earnings</option>
                      <option>As Per Organization Policy</option>
                      <option>Benefits Will Be Discussed During Interview</option>
                      <option>Other</option>
                    </select>
                  </div>
                  {formData.salary_package_type === 'Other' && (
                    <div>
                      <label className="block text-xs font-semibold text-primary-700 mb-1.5">Custom Package Description</label>
                      <input value={formData.salary_package_custom ?? ''} placeholder="Enter custom package description"
                        onChange={e => set('salary_package_custom', e.target.value)}
                        className="w-full border border-primary-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary-500 bg-white" />
                    </div>
                  )}
                </div>

                {/* ── POSITION STATUS & SCHEDULING (ORIGINAL CORE LOCATION) ── */}
                <div className="pt-6 border-t border-primary-200/60 space-y-4">
                  <div className="border-b border-primary-100 pb-3">
                    <h4 className="text-sm font-bold text-primary-900 flex items-center gap-2">
                      <CalendarClock className="w-4 h-4 text-primary-600" /> Position Status, Scheduling & Application Validity
                    </h4>
                    <p className="text-xs text-primary-500 mt-0.5">
                      Configure publishing schedule, application deadlines, and position visibility.
                    </p>
                  </div>

                  {/* Status Selector & Badges */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-primary-700 mb-1.5">Position Status</label>
                      <select value={formData.status} onChange={e => set('status', e.target.value)}
                        className="w-full border border-primary-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary-500 bg-white font-medium">
                        {JOB_STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 sm:gap-4 pt-1 sm:pt-6">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={formData.is_featured ?? false}
                          onChange={e => set('is_featured', e.target.checked)} className="rounded border-amber-300" />
                        <Star className="w-4 h-4 text-amber-500" />
                        <span className="text-xs font-bold text-amber-900">Featured Job</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={formData.is_urgent ?? false}
                          onChange={e => set('is_urgent', e.target.checked)} className="rounded border-red-300" />
                        <Flame className="w-4 h-4 text-red-500" />
                        <span className="text-xs font-bold text-red-900">Urgent Hiring</span>
                      </label>
                    </div>
                  </div>

                  {/* Job Scheduling Component */}
                  <SchedulingSection formData={formData as FormDataType} set={set} />

                  {/* Job Health Card (if editing) */}
                  {formData.id && (
                    <div className="mt-4">
                      <JobHealth jobId={formData.id} />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ═════ TAB 2: QUALIFICATIONS & MEDIA ═════ */}
            {activeTab === 'qualifications' && (
              <div className="space-y-6">
                <div className="border-b border-primary-100 pb-3">
                  <h4 className="text-sm font-bold text-primary-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary-600" /> Role Description, Skills &amp; Media Resources
                  </h4>
                  <p className="text-xs text-primary-500 mt-0.5">Provide detailed role duties, required competencies, eligibility criteria and supporting PDFs/videos.</p>
                </div>

                {/* Job Description Textarea */}
                <div>
                  <label className="block text-xs font-semibold text-primary-700 mb-1.5">
                    Job Description (Role &amp; Responsibilities)
                  </label>
                  <textarea value={formData.description ?? ''} onChange={e => set('description', e.target.value)}
                    rows={6} placeholder="Detailed job description, core responsibilities, key deliverables and expectations..."
                    className="w-full border border-primary-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary-500 bg-white resize-y" />
                </div>

                {/* Project Overview Textarea */}
                <div>
                  <label className="block text-xs font-semibold text-primary-700 mb-1.5">
                    Project Overview <span className="font-normal text-primary-400">(shown on public portal if filled)</span>
                  </label>
                  <textarea value={formData.project_overview ?? ''} onChange={e => set('project_overview', e.target.value)}
                    rows={3} placeholder="Brief description of the initiative/project for candidate awareness..."
                    className="w-full border border-primary-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary-500 bg-white resize-y" />
                </div>

                {/* Experience Details Textarea */}
                <div>
                  <label className="block text-xs font-semibold text-primary-700 mb-1.5">
                    Experience Details <span className="font-normal text-primary-400">(optional, shown on public portal)</span>
                  </label>
                  <textarea value={formData.experience_details ?? ''} onChange={e => set('experience_details', e.target.value)}
                    rows={4} placeholder="Describe relevant work experience, practical responsibilities, and the type of experience expected from candidates."
                    className="w-full border border-primary-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary-500 bg-white resize-y" />
                </div>

                {/* Required Skills Tag Builder */}
                <div>
                  <label className="block text-xs font-semibold text-primary-700 mb-2">Required Skills &amp; Competencies</label>
                  <div className="flex gap-2 mb-2">
                    <input value={skillInput} onChange={e => setSkillInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                      placeholder="e.g. Agronomy, Field Survey, Soil Chemistry..."
                      className="flex-1 min-w-0 border border-primary-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500" />
                    <button type="button" onClick={addSkill}
                      className="px-4 py-2 bg-primary-100 text-primary-700 font-semibold rounded-lg text-sm hover:bg-primary-200 transition-colors shrink-0">Add Skill</button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {((formData.skills_required as string[]) ?? []).map((s, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full text-xs font-medium text-emerald-800">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                        {s}
                        <button type="button" onClick={() => removeSkill(i)} className="ml-1 text-emerald-500 hover:text-red-500 transition-colors">×</button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Eligibility Criteria */}
                <div>
                  <label className="block text-xs font-semibold text-primary-700 mb-2">Eligibility Criteria</label>
                  <div className="flex gap-2 mb-2">
                    <input value={eligInput} onChange={e => setEligInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addEligibility())}
                      placeholder="Type criterion (e.g. Graduate in Agriculture/Allied Science) and press enter..."
                      className="flex-1 min-w-0 border border-primary-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500" />
                    <button type="button" onClick={addEligibility}
                      className="px-4 py-2 bg-primary-100 text-primary-700 font-semibold rounded-lg text-sm hover:bg-primary-200 transition-colors shrink-0">Add</button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(Array.isArray(formData.eligibility_criteria) ? formData.eligibility_criteria : []).map((c: any, i: number) => {
                      const label = typeof c === 'string' ? c : c?.label || '';
                      if (!label.trim()) return null;
                      return (
                        <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 border border-primary-200 rounded-full text-xs font-medium text-primary-700">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                          {label}
                          <button type="button" onClick={() => removeEligibility(i)} className="ml-1 text-primary-400 hover:text-red-500 transition-colors">×</button>
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Required Documents */}
                <div>
                  <label className="block text-xs font-semibold text-primary-700 mb-2">Required Documents</label>
                  <div className="flex gap-2 mb-2">
                    <input value={docInput} onChange={e => setDocInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addDocument())}
                      placeholder="e.g. Aadhaar Card, Degree Certificate, Driving License..."
                      className="flex-1 min-w-0 border border-primary-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500" />
                    <button type="button" onClick={addDocument}
                      className="px-4 py-2 bg-primary-100 text-primary-700 font-semibold rounded-lg text-sm hover:bg-primary-200 transition-colors shrink-0">Add</button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(Array.isArray(formData.required_documents) ? formData.required_documents : []).map((d: any, i: number) => {
                      const label = typeof d === 'string' ? d : d?.label || '';
                      if (!label.trim()) return null;
                      return (
                        <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-full text-xs font-medium text-blue-700">
                          {label}
                          <button type="button" onClick={() => removeDocument(i)} className="ml-1 text-blue-400 hover:text-red-500 transition-colors">×</button>
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Project Resources */}
                <div className="p-3.5 sm:p-4 bg-blue-50/70 rounded-xl border border-blue-100 space-y-3">
                  <p className="text-xs font-bold text-blue-800 uppercase tracking-wide">Project Resources &amp; Downloads</p>
                  {([
                    { label: 'Project Information PDF URL', key: 'project_pdf_url',   toggle: 'project_pdf_enabled' },
                    { label: 'Project Introduction Video URL', key: 'project_video_url', toggle: 'project_video_enabled' },
                    { label: 'Job Description PDF URL', key: 'jd_pdf_url',          toggle: 'jd_pdf_enabled' },
                  ] as { label: string; key: keyof RmsJobPosting; toggle: keyof RmsJobPosting | null }[]).map(f => (
                    <div key={f.key}>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold text-blue-900">{f.label}</label>
                        {f.toggle && (
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input type="checkbox" checked={(formData[f.toggle] as boolean) ?? true}
                              onChange={e => set(f.toggle!, e.target.checked)} className="rounded border-blue-300" />
                            <span className="text-[11px] text-blue-700 font-medium">Enabled</span>
                          </label>
                        )}
                      </div>
                      <input value={(formData[f.key] as string) ?? ''} placeholder="https://..."
                        onChange={e => set(f.key, e.target.value)}
                        className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 bg-white" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ═════ TAB 3: WORKFLOW & BADGES ═════ */}
            {activeTab === 'workflow' && (
              <div className="space-y-6">
                <div className="border-b border-primary-100 pb-3">
                  <h4 className="text-sm font-bold text-primary-900 flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-primary-600" /> Recruitment Lifecycle Workflow &amp; Badges
                  </h4>
                  <p className="text-xs text-primary-500 mt-0.5">Select system recruitment templates and configure dynamic badges and custom recruitment steps.</p>
                </div>

                {/* Workflow Template selector */}
                <div>
                  <label className="block text-xs font-semibold text-primary-700 mb-1.5">Assigned Workflow Template</label>
                  <select value={formData.workflow_template_id ?? ''} onChange={e => set('workflow_template_id', e.target.value || null)}
                    className="w-full border border-primary-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary-500 bg-white">
                    <option value="">No template selected (Standard flow)</option>
                    {templates.map(t => <option key={t.id} value={t.id}>{t.name} ({t.stages.length} stages)</option>)}
                  </select>
                </div>

                {/* Sub-managers: Badges and Steps */}
                {formData.id ? (
                  <div className="space-y-4 pt-2">
                    <div className="bg-white p-4 rounded-xl border border-primary-200 shadow-sm">
                      <HRBadgeManager jobId={formData.id} />
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-primary-200 shadow-sm">
                      <HRFlowManager jobId={formData.id} />
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-blue-900">Unlock Dynamic Badges &amp; Custom Recruitment Steps</p>
                      <p className="text-xs text-blue-700 mt-0.5">
                        Please save this position once to generate its persistent ID. After saving, you can configure job badges and customized recruitment steps right here.
                      </p>
                      <button type="button" onClick={() => handleSave(undefined, 'stay')} disabled={saving || !formData.title?.trim()}
                        className="mt-2.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5">
                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                        {saving ? 'Saving...' : 'Save Position Now'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Job-Specific Questionnaire shortcut banner */}
                <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between gap-3 flex-wrap">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="w-4 h-4 text-emerald-700" />
                      <h5 className="text-xs font-bold text-emerald-900">Job-Specific Assessment Questionnaire</h5>
                    </div>
                    <p className="text-xs text-emerald-800 leading-relaxed">
                      Configure role-specific questions, sections, and conditional logic in the dedicated Questionnaire tab.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('questionnaire')}
                    className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    Go to Questionnaire Tab →
                  </button>
                </div>
              </div>
            )}

            {/* ═════ TAB 4: JOB-SPECIFIC QUESTIONNAIRE ═════ */}
            {activeTab === 'questionnaire' && (
              <div className="space-y-6">
                <div className="border-b border-primary-100 pb-3">
                  <h4 className="text-sm font-bold text-primary-900 flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-emerald-700" /> Job-Specific Questionnaire Builder
                  </h4>
                  <p className="text-xs text-primary-500 mt-0.5">
                    Build and publish role assessment questions loaded dynamically in Candidate Application Step 4 for this position.
                  </p>
                </div>

                <HRQuestionnaireBuilder
                  job={formData}
                  onChange={q => set('questionnaire', q)}
                  onSave={handleSave}
                  saving={saving}
                />
              </div>
            )}

            {/* ═════ TAB 5: FAQS & DECLARATION ═════ */}
            {activeTab === 'faqs' && (
              <div className="space-y-6">
                <div className="border-b border-primary-100 pb-3">
                  <h4 className="text-sm font-bold text-primary-900 flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-primary-600" /> FAQs &amp; Candidate Acknowledgement
                  </h4>
                  <p className="text-xs text-primary-500 mt-0.5">Manage job-specific frequently asked questions and the legal declaration candidates must sign before applying.</p>
                </div>

                {/* Sub-manager: FAQs */}
                {formData.id ? (
                  <div className="bg-white p-4 rounded-xl border border-primary-200 shadow-sm">
                    <HRFaqManager jobId={formData.id} />
                  </div>
                ) : (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-blue-900">Job-Specific FAQs</p>
                      <p className="text-xs text-blue-700 mt-0.5">
                        Save this position first to enable adding custom FAQ entries specific to this role.
                      </p>
                      <button type="button" onClick={() => handleSave(undefined, 'stay')} disabled={saving || !formData.title?.trim()}
                        className="mt-2 px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5">
                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                        {saving ? 'Saving...' : 'Save Position Now'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Candidate Acknowledgement Declaration */}
                <div>
                  <label className="block text-xs font-semibold text-primary-700 mb-1.5">
                    Candidate Acknowledgement Declaration
                    <span className="font-normal text-primary-400 ml-1">(checkbox requirement before submission on portal)</span>
                  </label>
                  <textarea value={formData.acknowledgement_text ?? ''} onChange={e => set('acknowledgement_text', e.target.value)}
                    rows={4}
                    placeholder="I confirm that I have reviewed all project documents, eligibility criteria, recruitment process, responsibilities and terms before submitting my application."
                    className="w-full border border-primary-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary-500 bg-white resize-y" />
                  <p className="text-[11px] text-primary-400 mt-1">Leave blank to use the standard platform acknowledgement declaration.</p>
                </div>

                {/* Notification Template Reference */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-primary-600" />
                    <h5 className="text-xs font-bold text-primary-900">Recruitment Notification Templates (System-Wide)</h5>
                  </div>
                  <p className="text-xs text-primary-600 leading-relaxed">
                    Event-driven WhatsApp, Email, and SMS notification templates (Application confirmation, interview slot bookings, document verification updates, provisional letters) are governed globally across the platform.
                  </p>
                  <Link to="/admin/rms/notifications" className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-700 hover:text-primary-900 underline">
                    Open Notification Template Manager <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )}

            {/* ═════ TAB 6: SCHEDULING & PUBLISH ═════ */}
            {activeTab === 'scheduling' && (
              <div className="space-y-6">
                <div className="border-b border-primary-100 pb-3">
                  <h4 className="text-sm font-bold text-primary-900 flex items-center gap-2">
                    <CalendarClock className="w-4 h-4 text-primary-600" /> Publishing Mode, Status &amp; Visibility
                  </h4>
                  <p className="text-xs text-primary-500 mt-0.5">Control live portal visibility, automatic application open/close timers and promotional flags.</p>
                </div>

                {/* Status Selector */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-primary-700 mb-1.5">Position Status</label>
                    <select value={formData.status} onChange={e => set('status', e.target.value)}
                      className="w-full border border-primary-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary-500 bg-white font-medium">
                      {JOB_STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 sm:gap-4 pt-1 sm:pt-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={formData.is_featured ?? false}
                        onChange={e => set('is_featured', e.target.checked)} className="rounded border-amber-300" />
                      <Star className="w-4 h-4 text-amber-500" />
                      <span className="text-xs font-bold text-amber-900">Featured Job</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={formData.is_urgent ?? false}
                        onChange={e => set('is_urgent', e.target.checked)} className="rounded border-red-300" />
                      <Flame className="w-4 h-4 text-red-500" />
                      <span className="text-xs font-bold text-red-900">Urgent Hiring</span>
                    </label>
                  </div>
                </div>

                {/* Job Scheduling Component */}
                <SchedulingSection formData={formData as FormDataType} set={set} />

                {/* Job Health Card (if editing) */}
                {formData.id && (
                  <div className="mt-4">
                    <JobHealth jobId={formData.id} />
                  </div>
                )}
              </div>
            )}

            {/* Error banner */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0" /> {error}
              </div>
            )}

            {/* Bottom Unified Action Bar */}
            <div className="pt-4 border-t border-primary-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50/50 -mx-4 sm:-mx-6 -mb-4 sm:-mb-6 p-4 rounded-b-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => { setShowForm(false); setError(null); }}
                  className="flex-1 sm:flex-none px-4 py-2 border border-primary-200 text-primary-700 font-semibold rounded-xl hover:bg-primary-100 text-xs transition-colors">
                  Cancel
                </button>
                {formData.slug && (
                  <button type="button" onClick={() => handlePreview(formData)}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-primary-700 bg-white border border-primary-200 rounded-xl hover:bg-primary-50 transition-colors">
                    <Eye className="w-3.5 h-3.5" /> Preview Public View
                  </button>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSave(undefined, 'continue')}
                  disabled={saving || !formData.title?.trim()}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-white border-2 border-primary-900 text-primary-900 font-bold rounded-xl hover:bg-primary-50 disabled:opacity-50 text-xs transition-all"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  {saving ? 'Saving...' : 'Save & Continue Editing'}
                </button>

                <button
                  type="button"
                  onClick={() => handleSave(undefined, 'close')}
                  disabled={saving || !formData.title?.trim()}
                  className="flex items-center justify-center gap-2 px-5 py-2 bg-primary-900 text-white font-bold rounded-xl hover:bg-primary-800 disabled:opacity-50 text-xs shadow-md transition-all"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  {saving ? 'Saving...' : 'Save & Close'}
                </button>
              </div>
            </div>

          </form>
        </motion.div>
      )}

      {/* Jobs list */}
      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="animate-pulse bg-white rounded-xl h-20 border border-primary-100" />)}</div>
      ) : filteredJobs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-primary-100 p-12 text-center">
          <Briefcase className="w-12 h-12 text-primary-200 mx-auto mb-3" />
          <p className="font-semibold text-primary-500">No job postings match your filters.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Select All */}
          <div className="flex items-center gap-2 px-1">
            <input type="checkbox" checked={selectedIds.size === filteredJobs.length && filteredJobs.length > 0}
              onChange={toggleSelectAll} className="rounded border-primary-300" />
            <span className="text-xs text-primary-500">Select All</span>
          </div>
          {filteredJobs.map(job => {
            const actions = getActionsForJob(job);
            const stats = statsMap[job.id] ?? null;
            const analytics = analyticsMap[job.id] ?? null;
            const isExpanded = expandedJobId === job.id;
            return (
              <div key={job.id} className="bg-white rounded-xl border border-primary-100 p-4 hover:border-primary-200 transition-all">
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <input type="checkbox" checked={selectedIds.has(job.id)} onChange={() => toggleSelect(job.id)}
                    className="rounded border-primary-300 mt-1" />

                  {/* Job info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-bold text-primary-900 truncate">{job.title}</h3>
                      {/* Status Badge */}
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${JOB_STATUS_CONFIG[job.status]?.badge ?? 'bg-primary-50 text-primary-500'}`}>
                        {JOB_STATUS_CONFIG[job.status]?.label ?? job.status}
                      </span>
                      {/* Featured Badge */}
                      {job.is_featured && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-300 flex items-center gap-1">
                          <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> Featured
                        </span>
                      )}
                      {/* Urgent Badge */}
                      {job.is_urgent && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-300 flex items-center gap-1">
                          <Flame className="w-3 h-3" /> Urgent
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-primary-500">
                      {job.department && <span>{job.department}</span>}
                      {job.location && <span>{job.location}</span>}
                      {job.employment_type && <span>{EMPLOYMENT_TYPE_LABELS[job.employment_type]}</span>}
                      {job.application_fee_amount > 0
                        ? <span className="text-amber-600 font-medium">₹{job.application_fee_amount} App Fee</span>
                        : <span className="text-emerald-600 font-medium">No Fee</span>}
                    </div>
                    <RecruitmentProgressBadge job={job} />
                    <StatsBar stats={stats} />
                    {isExpanded && <AnalyticsRow analytics={analytics} />}
                  </div>

                  {/* Quick Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Preview button */}
                    <button onClick={() => handlePreview(job)} title="Preview as candidate"
                      className="p-2 rounded-lg border border-primary-200 text-primary-500 hover:bg-primary-50 transition-all">
                      <Eye className="w-4 h-4" />
                    </button>
                    {/* Edit button */}
                    <button onClick={() => openEditForm(job)} title="Edit"
                      className="p-2 rounded-lg border border-primary-200 text-primary-500 hover:bg-primary-50 transition-all">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {/* 3-dot menu */}
                    <div className="relative" ref={openMenuId === job.id ? menuRef : undefined}>
                      <button onClick={() => setOpenMenuId(openMenuId === job.id ? null : job.id)}
                        title="More actions"
                        className="p-2 rounded-lg border border-primary-200 text-primary-500 hover:bg-primary-50 transition-all">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      <AnimatePresence>
                        {openMenuId === job.id && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -4 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -4 }}
                            transition={{ duration: 0.12 }}
                            className="absolute right-0 top-full mt-1 z-30 w-56 bg-white rounded-xl shadow-xl border border-primary-100 py-1.5 max-h-80 overflow-y-auto"
                          >
                            {actions.map(act => (
                              <button key={act.key}
                                onClick={() => handleAction(act.key, job)}
                                className={`w-full flex items-center gap-2.5 px-4 py-2 text-sm hover:bg-primary-50 transition-colors ${act.color}`}>
                                <act.icon className="w-4 h-4 shrink-0" />
                                {act.label}
                              </button>
                            ))}
                            {job.status === 'published' && (
                              <Link to={`/careers/jobs/${job.slug}`} target="_blank"
                                className="w-full flex items-center gap-2.5 px-4 py-2 text-sm hover:bg-primary-50 transition-colors text-primary-600">
                                <ArrowRight className="w-4 h-4 shrink-0" /> View Live
                              </Link>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>

                {/* Expandable analytics toggle */}
                <button onClick={() => setExpandedJobId(isExpanded ? null : job.id)}
                  className="mt-2 text-[11px] text-primary-400 hover:text-primary-600 transition-colors flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  {isExpanded ? 'Hide analytics' : 'Show analytics'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Recruitment Progress Badge ───────────────────────────────────────────────

const STAGES = [
  { key: 'draft',               label: 'Draft',             dot: 'bg-yellow-400' },
  { key: 'scheduled',           label: 'Scheduled',         dot: 'bg-blue-400' },
  { key: 'published',           label: 'Live',              dot: 'bg-emerald-500' },
  { key: 'applications_open',   label: 'Apps Open',         dot: 'bg-emerald-500' },
  { key: 'closing_soon',        label: 'Closing Soon',      dot: 'bg-orange-400' },
  { key: 'applications_closed', label: 'Apps Closed',       dot: 'bg-red-400' },
  { key: 'filled',              label: 'Filled',            dot: 'bg-slate-400' },
  { key: 'archived',            label: 'Archived',          dot: 'bg-neutral-400' },
] as const;

function getStageKey(job: RmsJobPosting): string {
  const now = new Date();
  const closing = job.closing_date ? new Date(job.closing_date) : null;
  const publish = job.publish_date ? new Date(job.publish_date) : null;
  const msToDl = closing ? closing.getTime() - now.getTime() : null;

  if (job.status === 'archived') return 'archived';
  if (job.status === 'filled') return 'filled';
  if (job.status === 'applications_closed') return 'applications_closed';
  if (msToDl != null && msToDl > 0 && msToDl <= 3 * 24 * 60 * 60 * 1000) return 'closing_soon';
  if (job.status === 'published') return 'published';
  if (job.status === 'coming_soon' || (publish && publish > now)) return 'scheduled';
  if (job.status === 'draft') return 'draft';
  return 'draft';
}

const STAGE_BADGE: Record<string, { label: string; cls: string }> = {
  draft:               { label: 'Draft',             cls: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  scheduled:           { label: 'Scheduled',         cls: 'bg-blue-100 text-blue-800 border-blue-200' },
  published:           { label: 'Live',              cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  applications_open:   { label: 'Apps Open',         cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  closing_soon:        { label: 'Closing Soon',      cls: 'bg-orange-100 text-orange-800 border-orange-200' },
  applications_closed: { label: 'Apps Closed',       cls: 'bg-red-100 text-red-800 border-red-200' },
  filled:              { label: 'Position Filled',   cls: 'bg-slate-100 text-slate-700 border-slate-200' },
  archived:            { label: 'Archived',          cls: 'bg-neutral-100 text-neutral-600 border-neutral-200' },
};

function RecruitmentProgressBadge({ job }: { job: RmsJobPosting }) {
  const stageKey = getStageKey(job);
  const badge = STAGE_BADGE[stageKey] ?? STAGE_BADGE.draft;
  const activeIdx = STAGES.findIndex(s => s.key === stageKey);

  return (
    <div className="mt-1.5">
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${badge.cls}`}>
          <span className={`w-2 h-2 rounded-full ${STAGES.find(s => s.key === stageKey)?.dot ?? 'bg-neutral-400'} ${stageKey === 'closing_soon' ? 'animate-pulse' : ''}`} />
          {badge.label}
        </span>

        <div className="flex items-center gap-0.5 overflow-x-auto">
          {STAGES.slice(0, 6).map((s, i) => (
            <div key={s.key} className="flex items-center gap-0.5">
              <div className={`w-2 h-2 rounded-full transition-all ${
                i < activeIdx ? 'bg-primary-400' :
                i === activeIdx ? `${s.dot} ring-2 ring-offset-1 ring-current` :
                'bg-primary-100'
              }`} title={s.label} />
              {i < 5 && <div className={`w-3 h-px ${i < activeIdx ? 'bg-primary-300' : 'bg-primary-100'}`} />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Scheduling Section Component ─────────────────────────────────────────────

interface FormDataType {
  publish_date: string | null;
  closing_date: string | null;
  never_close_applications: boolean | null;
  display_deadline_public: boolean | null;
  status: string;
  [key: string]: unknown;
}

function SchedulingSection({ formData, set }: {
  formData: FormDataType;
  set: (k: string, v: unknown) => void;
}) {
  const isScheduled = !!formData.publish_date;
  const now = new Date();
  const publishDate = formData.publish_date ? new Date(formData.publish_date) : null;
  const closingDate = formData.closing_date ? new Date(formData.closing_date) : null;

  // Validation
  const closingBeforePublish = publishDate && closingDate && closingDate <= publishDate;
  const publishInPast = publishDate && publishDate < now;
  const msToClose = closingDate ? closingDate.getTime() - now.getTime() : null;
  const isClosingSoon = msToClose != null && msToClose > 0 && msToClose <= 3 * 24 * 60 * 60 * 1000;

  const previewStatus = (): { label: string; cls: string; detail: string } => {
    if (!isScheduled) return { label: 'Live Immediately', cls: 'text-emerald-700', detail: 'Visible to candidates as soon as you publish.' };
    if (!publishDate) return { label: 'No Publish Date Set', cls: 'text-yellow-700', detail: 'Set a publish date to schedule.' };
    if (publishDate > now) return { label: 'Coming Soon', cls: 'text-blue-700', detail: `Candidates will see this job from ${publishDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}.` };
    if (isClosingSoon) return { label: 'Closing Soon', cls: 'text-orange-700', detail: `Deadline approaching — closes ${closingDate!.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}.` };
    if (closingDate && closingDate < now) return { label: 'Applications Closed', cls: 'text-red-700', detail: 'Closing date has passed. Applications are closed.' };
    return { label: 'Open', cls: 'text-emerald-700', detail: 'Applications are currently open.' };
  };
  const preview = previewStatus();

  const timelineStages = [
    { label: 'Draft', active: true },
    { label: 'Scheduled', active: isScheduled },
    { label: 'Published', active: isScheduled && !!publishDate },
    { label: 'Apps Open', active: isScheduled && publishDate != null && publishDate <= now },
    { label: 'Apps Closed', active: !!(closingDate && closingDate < now) },
    { label: 'Archived', active: false },
  ];

  const fmtDt = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <CalendarClock className="w-4 h-4 text-primary-500" />
        <h3 className="text-sm font-bold text-primary-800 uppercase tracking-wider">Publishing Schedule</h3>
      </div>

      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
        <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Publishing Mode</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <label className={`flex items-center gap-2.5 flex-1 p-3 rounded-xl border-2 cursor-pointer transition-all ${!isScheduled ? 'border-primary-400 bg-primary-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
            <input type="radio" name="sched_mode" checked={!isScheduled}
              onChange={() => { set('publish_date', null); set('closing_date', null); set('never_close_applications', false); }}
              className="text-primary-600" />
            <div>
              <p className="text-sm font-bold text-primary-900">Publish Immediately</p>
              <p className="text-xs text-primary-500 mt-0.5">Visible to candidates right away when status is published.</p>
            </div>
          </label>
          <label className={`flex items-center gap-2.5 flex-1 p-3 rounded-xl border-2 cursor-pointer transition-all ${isScheduled ? 'border-primary-400 bg-primary-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
            <input type="radio" name="sched_mode" checked={isScheduled}
              onChange={() => set('publish_date', new Date(Date.now() + 86400000).toISOString())}
              className="text-primary-600" />
            <div>
              <p className="text-sm font-bold text-primary-900">Schedule Publishing</p>
              <p className="text-xs text-primary-500 mt-0.5">Set a future publish date and application closing date.</p>
            </div>
          </label>
        </div>

        {!isScheduled && (
          <div className="flex items-start gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
            <Zap className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
            <p className="text-xs text-emerald-800 font-medium">This position will become live immediately on the Careers portal when saved as Published.</p>
          </div>
        )}
      </div>

      <div className={`grid sm:grid-cols-2 gap-4 transition-opacity duration-200 ${!isScheduled ? 'opacity-40 pointer-events-none select-none' : ''}`}>
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-primary-700">
            Publish Date <span className="text-red-500">*</span>
          </label>
          <input
            type="datetime-local"
            value={formData.publish_date ? formData.publish_date.slice(0, 16) : ''}
            onChange={e => set('publish_date', e.target.value ? new Date(e.target.value).toISOString() : null)}
            className="w-full border border-primary-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary-500 bg-white"
          />
          {publishInPast && isScheduled && (
            <div className="flex items-center gap-1.5 text-xs text-amber-700">
              <ShieldAlert className="w-3.5 h-3.5" /> Publish date is in the past — position will be visible immediately.
            </div>
          )}
          {isScheduled && !formData.publish_date && (
            <div className="flex items-center gap-1.5 text-xs text-red-600">
              <ShieldAlert className="w-3.5 h-3.5" /> Publish Date is required when scheduling.
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-primary-700">
            Closing Date {!formData.never_close_applications && <span className="text-red-500">*</span>}
          </label>
          <input
            type="datetime-local"
            value={formData.closing_date ? formData.closing_date.slice(0, 16) : ''}
            onChange={e => set('closing_date', e.target.value ? new Date(e.target.value).toISOString() : null)}
            disabled={!!formData.never_close_applications}
            className="w-full border border-primary-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary-500 bg-white disabled:bg-slate-50 disabled:cursor-not-allowed"
          />
          {closingBeforePublish && (
            <div className="flex items-center gap-1.5 text-xs text-red-600">
              <ShieldAlert className="w-3.5 h-3.5" /> Closing Date cannot be earlier than Publish Date.
            </div>
          )}
          {isClosingSoon && isScheduled && (
            <div className="flex items-center gap-1.5 text-xs text-orange-700">
              <Flame className="w-3.5 h-3.5" /> Less than 3 days to closing — candidates will see a "Closing Soon" badge.
            </div>
          )}
          {isScheduled && !formData.closing_date && !formData.never_close_applications && (
            <div className="flex items-center gap-1.5 text-xs text-red-600">
              <ShieldAlert className="w-3.5 h-3.5" /> Closing Date is required unless Never Close Applications is enabled.
            </div>
          )}
        </div>
      </div>

      <label className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
        formData.never_close_applications ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-white hover:bg-slate-50'
      } ${!isScheduled ? 'opacity-40 pointer-events-none' : ''}`}>
        <input type="checkbox" checked={formData.never_close_applications ?? false}
          onChange={e => {
            const checked = e.target.checked;
            set('never_close_applications', checked);
            if (checked) {
              set('closing_date', null);
              set('display_deadline_public', false);
            }
          }}
          className="rounded border-slate-300" />
        <CheckSquare className={`w-4 h-4 ${formData.never_close_applications ? 'text-emerald-600' : 'text-slate-400'}`} />
        <div>
          <p className="text-sm font-bold text-primary-900">Never Close Applications</p>
          <p className="text-xs text-primary-500 mt-0.5">
            {formData.never_close_applications
              ? 'This position will remain open until HR manually changes status to Closed.'
              : 'Enable to keep applications open indefinitely without a fixed deadline.'}
          </p>
        </div>
      </label>

      <label className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
        formData.display_deadline_public ? 'border-primary-200 bg-white hover:bg-slate-50' : 'border-slate-200 bg-white hover:bg-slate-50'
      } ${(!isScheduled || formData.never_close_applications) ? 'opacity-40 pointer-events-none' : ''}`}>
        <input type="checkbox" checked={isScheduled && !formData.never_close_applications && (formData.display_deadline_public ?? true)}
          onChange={e => set('display_deadline_public', e.target.checked)}
          disabled={!isScheduled || !!formData.never_close_applications}
          className="rounded border-slate-300" />
        <Radio className="w-4 h-4 text-slate-400" />
        <div>
          <p className="text-sm font-bold text-primary-900">Display Last Date to Apply on Careers Page</p>
          <p className="text-xs text-primary-500 mt-0.5">
            Candidates see the countdown/last date to apply on public cards and role overview.
          </p>
        </div>
      </label>

      {/* Recruitment Preview Status */}
      <div className="p-4 bg-primary-50 rounded-xl border border-primary-200 space-y-3">
        <p className="text-xs font-bold text-primary-700 uppercase tracking-wide flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-primary-500" /> Candidate Portal Visibility Preview
        </p>
        <div className="grid sm:grid-cols-2 gap-3 text-xs">
          <div className="bg-white rounded-lg border border-primary-100 p-3 space-y-2">
            <p className="font-bold text-primary-600 uppercase tracking-wide text-[11px]">Current Status</p>
            <p className={`font-bold text-base ${preview.cls}`}>{preview.label}</p>
            <p className="text-primary-500 leading-snug">{preview.detail}</p>
          </div>
          <div className="bg-white rounded-lg border border-primary-100 p-3 space-y-2">
            <p className="font-bold text-primary-600 uppercase tracking-wide text-[11px]">Candidate Visibility</p>
            {!isScheduled && <p className="font-semibold text-emerald-700">Visible Immediately upon Publish</p>}
            {isScheduled && publishDate && publishDate > now && (
              <>
                <p className="font-semibold text-blue-700">Scheduled for</p>
                <p className="text-primary-700 font-medium">{fmtDt(formData.publish_date)}</p>
              </>
            )}
            {isScheduled && publishDate && publishDate <= now && (
              <p className="font-semibold text-emerald-700">Visible Now</p>
            )}

            {isScheduled && formData.closing_date && !formData.never_close_applications && (
              <div className="pt-1 border-t border-primary-100">
                <p className="font-bold text-primary-600 uppercase tracking-wide text-[11px] mb-1">Closing</p>
                <p className="text-primary-700 font-medium">{fmtDt(formData.closing_date)}</p>
              </div>
            )}
            {formData.never_close_applications && (
              <div className="pt-1 border-t border-primary-100">
                <p className="text-emerald-700 font-semibold">Open Until Further Notice</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Visual Timeline */}
      <div className="p-4 bg-white rounded-xl border border-primary-200 space-y-3">
        <p className="text-xs font-bold text-primary-700 uppercase tracking-wide">Recruitment Lifecycle Timeline</p>
        <div className="flex items-center gap-0 overflow-x-auto pb-1">
          {timelineStages.map((stage, i) => (
            <div key={stage.label} className="flex items-center shrink-0">
              <div className="flex flex-col items-center gap-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all ${
                  stage.active ? 'border-primary-500 bg-primary-500' : 'border-primary-200 bg-white'
                }`}>
                  {stage.active
                    ? <CheckCircle className="w-3.5 h-3.5 text-white" />
                    : <span className="w-1.5 h-1.5 rounded-full bg-primary-200" />}
                </div>
                <span className={`text-[11px] font-semibold whitespace-nowrap ${stage.active ? 'text-primary-700' : 'text-primary-300'}`}>
                  {stage.label}
                </span>
              </div>
              {i < timelineStages.length - 1 && (
                <div className={`w-8 h-0.5 mx-1 mt-[-14px] transition-all ${
                  timelineStages[i + 1].active ? 'bg-primary-400' : 'bg-primary-100'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Job Health Dashboard Card ────────────────────────────────────────────────

function JobHealth({ jobId }: { jobId: string }) {
  const [health, setHealth] = useState<JobHealthData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getJobHealth(jobId).then(r => {
      if (active) { setHealth(r.data); setLoading(false); }
    });
    return () => { active = false; };
  }, [jobId]);

  if (loading) {
    return (
      <div className="p-4 bg-white rounded-xl border border-primary-200">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-primary-500" />
          <h3 className="text-sm font-bold text-primary-800 uppercase tracking-wider">Position Health &amp; Analytics</h3>
        </div>
        <div className="w-6 h-6 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  if (!health) return null;

  const score = health.performanceScore;
  const circumference = 2 * Math.PI * 36;
  const strokeOffset = circumference - (score / 100) * circumference;
  const scoreColor = score >= 90 ? '#10b981' : score >= 60 ? '#eab308' : score >= 40 ? '#f97316' : '#ef4444';
  const scoreBg = score >= 90 ? 'bg-emerald-50' : score >= 60 ? 'bg-yellow-50' : score >= 40 ? 'bg-orange-50' : 'bg-red-50';

  return (
    <div className="p-4 bg-white rounded-xl border border-primary-200 space-y-4">
      <div className="flex items-center gap-2">
        <Activity className="w-4 h-4 text-primary-500" />
        <h3 className="text-sm font-bold text-primary-800 uppercase tracking-wider">Position Health &amp; Analytics</h3>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard icon={Eye} label="Total Views" value={health.views.toLocaleString('en-IN')} color="text-blue-600" bg="bg-blue-50" />
        <MetricCard icon={FileText} label="Applications" value={health.applications.toLocaleString('en-IN')} color="text-primary-600" bg="bg-primary-50" />
        <MetricCard icon={TrendingUp} label="Conversion" value={`${health.conversionRate}%`} color="text-emerald-600" bg="bg-emerald-50" />
        <MetricCard
          icon={CalendarClock}
          label="Days Remaining"
          value={health.daysRemaining != null ? String(health.daysRemaining) : '—'}
          color={health.daysRemaining != null && health.daysRemaining <= 3 ? 'text-orange-600' : 'text-primary-600'}
          bg={health.daysRemaining != null && health.daysRemaining <= 3 ? 'bg-orange-50' : 'bg-primary-50'}
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className={`relative w-24 h-24 rounded-full flex items-center justify-center ${scoreBg}`}>
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="36" fill="none" stroke="currentColor" strokeWidth="4" className="text-primary-100" />
            <circle cx="40" cy="40" r="36" fill="none" stroke={scoreColor} strokeWidth="4"
              strokeDasharray={circumference} strokeDashoffset={strokeOffset} strokeLinecap="round" />
          </svg>
          <div className="relative z-10 text-center">
            <span className="text-2xl font-bold" style={{ color: scoreColor }}>{score}</span>
            <span className="block text-[10px] text-primary-400 font-medium">/ 100</span>
          </div>
        </div>

        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-bold text-primary-900">Recruitment Performance Score</span>
          </div>
          <span className="text-sm font-semibold" style={{ color: scoreColor }}>{health.performanceLabel}</span>

          <div className="flex flex-wrap gap-2">
            {health.isTrending && (
              <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 border border-orange-200">
                <Flame className="w-3 h-3" /> Trending
              </span>
            )}
            {health.lowResponse && (
              <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-700 border border-red-200">
                <AlertCircle className="w-3 h-3" /> Low Response Rate
              </span>
            )}
            {health.daysRemaining != null && health.daysRemaining <= 3 && (
              <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 border border-orange-200 animate-pulse">
                <Clock className="w-3 h-3" /> Closing Soon
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, color, bg }: {
  icon: React.ElementType; label: string; value: string; color: string; bg: string;
}) {
  return (
    <div className={`p-3 rounded-lg ${bg} border border-primary-100`}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={`w-3.5 h-3.5 ${color}`} />
        <span className="text-[11px] font-medium text-primary-500">{label}</span>
      </div>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
    </div>
  );
}

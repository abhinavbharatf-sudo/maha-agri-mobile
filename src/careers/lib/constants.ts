import type { ApplicationStatus, DriveType, DriveStatus, StageType, PostingLevel, JobLocationQuestion } from './types';

// ===== Application Status Config =====
export const APPLICATION_STATUS_CONFIG: Record<
  ApplicationStatus,
  { label: string; color: string; bg: string; border: string; step: number }
> = {
  draft:                  { label: 'Draft',                 color: 'text-neutral-500',      bg: 'bg-neutral-100',       border: 'border-neutral-200',      step: 1  },
  submitted:              { label: 'Submitted',             color: 'text-blue-700',          bg: 'bg-blue-50',           border: 'border-blue-200',         step: 2  },
  payment_pending:        { label: 'Payment Pending',       color: 'text-amber-700',         bg: 'bg-amber-50',          border: 'border-amber-200',        step: 3  },
  payment_successful:     { label: 'Payment Successful',    color: 'text-green-700',         bg: 'bg-green-50',          border: 'border-green-200',        step: 4  },
  interview_slot_pending: { label: 'Slot Pending',          color: 'text-purple-700',        bg: 'bg-purple-50',         border: 'border-purple-200',       step: 5  },
  interview_scheduled:    { label: 'Interview Scheduled',   color: 'text-indigo-700',        bg: 'bg-indigo-50',         border: 'border-indigo-200',       step: 6  },
  interview_completed:    { label: 'Interview Completed',   color: 'text-indigo-700',        bg: 'bg-indigo-50',         border: 'border-indigo-200',       step: 7  },
  under_review:           { label: 'Under Review',          color: 'text-orange-700',        bg: 'bg-orange-50',         border: 'border-orange-200',       step: 8  },
  selected:               { label: 'Selected',              color: 'text-emerald-700',       bg: 'bg-emerald-50',        border: 'border-emerald-200',      step: 9  },
  wait_list:              { label: 'Wait List',             color: 'text-yellow-700',        bg: 'bg-yellow-50',         border: 'border-yellow-200',       step: 9  },
  rejected:               { label: 'Not Selected',          color: 'text-red-700',           bg: 'bg-red-50',            border: 'border-red-200',          step: 9  },
  documents_pending:      { label: 'Documents Pending',     color: 'text-amber-700',         bg: 'bg-amber-50',          border: 'border-amber-200',        step: 10 },
  documents_uploaded:     { label: 'Documents Uploaded',    color: 'text-blue-700',          bg: 'bg-blue-50',           border: 'border-blue-200',         step: 11 },
  documents_verified:     { label: 'Documents Verified',    color: 'text-green-700',         bg: 'bg-green-50',          border: 'border-green-200',        step: 12 },
  onboarding_pending:     { label: 'Onboarding Pending',    color: 'text-amber-700',         bg: 'bg-amber-50',          border: 'border-amber-200',        step: 13 },
  training_pending:       { label: 'Training Pending',      color: 'text-blue-700',          bg: 'bg-blue-50',           border: 'border-blue-200',         step: 14 },
  training_completed:     { label: 'Training Completed',    color: 'text-green-700',         bg: 'bg-green-50',          border: 'border-green-200',        step: 15 },
  appointment_issued:     { label: 'Appointment Issued',    color: 'text-emerald-700',       bg: 'bg-emerald-50',        border: 'border-emerald-200',      step: 16 },
  completed:              { label: 'Joined',                color: 'text-emerald-700',       bg: 'bg-emerald-100',       border: 'border-emerald-300',      step: 17 },
  withdrawn:              { label: 'Withdrawn',             color: 'text-neutral-600',       bg: 'bg-neutral-100',       border: 'border-neutral-300',      step: 0  },
};

// ===== Stage Type Labels =====
export const STAGE_TYPE_LABELS: Record<StageType, string> = {
  eligibility_review:       'Eligibility Review',
  application_form:         'Application Form',
  application_fee_payment:  'Application Fee Payment',
  document_upload:          'Document Upload',
  document_verification:    'Document Verification',
  written_test:             'Written Test',
  physical_test:            'Physical Test',
  skill_assessment:         'Skill Assessment',
  interview_round:          'Interview Round',
  panel_evaluation:         'Panel Evaluation',
  background_check:         'Background Check',
  result_announcement:      'Result Announcement',
  onboarding_fee_payment:   'Onboarding Fee Payment',
  training_allocation:      'Training Allocation',
  training_completion:      'Training Completion',
  appointment_letter:       'Appointment Letter',
};

// ===== Drive Type Labels =====
export const DRIVE_TYPE_LABELS: Record<DriveType, string> = {
  walk_in:      'Walk-in Drive',
  campus:       'Campus Drive',
  district_camp:'District Camp',
  online:       'Online Drive',
  induction:    'Induction Day',
};

export const DRIVE_STATUS_CONFIG: Record<DriveStatus, { label: string; color: string; bg: string }> = {
  planned:     { label: 'Planned',     color: 'text-blue-700',    bg: 'bg-blue-50' },
  confirmed:   { label: 'Confirmed',   color: 'text-green-700',   bg: 'bg-green-50' },
  in_progress: { label: 'In Progress', color: 'text-amber-700',   bg: 'bg-amber-50' },
  completed:   { label: 'Completed',   color: 'text-neutral-600', bg: 'bg-neutral-100' },
  cancelled:   { label: 'Cancelled',   color: 'text-red-700',     bg: 'bg-red-50' },
};

// ===== Maharashtra Districts =====
export const MAHARASHTRA_DISTRICTS = [
  'Ahmednagar','Akola','Amravati','Aurangabad','Beed','Bhandara',
  'Buldhana','Chandrapur','Dhule','Gadchiroli','Gondia','Hingoli',
  'Jalgaon','Jalna','Kolhapur','Latur','Mumbai City','Mumbai Suburban',
  'Nagpur','Nanded','Nandurbar','Nashik','Osmanabad','Palghar',
  'Parbhani','Pune','Raigad','Ratnagiri','Sangli','Satara',
  'Sindhudurg','Solapur','Thane','Wardha','Washim','Yavatmal',
] as const;

export type MaharashtraDistrict = typeof MAHARASHTRA_DISTRICTS[number];

// ===== Smart Location Configuration =====
export const JOB_LOCATION_TYPES = [
  { value: 'State-wide', label: 'State-wide', desc: 'All 36 districts across Maharashtra' },
  { value: 'Regional', label: 'Regional', desc: 'Specific administrative divisions / zones' },
  { value: 'District-wise', label: 'District-wise', desc: 'Single or multi-district selection' },
  { value: 'City-specific', label: 'City-specific', desc: 'Single or multiple cities / HQ hubs' },
  { value: 'Remote', label: 'Remote', desc: 'Work from Home / Virtual' },
] as const;

export const ALL_JOB_LOCATION_TYPES = [
  ...JOB_LOCATION_TYPES,
  { value: 'Multiple Locations', label: 'Multiple Locations', desc: 'Legacy custom combination of locations' },
] as const;

export interface MaharashtraRegionDef {
  name: string;
  division: string;
  districts: string[];
}

export const MAHARASHTRA_REGIONS: MaharashtraRegionDef[] = [
  {
    name: 'Konkan Division',
    division: 'Konkan',
    districts: ['Mumbai City', 'Mumbai Suburban', 'Thane', 'Palghar', 'Raigad', 'Ratnagiri', 'Sindhudurg'],
  },
  {
    name: 'Pune Division (Paschim Maharashtra)',
    division: 'Pune',
    districts: ['Pune', 'Satara', 'Sangli', 'Solapur', 'Kolhapur'],
  },
  {
    name: 'Nashik Division (North Maharashtra / Khandesh)',
    division: 'Nashik',
    districts: ['Nashik', 'Dhule', 'Jalgaon', 'Nandurbar', 'Ahmednagar'],
  },
  {
    name: 'Chhatrapati Sambhajinagar Division (Marathwada)',
    division: 'Chhatrapati Sambhajinagar',
    districts: ['Aurangabad', 'Jalna', 'Parbhani', 'Hingoli', 'Nanded', 'Beed', 'Latur', 'Osmanabad'],
  },
  {
    name: 'Amravati Division (Western Vidarbha)',
    division: 'Amravati',
    districts: ['Amravati', 'Akola', 'Buldhana', 'Washim', 'Yavatmal'],
  },
  {
    name: 'Nagpur Division (Eastern Vidarbha)',
    division: 'Nagpur',
    districts: ['Nagpur', 'Wardha', 'Bhandara', 'Gondia', 'Chandrapur', 'Gadchiroli'],
  },
];

// ===== Notification Event Keys =====
export const NOTIFICATION_EVENT_KEYS = [
  'application_submitted',
  'interview_confirmed',
  'interview_reminder_24h',
  'interview_reminder_2h',
  'interview_reminder_30m',
  'result_selected',
  'result_rejected',
  'result_wait_list',
  'document_request',
  'document_verified',
  'document_rejected',
  'training_allocated',
  'appointment_ready',
] as const;

export type NotificationEventKey = typeof NOTIFICATION_EVENT_KEYS[number];

export const NOTIFICATION_EVENT_LABELS: Record<NotificationEventKey, string> = {
  application_submitted:    'Application Submitted',
  interview_confirmed:      'Interview Confirmed',
  interview_reminder_24h:   'Interview Reminder (24h)',
  interview_reminder_2h:    'Interview Reminder (2h)',
  interview_reminder_30m:   'Interview Reminder (30min)',
  result_selected:          'Result: Selected',
  result_rejected:          'Result: Not Selected',
  result_wait_list:         'Result: Wait List',
  document_request:         'Document Upload Request',
  document_verified:        'Documents Verified',
  document_rejected:        'Documents Rejected / Correction',
  training_allocated:       'Training Batch Allocated',
  appointment_ready:        'Appointment Letter Ready',
};

// ===== Gender Options =====
export const GENDER_OPTIONS = [
  { value: 'male',               label: 'Male' },
  { value: 'female',             label: 'Female' },
  { value: 'other',              label: 'Other' },
  { value: 'prefer_not_to_say',  label: 'Prefer not to say' },
];

// ===== Caste Category Options =====
export const CASTE_CATEGORY_OPTIONS = [
  { value: 'OPEN',  label: 'OPEN' },
  { value: 'SC',    label: 'SC' },
  { value: 'ST',    label: 'ST' },
  { value: 'VJ-A',  label: 'VJ-A' },
  { value: 'NT-B',  label: 'NT-B' },
  { value: 'NT-C',  label: 'NT-C' },
  { value: 'NT-D',  label: 'NT-D' },
  { value: 'SBC',   label: 'SBC' },
  { value: 'OBC',   label: 'OBC' },
  { value: 'SEBC',  label: 'SEBC' },
  { value: 'OTHER', label: 'OTHER' },
] as const;

export type CasteCategory = typeof CASTE_CATEGORY_OPTIONS[number]['value'];

// ===== Employment Type Labels =====
export const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  full_time:   'Full-time',
  part_time:   'Part-time',
  contract:    'Contract',
  volunteer:   'Volunteer',
  internship:  'Internship',
};

// ===== Job Status Config (API-driven, no hardcoding in components) =====
export const JOB_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'draft',               label: 'Draft' },
  { value: 'published',           label: 'Published' },
  { value: 'coming_soon',         label: 'Coming Soon' },
  { value: 'hidden',              label: 'Hidden' },
  { value: 'applications_closed', label: 'Applications Closed' },
  { value: 'filled',              label: 'Filled' },
  { value: 'archived',            label: 'Archived' },
];

export const JOB_STATUS_CONFIG: Record<string, { label: string; badge: string }> = {
  draft:               { label: 'Draft',               badge: 'bg-neutral-100 text-neutral-600' },
  published:           { label: 'Published',           badge: 'bg-emerald-50 text-emerald-700' },
  coming_soon:         { label: 'Coming Soon',         badge: 'bg-blue-50 text-blue-700' },
  hidden:              { label: 'Hidden',              badge: 'bg-neutral-200 text-neutral-700' },
  applications_closed: { label: 'Applications Closed', badge: 'bg-orange-50 text-orange-700' },
  filled:              { label: 'Filled',              badge: 'bg-purple-50 text-purple-700' },
  archived:            { label: 'Archived',            badge: 'border border-red-200 text-red-600 bg-red-50' },
};

// Statuses visible on the public Careers portal list
export const PUBLIC_LIST_STATUSES = ['published', 'coming_soon'] as const;

// Statuses where the Apply button is disabled on the public page
export const APPLY_DISABLED_STATUSES = ['coming_soon', 'applications_closed', 'filled', 'hidden', 'draft', 'archived'] as const;

// Status display messages shown on the public job page
export const JOB_STATUS_MESSAGES: Record<string, string> = {
  coming_soon:         'Applications will open soon.',
  applications_closed: 'Applications Closed',
  filled:              'Position Filled',
};

// ===== Salary Configuration =====

export const SALARY_TYPE_OPTIONS = [
  'Per Month', 'Per Week', 'Per Day', 'Per Year',
  'Per Project', 'Per Assignment', 'Per Visit', 'Per Camp',
  'Per Sample', 'Per Farmer', 'Per Registration', 'Per Training', 'Per Survey',
  'Fixed Amount', 'Negotiable', 'As Per Organization Norms', 'As Per Government Rules',
  'Performance Based', 'Commission Based', 'Incentive Based', 'Stipend',
  'Volunteer (No Honorarium)', 'Other',
] as const;

export const SALARY_PACKAGE_OPTIONS = [
  'Salary Includes Incentive, T.A. & D.A.',
  'Salary Excludes Incentive, T.A. & D.A.',
  'Salary Includes Incentive Only',
  'Salary Excludes Incentive Only',
  'Salary Includes T.A. & D.A. Only',
  'Salary Excludes T.A. & D.A. Only',
  'Fixed Salary (No Additional Benefits)',
  'Variable Pay / Performance Incentive',
  'Commission Based Earnings',
  'As Per Organization Policy',
  'Benefits Will Be Discussed During Interview',
  'Other',
] as const;

// Types that don't use a slash-separated unit (no amount prefix needed when amount is absent)
const SALARY_TYPE_LABEL_ONLY = new Set([
  'Negotiable', 'As Per Organization Norms', 'As Per Government Rules',
  'Performance Based', 'Commission Based', 'Incentive Based',
  'Stipend', 'Volunteer (No Honorarium)', 'Fixed Amount',
]);

// Convert a salary_type like "Per Month" to a short unit "/ Month"
function salaryUnit(salaryType: string | null): string {
  if (!salaryType) return '';
  if (salaryType.startsWith('Per ')) return ' / ' + salaryType.slice(4);
  if (salaryType === 'Fixed Amount') return ' (Fixed)';
  return '';
}

/**
 * Formats a job's salary for public display using Indian numbering.
 * Priority: structured fields (salary_amount + salary_type) > legacy salary_honorarium.
 * Examples: ₹35,000 / Month | ₹900 / Day | Negotiable | Volunteer (No Honorarium)
 */
export function formatSalaryDisplay(
  jobOrAmount?: {
    salary_amount?: number | null;
    salary_type?: string | null;
    salary_honorarium?: string | null;
  } | number | null,
  salaryTypeParam?: string | null
): string | null {
  if (!jobOrAmount) return null;

  // Handle call as formatSalaryDisplay(amount, type)
  if (typeof jobOrAmount === 'number') {
    const amount = jobOrAmount;
    const type = salaryTypeParam || null;
    if (amount > 0) {
      return `₹${amount.toLocaleString('en-IN')}${salaryUnit(type)}`;
    }
    return type || null;
  }

  const job = jobOrAmount;
  const amount = job.salary_amount;
  const type = job.salary_type;

  // Structured fields take priority
  if (type) {
    if (type === 'Other') {
      // Use custom text from legacy field or just "Other"
      return job.salary_honorarium?.trim() || 'Other';
    }
    if (amount != null && amount > 0) {
      return `₹${amount.toLocaleString('en-IN')}${salaryUnit(type)}`;
    }
    // No amount — show type label only
    return type;
  }

  // Fall back to legacy free-text field
  const legacy = job.salary_honorarium?.trim();
  if (!legacy) return null;
  // If it's a pure number, format with Indian numbering and / Month
  if (/^\d+$/.test(legacy)) {
    return `₹${Number(legacy).toLocaleString('en-IN')} / Month`;
  }
  return legacy;
}

/**
 * Returns the salary package display string, or null if not configured.
 */
export function formatSalaryPackage(
  jobOrPackage?: {
    salary_package_type?: string | null;
    salary_package_custom?: string | null;
    salary_package?: string | null;
  } | string | null
): string | null {
  if (!jobOrPackage) return null;
  if (typeof jobOrPackage === 'string') return jobOrPackage;

  const pkg = jobOrPackage.salary_package_type || (jobOrPackage as { salary_package?: string | null }).salary_package;
  if (!pkg) return null;
  if (pkg === 'Other') {
    return jobOrPackage.salary_package_custom?.trim() || null;
  }
  return pkg;
}

/**
 * Parses a numeric salary value for sorting (uses new structured field first).
 */
export function parseSalaryValue(job: {
  salary_amount?: number | null;
  salary_honorarium?: string | null;
}): number {
  if (job.salary_amount != null) return job.salary_amount;
  if (!job.salary_honorarium) return 0;
  const n = Number(job.salary_honorarium.replace(/[^\d]/g, ''));
  return isNaN(n) ? 0 : n;
}

/**
 * Standard sensible default Yes/No Location & Mobility Questions
 * based on Posting Level (District-wise vs Taluka-wise).
 */
export function getDefaultLocationQuestions(level: PostingLevel = 'Taluka-wise'): JobLocationQuestion[] {
  if (level === 'District-wise') {
    return [
      {
        id: 'work_outside_district',
        questionText: 'Are you willing to work outside your native district if required?',
        enabled: true,
        required: true,
      },
      {
        id: 'travel_within_district',
        questionText: 'Are you willing to travel within the assigned district?',
        enabled: true,
        required: true,
      },
    ];
  }

  // Taluka-wise defaults — exactly 3 questions
  return [
    {
      id: 'work_travel_assigned_taluka',
      questionText: 'Are you willing to work and travel in the assigned taluka?',
      enabled: true,
      required: true,
    },
    {
      id: 'work_another_taluka',
      questionText: 'Are you willing to work in another taluka within the assigned district if required?',
      enabled: true,
      required: true,
    },
    {
      id: 'work_outside_district',
      questionText: 'Are you willing to work outside your native district if required?',
      enabled: true,
      required: true,
    },
  ];
}

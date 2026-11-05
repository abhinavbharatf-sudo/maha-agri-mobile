/**
 * MAHA-AGRI Candidate Portal — Portal Types & State Contracts
 *
 * Isolated type definitions for the progressive 4-step candidate application workflow.
 * Confined strictly to src/careers/portal/ to ensure zero impact on legacy modules.
 */

export type PortalStep = 'create_profile' | 'master_profile' | 'job_specific' | 'questionnaire' | 'review' | 'confirmation';

export interface PortalStepItem {
  id: PortalStep;
  stepNumber: number;
  label: string;
  shortDescription: string;
}

export const PORTAL_STEPS: PortalStepItem[] = [
  {
    id: 'create_profile',
    stepNumber: 1,
    label: 'Personal Details & Contact',
    shortDescription: 'Candidate Registration',
  },
  {
    id: 'master_profile',
    stepNumber: 2,
    label: 'Identity & Address Details',
    shortDescription: 'Demographics & Addresses',
  },
  {
    id: 'job_specific',
    stepNumber: 3,
    label: 'Position Details',
    shortDescription: 'Qualifications & Posting Quotas',
  },
  {
    id: 'questionnaire',
    stepNumber: 4,
    label: 'Job-Specific Questionnaire',
    shortDescription: 'Role Assessment Questions',
  },
  {
    id: 'review',
    stepNumber: 5,
    label: 'Review & Submit',
    shortDescription: 'Summary & Legal Undertaking',
  },
  {
    id: 'confirmation',
    stepNumber: 6,
    label: 'Confirmation',
    shortDescription: 'Receipt & Next Steps',
  },
];

// ── Job-Specific Questionnaire Models ────────────────────────────────────────
export type {
  QuestionType,
  QuestionOption,
  QuestionCondition,
  JobQuestion,
  QuestionnaireSection,
  QuestionnaireVersionSnapshot,
  JobQuestionnaire,
  PostingLevel,
  JobLocationQuestion,
} from '../lib/types';

export type QuestionnaireResponses = Record<string, any>;

export const CASTE_CATEGORIES = [
  { value: 'OPEN', label: 'Open / General' },
  { value: 'OBC', label: 'Other Backward Class (OBC)' },
  { value: 'SC', label: 'Scheduled Caste (SC)' },
  { value: 'ST', label: 'Scheduled Tribe (ST)' },
  { value: 'EWS', label: 'Economically Weaker Section (EWS)' },
  { value: 'VJ_DT_A', label: 'VJ / DT-A (Vimukta Jati)' },
  { value: 'NT_B', label: 'Nomadic Tribe B (NT-B)' },
  { value: 'NT_C', label: 'Nomadic Tribe C (NT-C)' },
  { value: 'NT_D', label: 'Nomadic Tribe D (NT-D)' },
  { value: 'SBC', label: 'Special Backward Category (SBC)' },
] as const;

export type CasteCategoryCode = typeof CASTE_CATEGORIES[number]['value'];

export interface MasterProfileFormData {
  fullName: string;
  dateOfBirth: string;
  gender: string;
  mobile: string;
  alternateMobile: string;
  email?: string;
  age?: string;
  candidateId?: string;
  profileCreatedDate?: string;
  consentGiven?: boolean;
  consentTimestamp?: string;
  privacyNoticeVersion?: string;
  casteCategory?: string;
  // Current Address (backward-compatible mappings)
  homeDistrict?: string;
  homeTaluka?: string;
  addressLine1?: string;
  pincode?: string;
  currentAddressLine1?: string;
  currentDistrict?: string;
  currentTaluka?: string;
  currentPincode?: string;
  // Permanent Address
  permanentSameAsCurrent?: boolean;
  permanentAddressLine1?: string;
  permanentDistrict?: string;
  permanentTaluka?: string;
  permanentPincode?: string;
  aadhaarNumber?: string;
}

export type DrivingLicenceType = 'none' | 'two_wheeler' | 'four_wheeler' | 'both';

export type ExperienceType = 'fresher' | 'experienced';

export type GradingFormat = 'percentage' | 'cgpa';

export interface QualificationEntry {
  id: string;
  level: string;
  course: string;
  customQualification?: string;
  customCourse?: string;
  passingYear: string;
  gradingFormat: GradingFormat;
  marksValue: string;
  isPrimary: boolean;
}

export interface WorkExperienceEntry {
  id: string;
  employer: string;
  designation?: string;
  years: string;
  months: string;
  days?: string;
  startDate?: string;
  endDate?: string;
  isCurrent?: boolean;
  hasCertificate?: 'yes' | 'no';
}

export const QUALIFICATION_LEVELS = [
  { value: 'SSC', label: 'SSC' },
  { value: 'HSC', label: 'HSC' },
  { value: 'ITI', label: 'ITI' },
  { value: 'Diploma', label: 'Diploma' },
  { value: 'Graduate', label: 'Graduate' },
  { value: 'Post Graduate', label: 'Post Graduate' },
  { value: 'Other Equivalent Education', label: 'Other Equivalent Education' },
] as const;

export const QUALIFICATION_LEVEL_WEIGHT: Record<string, number> = {
  'Post Graduate': 60,
  'Graduate': 50,
  'Diploma': 40,
  'ITI': 30,
  'HSC': 20,
  'SSC': 10,
  'Other Equivalent Education': 5,
};

/**
 * Automatically determines the index of the candidate's Highest Qualification based on
 * official academic hierarchy (Post Graduate > Graduate > Diploma > ITI > HSC > SSC > Other)
 * with tie-breaker on passing year.
 */
export function determineHighestQualificationIndex(
  qualifications: { level: string; passingYear?: string }[]
): number {
  if (!qualifications || qualifications.length === 0) return -1;
  if (qualifications.length === 1) return 0;

  let bestIndex = 0;
  let bestWeight = -1;
  let bestYear = -1;

  qualifications.forEach((q, idx) => {
    const weight = QUALIFICATION_LEVEL_WEIGHT[q.level] || 0;
    const year = parseInt(q.passingYear || '0', 10) || 0;

    if (weight > bestWeight) {
      bestWeight = weight;
      bestYear = year;
      bestIndex = idx;
    } else if (weight === bestWeight && weight > 0) {
      if (year > bestYear) {
        bestYear = year;
        bestIndex = idx;
      }
    }
  });

  return bestIndex;
}

export const ITI_TRADE_OPTIONS: string[] = [
  'Electrician',
  'Fitter',
  'Welder',
  'Mechanic Diesel',
  'COPA',
  'Electronics Mechanic',
  'Turner',
  'Machinist',
  'Wireman',
  'Draughtsman Civil',
  'Refrigeration & AC Technician',
  'Plumber',
  'Other',
];

export const HSC_STREAM_OPTIONS: string[] = [
  'Science',
  'Commerce',
  'Arts',
  'Vocational / MCVC',
  'Agriculture (Vocational / Bifocal)',
  'Other',
];

export const COURSE_OPTIONS_BY_LEVEL: Record<string, string[]> = {
  HSC: HSC_STREAM_OPTIONS,
  ITI: ITI_TRADE_OPTIONS,
  Diploma: [
    'Diploma in Agriculture (Krishi Padavika)',
    'Diploma in Agricultural Engineering',
    'Diploma in Horticulture',
    'Diploma in Post-Harvest Technology',
    'Diploma in Civil Engineering',
    'Diploma in Mechanical Engineering',
    'Diploma in Electrical Engineering',
    'Diploma in Computer Engineering / IT',
    'Other',
  ],
  Graduate: [
    'B.Sc. Agriculture (Hons)',
    'B.Sc. Horticulture',
    'B.Sc. Forestry',
    'B.Sc. Agri-Biotechnology',
    'B.Tech Agricultural Engineering',
    'B.Sc. Agricultural Business Management (ABM)',
    'B.Sc. Life Sciences (Botany / Chemistry / Zoology)',
    'B.Sc. Computer Science / Information Technology',
    'B.Com / Bachelor of Commerce',
    'B.A. / Bachelor of Arts',
    'BBA / Bachelor of Business Administration',
    'B.E. / B.Tech (Other Engineering Disciplines)',
    'Other',
  ],
  'Post Graduate': [
    'M.Sc. Agriculture (Agronomy)',
    'M.Sc. Agriculture (Soil Science & Agricultural Chemistry)',
    'M.Sc. Agriculture (Genetics & Plant Breeding)',
    'M.Sc. Agriculture (Agricultural Entomology)',
    'M.Sc. Agriculture (Plant Pathology)',
    'M.Sc. Agriculture (Agricultural Economics)',
    'M.Sc. Agriculture (Agricultural Extension Education)',
    'M.Sc. Horticulture',
    'M.Tech Agricultural Engineering',
    'MBA (Agri-Business Management)',
    'M.Sc. Life Sciences / Environmental Science',
    'MCA / M.Sc. Computer Science',
    'M.Com / M.A. / Other Master Degree',
    'Other',
  ],
};

export type LocationVacancyStatus = 'AVAILABLE' | 'NO VACANCY' | 'NOT DETERMINED';

export interface DistrictPreference {
  id: string; // e.g. 'pref-1'
  priority: number; // 1, 2, 3
  district: string;
  talukas?: string[]; // up to 2 talukas
  vacancyStatus?: LocationVacancyStatus;
  talukaVacancyStatuses?: Record<string, LocationVacancyStatus>;
}

export interface MobilityConsentRecord {
  required?: boolean;
  accepted?: boolean;
  consented?: boolean;
  consentedAt?: string | null;
  acceptedAt?: string | null;
  outsideDistricts: string[];
  consentText: string;
  consentVersion?: string;
}

export interface JobSpecificFormData {
  highestQualification: string;
  passingYear: string;
  marksPercentage: string;
  qualifications?: QualificationEntry[];
  experienceType?: ExperienceType;
  experienceYears?: string;
  experienceMonths?: string;
  experienceDays?: string;
  experiences?: WorkExperienceEntry[];
  previousEmployer?: string;
  jobResponsibilities?: string;
  preferredDistrict: string;
  preferredTaluka: string;
  preferredDistricts?: DistrictPreference[];
  mobilityConsent?: MobilityConsentRecord;
  locationConfirmed?: boolean;
  drivingLicence?: DrivingLicenceType;
  marathiFluent?: boolean;
  questionnaireResponses?: Record<string, any>;
  questionnaireVersion?: string;
  locationAnswers?: Record<string, boolean>;
}

export interface PortalWizardState {
  currentStep: PortalStep;
  masterProfile: MasterProfileFormData;
  jobSpecific: JobSpecificFormData;
  acknowledged: boolean;
  submitting: boolean;
  submittedAppId: string | null;
  submittedAppNumber: string | null;
  submittedStatus: string | null;
  submittedAt: string | null;
  errorMessage: string | null;
}

export const INITIAL_MASTER_PROFILE: MasterProfileFormData = {
  fullName: '',
  dateOfBirth: '',
  gender: '',
  mobile: '',
  alternateMobile: '',
  email: '',
  age: '',
  candidateId: '',
  profileCreatedDate: '',
  consentGiven: false,
  consentTimestamp: '',
  privacyNoticeVersion: 'v1.0',
  casteCategory: '',
  homeDistrict: '',
  homeTaluka: '',
  addressLine1: '',
  pincode: '',
  currentAddressLine1: '',
  currentDistrict: '',
  currentTaluka: '',
  currentPincode: '',
  permanentSameAsCurrent: false,
  permanentAddressLine1: '',
  permanentDistrict: '',
  permanentTaluka: '',
  permanentPincode: '',
  aadhaarNumber: '',
};

export const INITIAL_QUALIFICATION: QualificationEntry = {
  id: 'qual-1',
  level: '',
  course: '',
  passingYear: '',
  gradingFormat: 'percentage',
  marksValue: '',
  isPrimary: true,
};

export const INITIAL_EXPERIENCE: WorkExperienceEntry = {
  id: 'exp-1',
  employer: '',
  designation: '',
  years: '',
  months: '',
  days: '',
  startDate: '',
  endDate: '',
  isCurrent: false,
  hasCertificate: 'no',
};

export const INITIAL_JOB_SPECIFIC: JobSpecificFormData = {
  highestQualification: '',
  passingYear: '',
  marksPercentage: '',
  qualifications: [INITIAL_QUALIFICATION],
  experienceType: 'fresher',
  experienceYears: '0',
  experienceMonths: '0',
  experiences: [],
  previousEmployer: '',
  jobResponsibilities: '',
  preferredDistrict: '',
  preferredTaluka: '',
  locationConfirmed: false,
  drivingLicence: 'none',
  marathiFluent: true,
  questionnaireResponses: {},
  questionnaireVersion: '',
  locationAnswers: {},
};

export interface FinalDeclarationData {
  statutory_declaration_accepted: boolean;
  statutory_declaration_text: string;
  statutory_declaration_accepted_at: string;
  statutory_declaration_version: string;

  final_acknowledgement_accepted: boolean;
  final_acknowledgement_text: string;
  final_acknowledgement_accepted_at: string;
  final_acknowledgement_version: string;

  // Backward compatibility fields
  acknowledged: boolean;
  declaration_text: string;
  acknowledged_at: string;
}

export const INITIAL_WIZARD_STATE: PortalWizardState = {
  currentStep: 'create_profile',
  masterProfile: INITIAL_MASTER_PROFILE,
  jobSpecific: INITIAL_JOB_SPECIFIC,
  acknowledged: false,
  submitting: false,
  submittedAppId: null,
  submittedAppNumber: null,
  submittedStatus: null,
  submittedAt: null,
  errorMessage: null,
};

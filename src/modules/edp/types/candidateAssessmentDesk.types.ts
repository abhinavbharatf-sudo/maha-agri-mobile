/**
 * MAHA-AGRI — Candidate Assessment Desk Types & Rule Engine Definitions
 */

export type AssessmentLifecycleStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'ASSESSMENT_COMPLETED'
  | 'UNDER_REVIEW'
  | 'DV_PENDING'
  | 'DV_IN_PROGRESS'
  | 'DV_COMPLETED'
  | 'DV_REJECTED'
  | 'INTERVIEW_PENDING'
  | 'INTERVIEW_COMPLETED'
  | 'SELECTED'
  | 'REJECTED'
  | 'TRAINING_PENDING'
  | 'TRAINING_COMPLETED'
  | 'APPOINTMENT_PENDING'
  | 'ACTIVE';

export type RecommendationCode =
  | 'REC_HIGH'
  | 'REC_MODERATE'
  | 'REC_TRAINING_REQUIRED'
  | 'REC_LICENSE_REQUIRED'
  | 'REC_FINANCIAL_REVIEW'
  | 'REC_REJECT';

export type ProgramEligibilityStatus = 'Eligible' | 'Conditional' | 'Ineligible';

export interface ProgramEligibilityBreakdown {
  agriDrone: ProgramEligibilityStatus;
  krushiSevaKendra: ProgramEligibilityStatus;
  soilTesting: ProgramEligibilityStatus;
  inputBusiness: ProgramEligibilityStatus;
  fpoEntrepreneur: ProgramEligibilityStatus;
  agriConsultancy: ProgramEligibilityStatus;
}

export interface AssessmentDecisionAuditLog {
  logId: string;
  assessmentId: string;
  candidateId: string;
  officerId: string;
  officerName: string;
  decision: 'APPROVE_FOR_DV' | 'KEEP_UNDER_REVIEW' | 'REJECT_CANDIDATE';
  previousStatus: AssessmentLifecycleStatus;
  newStatus: AssessmentLifecycleStatus;
  rejectionReason?: string;
  remarks: string;
  device: string;
  ipAddress: string;
  timestamp: string;
}

export interface CandidateDeskRecord {
  assessmentId: string;
  candidateId: string;
  registrationId?: string;
  fullName: string;
  mobileNumber: string;
  district: string;
  taluka: string;
  village: string;
  programType: string;
  versionNo: number;

  highestQualification: string;
  isAgriQualification: boolean;
  hasAgriLicense: boolean;

  candidateAssessmentScore: number;
  agricultureBackgroundScore: number;
  businessReadinessScore: number;
  financialReadinessScore: number;
  agriDroneReadinessScore: number;

  programEligibility: ProgramEligibilityBreakdown;

  recommendationCode: RecommendationCode;
  recommendationReason: string;
  generatedBy: string;
  generatedAt: string;

  lifecycleStatus: AssessmentLifecycleStatus;
  submittedAt: string;
  auditTrail: AssessmentDecisionAuditLog[];
}

export interface CandidateDeskFilterState {
  searchQuery: string;
  district: string;
  taluka: string;
  programType: string;
  scoreRange: 'ALL' | 'HIGH' | 'MODERATE' | 'LOW';
  lifecycleStatus: string;
}

export interface BatchRuleConfig {
  minScoreThreshold: number;
  requireAgriQualification: boolean;
  requireLicenseIfApplicable: boolean;
  excludeLowCibil: boolean;
}

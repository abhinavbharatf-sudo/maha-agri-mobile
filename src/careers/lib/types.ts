// ============================================================
// RMS — TypeScript interfaces mirroring the database schema
// ============================================================

export type CampaignType = 'open' | 'targeted' | 'walk_in' | 'online';
export type CampaignStatus = 'draft' | 'active' | 'paused' | 'closed' | 'archived';
export type GeographicScope = 'state' | 'division' | 'district';

export type JobStatus =
  | 'draft' | 'published' | 'coming_soon' | 'hidden'
  | 'applications_closed' | 'filled' | 'archived';
export type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'volunteer' | 'internship';

export type DriveType = 'walk_in' | 'campus' | 'district_camp' | 'online' | 'induction';
export type DriveStatus = 'planned' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
export type InterviewMode = 'online' | 'offline' | 'hybrid';

export type ApplicationStatus =
  | 'draft' | 'submitted' | 'payment_pending' | 'payment_successful'
  | 'interview_slot_pending' | 'interview_scheduled' | 'interview_completed'
  | 'under_review' | 'selected' | 'wait_list' | 'rejected'
  | 'documents_pending' | 'documents_uploaded' | 'documents_verified'
  | 'onboarding_pending' | 'training_pending' | 'training_completed'
  | 'appointment_issued' | 'completed' | 'withdrawn';

export type StageType =
  | 'eligibility_review' | 'application_form' | 'application_fee_payment'
  | 'document_upload' | 'document_verification' | 'written_test' | 'physical_test'
  | 'skill_assessment' | 'interview_round' | 'panel_evaluation' | 'background_check'
  | 'result_announcement' | 'onboarding_fee_payment' | 'training_allocation'
  | 'training_completion' | 'appointment_letter';

export type PaymentType = 'application_fee' | 'onboarding_fee';
export type PaymentStatus = 'pending' | 'initiated' | 'success' | 'failed' | 'refunded' | 'waived';
export type PaymentGateway = 'razorpay' | 'cashfree' | 'manual';

export type DocumentStatus = 'pending' | 'uploaded' | 'verified' | 'rejected' | 'correction_required';
export type AttendanceStatus = 'registered' | 'present' | 'absent';
export type TrainingStatus = 'pending' | 'in_progress' | 'completed' | 'absent';
export type NotificationChannel = 'whatsapp' | 'email' | 'inapp';

// ===== Candidate Profile =====
export interface RmsCandidateProfile {
  id: string;
  user_id: string;
  candidate_id: string;
  mobile: string;
  alternate_mobile?: string | null;
  caste_category?: string | null;
  full_name: string;
  date_of_birth: string | null;
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null;
  father_name: string | null;
  mother_name: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  taluka: string | null;
  district: string | null;
  state: string;
  pincode: string | null;
  // Permanent Address
  permanent_same_as_current?: boolean;
  permanent_address_line1?: string | null;
  permanent_district?: string | null;
  permanent_taluka?: string | null;
  permanent_pincode?: string | null;
  education: EducationEntry[];
  experience: ExperienceEntry[];
  skills: string[];
  email: string | null;
  aadhar_number: string | null;
  aadhaar_hash?: string | null;
  whatsapp: string | null;
  emergency_name: string | null;
  emergency_mobile: string | null;
  emergency_relation: string | null;
  avatar_url: string | null;
  profile_complete: boolean;
  created_at: string;
  updated_at: string;
}

export interface EducationEntry {
  degree: string;
  institution: string;
  board: string;
  year: string;
  percentage: string;
}

export interface ExperienceEntry {
  title: string;
  organization: string;
  from_date: string;
  to_date: string | null;
  description: string;
}

// ===== Campaign =====
export interface RmsCampaign {
  id: string;
  name: string;
  description: string | null;
  type: CampaignType;
  status: CampaignStatus;
  campaign_owner_id: string | null;
  geographic_scope: GeographicScope;
  start_date: string | null;
  application_deadline: string | null;
  expected_close_date: string | null;
  banner_image_url: string | null;
  is_public: boolean;
  cloned_from: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// ===== Smart Location & Vacancy Calculator Types =====
export type VacancyLevel = 'taluka' | 'district';
export type PostingLevel = 'District-wise' | 'Taluka-wise';

export interface JobLocationQuestion {
  id: string;
  questionText: string;
  enabled: boolean;
  required: boolean;
}

export type JobLocationType =
  | 'State-wide'
  | 'Regional'
  | 'District-wise'
  | 'City-specific'
  | 'Multiple Locations'
  | 'Remote';

export interface TalukaAllocation {
  included: boolean;
  override_vacancies?: number | null;
  vacancies?: number | null;
}

export interface DistrictAllocation {
  included: boolean;
  override_total?: number | null;
  per_taluka?: number | null;
  taluka_allocations?: Record<string, TalukaAllocation>;
  calculated_district_total?: number;
}

export interface CityLocationAllocation {
  id: string;
  cityName: string;
  parentDistrict: string;
  vacancies: number;
  showCityPublicly: boolean;
  publicLocationString?: string;
  internalNotes?: string;
}

export interface MultipleLocationsConfig {
  enabled: boolean;
  maxDistricts: 1 | 2 | 3 | number; // 1, 2, or 3 (default: 3)
  maxTalukasPerDistrict: 1 | 2 | number; // default: 2, max: 2
}

export interface VacancyAllocationsConfig {
  vacancy_level?: VacancyLevel | null;
  posting_level?: PostingLevel | null;
  location_questions?: JobLocationQuestion[] | null;
  multiple_locations_config?: MultipleLocationsConfig | null;
  city_selection_mode?: 'single' | 'multiple' | null;
  cities?: CityLocationAllocation[] | null;
  default_per_taluka?: number | null;
  default_per_district?: number | null;
  district_allocations?: Record<string, DistrictAllocation>;
  calculated_grand_total?: number;
  experience_details?: string | null;
  jd_pdf_enabled?: boolean | null;
  [key: string]: any;
}

// ===== Job-Specific Questionnaire Models =====
export type QuestionType = 'text' | 'textarea' | 'radio' | 'checkbox' | 'select' | 'boolean';

export interface QuestionOption {
  label: string;
  value: string;
}

export interface QuestionCondition {
  dependsOnQuestionId: string;
  expectedValue: string | boolean | number;
}

export interface JobQuestion {
  id: string;
  sectionTitle?: string;
  questionText: string;
  helpText?: string;
  placeholder?: string;
  type: QuestionType;
  required: boolean;
  isVisible?: boolean;
  options?: QuestionOption[];
  condition?: QuestionCondition;
}

export interface QuestionnaireSection {
  id: string;
  title: string;
  description?: string;
}

export interface QuestionnaireVersionSnapshot {
  version: string;
  publishedAt: string;
  title?: string;
  description?: string;
  isVisibleToCandidates?: boolean;
  questions: JobQuestion[];
  sections?: QuestionnaireSection[];
}

export interface JobQuestionnaire {
  version: string;
  title?: string;
  description?: string;
  status?: 'draft' | 'published';
  publishedAt?: string | null;
  isVisibleToCandidates?: boolean;
  sections?: QuestionnaireSection[];
  questions: JobQuestion[];
  previousVersions?: QuestionnaireVersionSnapshot[];
  lastPublishedSnapshot?: QuestionnaireVersionSnapshot | null;
}

// ===== Job Posting =====
export interface RmsJobPosting {
  id: string;
  title: string;
  slug: string;
  department: string | null;
  location: string | null;
  employment_type: EmploymentType;
  experience_required: string | null;
  experience_details?: string | null;
  description: string | null;
  eligibility_criteria: EligibilityCriterion[];
  required_documents: RequiredDocument[];
  skills_required: string[];
  application_fee_amount: number;
  onboarding_fee_amount: number;
  fee_currency: string;
  fee_label_application: string;
  fee_label_onboarding: string;
  workflow_template_id: string | null;
  status: JobStatus;
  // HR-configurable extended fields
  total_vacancies: number | null;
  vacancies_per_district: number | null;
  vacancies_per_taluka: number | null;
  min_age: number | null;
  max_age: number | null;
  salary_honorarium: string | null;
  salary_amount: number | null;
  salary_type: string | null;
  salary_package_type: string | null;
  salary_package_custom: string | null;
  recruitment_mode: string | null;
  project_pdf_url: string | null;
  project_video_url: string | null;
  jd_pdf_url: string | null;
  project_overview: string | null;
  project_duration: string | null;
  recruitment_status: string | null;
  acknowledgement_text: string | null;
  project_pdf_enabled: boolean | null;
  project_video_enabled: boolean | null;
  jd_pdf_enabled?: boolean | null;
  is_trashed: boolean | null;
  trashed_at: string | null;
  is_featured: boolean | null;
  is_urgent: boolean | null;
  sort_order: number | null;
  publish_date: string | null;
  closing_date: string | null;
  application_close_date: string | null;
  never_close_applications: boolean | null;
  display_deadline_public: boolean | null;
  // Smart Location & Vacancy Calculator fields
  vacancy_level?: VacancyLevel | null;
  posting_level?: PostingLevel | null;
  location_questions?: JobLocationQuestion[] | null;
  location_type?: JobLocationType | null;
  location_regions?: string[] | null;
  location_districts?: string[] | null;
  location_talukas?: string[] | null;
  internal_location?: string | null;
  show_city_publicly?: boolean | null;
  city_name?: string | null;
  vacancy_allocations?: VacancyAllocationsConfig | null;
  multiple_locations_config?: MultipleLocationsConfig | null;
  questionnaire?: JobQuestionnaire | null;
  auto_calculate_vacancies?: boolean | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface EligibilityCriterion {
  label: string;
  required: boolean;
}

export interface RequiredDocument {
  key: string;
  label: string;
  description?: string;
}

// ===== Campaign Job Posting Join =====
export interface RmsCampaignJobPosting {
  campaign_id: string;
  job_posting_id: string;
  vacancy_budget: number;
  created_at: string;
}

// ===== Vacancy =====
export interface RmsVacancy {
  id: string;
  campaign_id: string;
  job_posting_id: string;
  drive_id: string | null;
  geographic_level: 'division' | 'district' | 'taluka';
  geographic_name: string;
  geographic_code: string | null;
  authorized_seats: number;
  reserved_seats: number;
  filled_seats: number;
  pipeline_seats: number;
  is_locked: boolean;
  created_at: string;
  updated_at: string;
}

// ===== Workflow Template =====
export interface RmsWorkflowTemplate {
  id: string;
  name: string;
  description: string | null;
  job_type_tag: string | null;
  is_system_default: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface RmsWorkflowStage {
  id: string;
  template_id: string;
  stage_order: number;
  stage_type: StageType;
  stage_name: string;
  is_required: boolean;
  fee_required: boolean;
  fee_label: string | null;
  required_document_types: string[];
  notification_template_key: string | null;
  sla_hours: number;
  responsible_party: 'candidate' | 'hr' | 'system';
  created_at: string;
}

// ===== Recruitment Drive =====
export interface RmsRecruitmentDrive {
  id: string;
  campaign_id: string;
  name: string;
  description: string | null;
  drive_type: DriveType;
  status: DriveStatus;
  date: string | null;
  start_time: string | null;
  end_time: string | null;
  venue: string | null;
  meeting_link: string | null;
  application_open_date: string | null;
  application_close_date: string | null;
  never_close_applications: boolean | null;
  display_deadline_public: boolean | null;
  application_fee_amount: number | null;
  allow_late_applications: boolean;
  interview_start_date: string | null;
  interview_end_date: string | null;
  interview_mode: InterviewMode | null;
  interview_venue_or_link: string | null;
  training_start_date: string | null;
  training_end_date: string | null;
  training_mode: InterviewMode | null;
  training_venue_or_link: string | null;
  joining_date: string | null;
  joining_venue: string | null;
  joining_time: string | null;
  target_districts: string[];
  expected_attendance: number;
  assigned_hr_ids: string[];
  panel_member_ids: string[];
  is_public: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface RmsDriveRegistration {
  id: string;
  drive_id: string;
  candidate_id: string;
  application_id: string | null;
  batch_slot: string | null;
  drive_pass_url: string | null;
  attendance_status: AttendanceStatus;
  registered_at: string;
  marked_by: string | null;
  marked_at: string | null;
}

// ===== Application =====
export interface RmsApplication {
  id: string;
  application_number: string;
  candidate_id: string;
  job_posting_id: string;
  campaign_id: string | null;
  drive_id: string | null;
  status: ApplicationStatus;
  application_data: Record<string, unknown>;
  preferred_district: string | null;
  preferred_location: string | null;
  assigned_hr_id: string | null;
  submitted_at: string | null;
  last_status_change_at: string;
  created_at: string;
  updated_at: string;
  is_archived?: boolean;
  archived_at?: string | null;
  archived_by?: string | null;
  is_trashed?: boolean;
  trashed_at?: string | null;
  trashed_by?: string | null;
  final_selection_status?: 'pending' | 'selected' | 'rejected' | 'on_hold' | null;
  final_selection_by?: string | null;
  final_selection_at?: string | null;
  final_selection_remarks?: string | null;
}

export interface RmsApplicationWithDetails extends RmsApplication {
  job_posting?: RmsJobPosting;
  campaign?: RmsCampaign | null;
  candidate?: RmsCandidateProfile;
}

export interface RmsApplicationStatusLog {
  id: number;
  application_id: string;
  from_status: ApplicationStatus | null;
  to_status: ApplicationStatus;
  changed_by: string | null;
  notes: string | null;
  changed_at: string;
}

export interface RmsApplicationWorkflowState {
  id: string;
  application_id: string;
  template_id: string | null;
  current_stage_order: number;
  current_stage_type: StageType | null;
  stage_started_at: string;
  stage_completed_at: string | null;
  stage_outcome: 'pass' | 'fail' | 'skip' | null;
  notes: string | null;
  updated_at: string;
}

// ===== Interview =====
export interface RmsInterviewSlot {
  id: string;
  job_posting_id: string;
  drive_id: string | null;
  campaign_id: string | null;
  slot_date: string;
  slot_time: string;
  mode: InterviewMode;
  location_or_link: string | null;
  panel_ids: string[];
  capacity: number;
  booked_count: number;
  status: 'open' | 'full' | 'cancelled' | 'completed';
  created_by: string | null;
  created_at: string;
}

export interface RmsInterviewer {
  id: string;
  user_id: string;
  is_active: boolean;
  default_meet_link: string | null;
  authorized_by: string | null;
  authorized_at: string;
  deauthorized_at?: string | null;
  deauthorized_by?: string | null;
  deauthorization_reason?: string | null;
  created_at: string;
  updated_at: string;
  user_profile?: {
    id: string;
    full_name: string;
    email: string;
    designation?: string;
    department?: string;
    is_active?: boolean;
    mobile?: string | null;
  };
  authorized_by_name?: string | null;
}

export interface StaffUser {
  id: string;
  email: string;
  full_name: string;
  designation: string;
  department: string;
  role_id: string;
  role_key: string;
  role_name: string;
  is_active: boolean;
  created_at: string;
  employee_code?: string | null;
  phone?: string | null;
  assigned_state?: string | null;
  assigned_district?: string | null;
  assigned_taluka?: string | null;
  assigned_location?: string | null;
  is_interviewer: boolean;
  interviewer_id?: string | null;
  interviewer_is_active?: boolean | null;
  interviewer_meet_link?: string | null;
  authorized_at?: string | null;
  authorized_by?: string | null;
  authorized_by_name?: string | null;
}

export interface StaffDirectoryFilter {
  search?: string;
  role_id?: string;
  designation?: string;
  department?: string;
  is_active?: boolean;
  status?: 'active' | 'inactive' | 'all';
  limit?: number;
  offset?: number;
}

export interface InterviewerAuditEntry {
  id: number;
  interviewer_id: string;
  user_id: string;
  action: 'authorized' | 'deactivated' | 'reactivated';
  performed_by: string;
  performed_by_name?: string | null;
  designation_at_time?: string | null;
  department_at_time?: string | null;
  reason?: string | null;
  created_at: string;
}

export interface RmsInterviewerSchedule {
  id: string;
  interviewer_id: string;
  day_of_week: number; // 0=Sunday, 1=Monday... 6=Saturday
  start_time: string;
  end_time: string;
  daily_capacity: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RmsInterviewerOverride {
  id: string;
  interviewer_id: string;
  override_date: string;
  is_leave: boolean;
  custom_start_time: string | null;
  custom_end_time: string | null;
  custom_capacity: number | null;
  reason: string | null;
  approved_by: string | null;
  created_at: string;
}

export interface RmsRescheduleRequest {
  id: string;
  application_id: string;
  current_booking_id: string;
  requested_slot_id: string;
  reason: string;
  reschedule_number: number;
  status: 'pending' | 'approved' | 'rejected';
  admin_remarks: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  application?: RmsApplicationWithDetails;
  current_booking?: RmsInterviewBooking;
  requested_slot?: RmsInterviewSlot;
}

export interface RmsOrganizationSignature {
  id: string;
  signatory_name: string;
  designation: string;
  signature_image_url: string;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface RmsAppointmentTemplate {
  id: string;
  job_posting_id: string | null;
  designation: string;
  common_terms: string[];
  position_terms: string[];
  is_active: boolean;
  version: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface RmsInterviewBooking {
  id: string;
  application_id: string;
  slot_id: string;
  interviewer_id?: string | null;
  google_meet_link?: string | null;
  reschedule_count: number;
  no_show_recorded_at?: string | null;
  no_show_reattempt_approved: boolean;
  no_show_approved_by?: string | null;
  no_show_approved_at?: string | null;
  booked_at: string;
  confirmation_sent_at: string | null;
  attendance_status: 'booked' | 'present' | 'absent' | 'rescheduled';
  interviewer?: RmsInterviewer | null;
}

export interface RmsInterviewEvaluation {
  id: string;
  application_id: string;
  evaluator_id: string | null;
  round_number: number;
  score_communication?: number;
  score_subject_knowledge?: number;
  score_experience?: number;
  score_practical_knowledge?: number;
  score_overall_rating?: number;
  total_score?: number;
  criterion_comments?: Record<string, string>;
  overall_observations?: string | null;
  is_locked?: boolean;
  locked_at?: string | null;
  scores: Record<string, number>;
  remarks: string | null;
  recommendation: 'selected' | 'wait_list' | 'rejected' | 'hold' | null;
  evaluated_at: string;
  evaluator_name?: string;
}

// ===== Documents =====
export interface RmsCandidateDocument {
  id: string;
  application_id: string;
  candidate_id: string;
  document_type: string;
  document_label: string | null;
  storage_path: string | null;
  file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  status: DocumentStatus;
  verified_by: string | null;
  verified_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

// ===== Payments =====
export interface RmsPayment {
  id: string;
  application_id: string;
  payment_type: PaymentType;
  amount: number;
  currency: string;
  fee_label: string | null;
  gateway: PaymentGateway;
  gateway_order_id: string | null;
  gateway_payment_id: string | null;
  status: PaymentStatus;
  waived_by: string | null;
  waived_reason: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface RmsPaymentReceipt {
  id: string;
  payment_id: string;
  receipt_number: string;
  receipt_url: string | null;
  generated_at: string;
}

// ===== Training =====
export interface RmsTrainingBatch {
  id: string;
  campaign_id: string | null;
  title: string;
  mode: 'online' | 'offline' | 'hybrid';
  start_date: string | null;
  end_date: string | null;
  trainer_name: string | null;
  location_or_link: string | null;
  capacity: number | null;
  enrolled_count: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface RmsTrainingAllocation {
  id: string;
  application_id: string;
  training_batch_id: string;
  allocated_by: string | null;
  allocated_at: string;
  completion_status: TrainingStatus;
  completed_at: string | null;
}

// ===== Appointment Letters =====
export interface RmsAppointmentLetter {
  id: string;
  application_id: string;
  letter_number: string;
  letter_type: 'provisional' | 'final';
  pdf_url: string | null;
  joining_date: string | null;
  joining_venue: string | null;
  terms_payload?: { common_terms?: string[]; position_terms?: string[] } | null;
  org_signature_id?: string | null;
  signing_deadline_at?: string | null;
  signature_status: 'pending' | 'signed' | 'expired';
  signed_at?: string | null;
  signed_legal_name?: string | null;
  signature_image_data?: string | null;
  doc_hash?: string | null;
  otp_verified_at?: string | null;
  onboarding_payment_deadline_at?: string | null;
  onboarding_payment_status: 'pending' | 'completed' | 'expired';
  onboarding_payment_id?: string | null;
  issued_by: string | null;
  issued_at: string;
  downloaded_at: string | null;
  org_signature?: RmsOrganizationSignature | null;
}

// ===== HR Notes =====
export interface RmsApplicationNote {
  id: string;
  application_id: string;
  content: string;
  created_by: string | null;
  created_at: string;
}

// ===== Notifications =====
export interface RmsNotificationTemplate {
  id: string;
  event_key: string;
  channel: NotificationChannel;
  subject: string | null;
  body: string;
  is_enabled: boolean;
  reminder_offset_minutes: number | null;
  updated_by: string | null;
  updated_at: string;
}

// ===== Dynamic job-level entities =====
export interface RmsJobBadge {
  id: string;
  job_id: string;
  title: string;
  color: string;
  order: number;
  enabled: boolean;
  created_at: string;
}

export interface RmsRecruitmentStep {
  id: string;
  job_id: string;
  label: string;
  description: string | null;
  order: number;
  enabled: boolean;
  created_at: string;
}

export interface RmsJobFaq {
  id: string;
  job_id: string;
  question: string;
  answer: string;
  order: number;
  enabled: boolean;
  created_at: string;
}

export interface RmsJobAnalytics {
  job_id: string;
  views: number;
  unique_visitors: number;
  apply_clicks: number;
  apps_started: number;
  apps_completed: number;
  updated_at: string;
}

export interface RmsJobStats {
  total: number;
  shortlisted: number;
  interview_scheduled: number;
  selected: number;
  joined: number;
  rejected: number;
}

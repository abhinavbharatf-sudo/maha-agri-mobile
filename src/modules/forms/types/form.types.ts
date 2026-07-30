/**
 * Module 06: Dynamic Form Platform (DFP) TypeScript Types
 * Location: /src/modules/forms/types/form.types.ts
 */

export type FormCategory =
  | 'SURVEY'
  | 'INSPECTION'
  | 'AUDIT'
  | 'VERIFICATION'
  | 'CHECKLIST'
  | 'FEEDBACK';

export type QuestionType =
  | 'TEXT'
  | 'NUMBER'
  | 'DATE'
  | 'GPS'
  | 'PHOTO'
  | 'SIGNATURE'
  | 'QR_CODE'
  | 'BARCODE'
  | 'DROPDOWN'
  | 'MULTI_SELECT'
  | 'MATRIX'
  | 'RATING';

export interface QuestionValidationRules {
  min?: number;
  max?: number;
  pattern?: string;
  maxPhotoAgeMinutes?: number;
  maxGpsAccuracyMeters?: number;
}

export interface ConditionalRule {
  dependsOnQuestionCode: string;
  equalsValue: string;
}

export interface FormQuestion {
  id: string;
  questionCode: string; // Q1, Q2_SOIL_TYPE
  questionText: string;
  questionType: QuestionType;
  isRequired: boolean;
  options?: string[]; // For DROPDOWN, MULTI_SELECT
  matrixRows?: string[]; // For MATRIX type
  matrixCols?: string[]; // For MATRIX type
  validationRules?: QuestionValidationRules;
  conditionalRule?: ConditionalRule;
  questionOrder: number;
}

export interface FormSection {
  id: string;
  sectionTitle: string;
  sectionOrder: number;
  questions: FormQuestion[];
}

export interface FormDefinition {
  id: string;
  formCode: string; // FORM-SOIL-01
  version: string; // v1.0, v2.0
  title: string;
  description: string;
  category: FormCategory;
  isActive: boolean;
  sections: FormSection[];
  createdAt: string;
  updatedAt: string;
}

export interface FormSubmission {
  id: string;
  submissionCode: string; // SUB-2026-00890
  formCode: string;
  formVersion: string; // Tied to exact version at submission time
  applicantUppId: string;
  applicantName: string;
  missionCode?: string;
  caseCode?: string;
  answers: Record<string, any>; // questionCode -> answer
  submittedByName: string;
  submittedAt: string;
  gpsLatitude?: number;
  gpsLongitude?: number;
}

export interface DfpAnalyticsMetrics {
  totalForms: number;
  activeForms: number;
  totalSubmissions: number;
  submissionsByCategory: Record<FormCategory, number>;
  completionRatePercentage: number;
}

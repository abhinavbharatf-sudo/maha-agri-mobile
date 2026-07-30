/**
 * Module 06: Dynamic Form Platform (DFP) Business Engine Service
 * Location: /src/modules/forms/services/DynamicFormPlatformService.ts
 * Manages Form Definitions, Form Versioning (v1.0 -> v2.0), Question Validation,
 * Submissions Processing, and Event Bus Integration.
 */

import { FormDefinition, FormSubmission, FormQuestion, FormCategory, DfpAnalyticsMetrics } from '../types/form.types';
import { PlatformEventBus } from '../../../core/events/EventBus';

export class DynamicFormPlatformService {
  private static subCounter = 890;

  /**
   * Seeded Enterprise Form Definitions
   */
  public static INITIAL_FORMS: FormDefinition[] = [
    {
      id: 'fd-1',
      formCode: 'FORM-SOIL-01',
      version: 'v1.0',
      title: 'Comprehensive Soil Health & Crop Inspection Survey',
      description: 'Standard agricultural soil testing, N-P-K level assessment, and land health survey',
      category: 'SURVEY',
      isActive: true,
      createdAt: '2026-07-20T10:00:00Z',
      updatedAt: '2026-07-20T10:00:00Z',
      sections: [
        {
          id: 'sec-1',
          sectionTitle: 'Section A: Land & Soil Characteristics',
          sectionOrder: 1,
          questions: [
            {
              id: 'q-1',
              questionCode: 'Q1_LAND_ACRES',
              questionText: 'Total Agricultural Land Holding Area (in Acres)',
              questionType: 'NUMBER',
              isRequired: true,
              validationRules: { min: 0.1, max: 500 },
              questionOrder: 1,
            },
            {
              id: 'q-2',
              questionCode: 'Q2_SOIL_TYPE',
              questionText: 'Primary Soil Classification',
              questionType: 'DROPDOWN',
              isRequired: true,
              options: ['Black Cotton Soil (Regur)', 'Red Loamy Soil', 'Laterite Soil', 'Alluvial Soil', 'Sandy Loam'],
              questionOrder: 2,
            },
            {
              id: 'q-3',
              questionCode: 'Q3_IRRIGATION_SOURCE',
              questionText: 'Primary Source of Irrigation',
              questionType: 'MULTI_SELECT',
              isRequired: true,
              options: ['Well / Tube Well', 'Canal Irrigation', 'Drip Irrigation', 'Rainfed Only', 'Farm Pond'],
              questionOrder: 3,
            },
          ],
        },
        {
          id: 'sec-2',
          sectionTitle: 'Section B: Field Evidence & Geotag Verification',
          sectionOrder: 2,
          questions: [
            {
              id: 'q-4',
              questionCode: 'Q4_FIELD_GPS',
              questionText: 'Live Geofenced GPS Location of Soil Core Sample',
              questionType: 'GPS',
              isRequired: true,
              questionOrder: 1,
            },
            {
              id: 'q-5',
              questionCode: 'Q5_SOIL_PHOTO',
              questionText: 'Geotagged Photo of Soil Sample Container & Land Spot',
              questionType: 'PHOTO',
              isRequired: true,
              questionOrder: 2,
            },
            {
              id: 'q-6',
              questionCode: 'Q6_CONTAINER_QR',
              questionText: 'Scan Soil Sample Container QR Barcode',
              questionType: 'QR_CODE',
              isRequired: true,
              questionOrder: 3,
            },
            {
              id: 'q-7',
              questionCode: 'Q7_FARMER_SIGN',
              questionText: 'Farmer / Beneficiary Digital Signature',
              questionType: 'SIGNATURE',
              isRequired: true,
              questionOrder: 4,
            },
            {
              id: 'q-8',
              questionCode: 'Q8_HEALTH_RATING',
              questionText: 'Overall Field Soil Health Quality Assessment Rating',
              questionType: 'RATING',
              isRequired: true,
              questionOrder: 5,
            },
          ],
        },
      ],
    },
    {
      id: 'fd-2',
      formCode: 'FORM-DRONE-01',
      version: 'v1.0',
      title: 'Drone Spraying Pre & Post Mission Inspection Audit',
      description: 'Safety checklist, acreage measurement, chemical dilution and pilot verification',
      category: 'INSPECTION',
      isActive: true,
      createdAt: '2026-07-21T11:00:00Z',
      updatedAt: '2026-07-21T11:00:00Z',
      sections: [
        {
          id: 'sec-d1',
          sectionTitle: 'Section A: Pre-Flight Safety & Pilot Verification',
          sectionOrder: 1,
          questions: [
            {
              id: 'qd-1',
              questionCode: 'QD1_PILOT_LICENSE',
              questionText: 'DGCA Remote Pilot License Number',
              questionType: 'TEXT',
              isRequired: true,
              questionOrder: 1,
            },
            {
              id: 'qd-2',
              questionCode: 'QD2_CHEMICAL_TYPE',
              questionText: 'Approved Liquid Bio-Pesticide / Micronutrient Type',
              questionType: 'DROPDOWN',
              isRequired: true,
              options: ['Nano Urea (IFFCO)', 'Micronutrient Liquid Mix', 'Organic Bio-Pesticide', 'Fungicide Solution'],
              questionOrder: 2,
            },
            {
              id: 'qd-3',
              questionCode: 'QD3_SPRAY_ACRES',
              questionText: 'Target Spraying Acreage Area',
              questionType: 'NUMBER',
              isRequired: true,
              questionOrder: 3,
            },
          ],
        },
      ],
    },
  ];

  /**
   * Generates Submission Code (SUB-2026-00890)
   */
  public static generateSubmissionCode(): string {
    const seq = (this.subCounter++).toString().padStart(5, '0');
    return `SUB-2026-${seq}`;
  }

  /**
   * Validates Form Submission Answers against Question Validation Rules
   */
  public static validateSubmission(
    form: FormDefinition,
    answers: Record<string, any>
  ): { isValid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {};

    form.sections.forEach((sec) => {
      sec.questions.forEach((q) => {
        const val = answers[q.questionCode];

        // Conditional Check
        if (q.conditionalRule) {
          const parentVal = answers[q.conditionalRule.dependsOnQuestionCode];
          if (parentVal !== q.conditionalRule.equalsValue) {
            return; // Skip validation if condition not met
          }
        }

        // Required check
        if (q.isRequired && (val === undefined || val === null || val === '')) {
          errors[q.questionCode] = `${q.questionText} is required.`;
          return;
        }

        // Type specific checks
        if (val !== undefined && val !== null && val !== '') {
          if (q.questionType === 'NUMBER') {
            const num = Number(val);
            if (isNaN(num)) {
              errors[q.questionCode] = 'Must be a valid number.';
            } else if (q.validationRules?.min !== undefined && num < q.validationRules.min) {
              errors[q.questionCode] = `Minimum value is ${q.validationRules.min}.`;
            } else if (q.validationRules?.max !== undefined && num > q.validationRules.max) {
              errors[q.questionCode] = `Maximum value is ${q.validationRules.max}.`;
            }
          }
        }
      });
    });

    return { isValid: Object.keys(errors).length === 0, errors };
  }

  /**
   * Creates a new Immutable Submission tied to exact Form Code & Version
   */
  public static submitForm(
    form: FormDefinition,
    applicantUppId: string,
    applicantName: string,
    answers: Record<string, any>,
    submittedByName: string,
    missionCode?: string,
    caseCode?: string
  ): FormSubmission {
    const subCode = this.generateSubmissionCode();

    const submission: FormSubmission = {
      id: `sub-${Date.now()}`,
      submissionCode: subCode,
      formCode: form.formCode,
      formVersion: form.version, // Tied to exact version at submission time
      applicantUppId,
      applicantName,
      missionCode,
      caseCode,
      answers,
      submittedByName,
      submittedAt: new Date().toISOString(),
      gpsLatitude: 18.5204,
      gpsLongitude: 73.8567,
    };

    PlatformEventBus.getInstance().publish({
      eventType: 'core.form_submitted',
      entityType: 'FORM_SUBMISSION',
      entityId: submission.id,
      payload: {
        submissionCode: subCode,
        formCode: form.formCode,
        formVersion: form.version,
        applicantUppId,
        submittedAt: submission.submittedAt,
      },
    }).catch((err) => console.error('[DFP Service] Event error:', err));

    return submission;
  }

  /**
   * Version Bump Engine: Bumps version (e.g. v1.0 -> v2.0)
   */
  public static createNewFormVersion(form: FormDefinition, newTitle?: string): FormDefinition {
    const currentMajor = parseInt(form.version.replace('v', '').split('.')[0]) || 1;
    const newVersion = `v${currentMajor + 1}.0`;

    return {
      ...form,
      id: `fd-${Date.now()}`,
      version: newVersion,
      title: newTitle || `${form.title} (${newVersion})`,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Computes DFP Analytics Metrics
   */
  public static computeAnalytics(forms: FormDefinition[], submissions: FormSubmission[]): DfpAnalyticsMetrics {
    const totalForms = forms.length;
    const activeForms = forms.filter((f) => f.isActive).length;
    const totalSubmissions = submissions.length;

    const submissionsByCategory: Record<FormCategory, number> = {
      SURVEY: 0,
      INSPECTION: 0,
      AUDIT: 0,
      VERIFICATION: 0,
      CHECKLIST: 0,
      FEEDBACK: 0,
    };

    submissions.forEach((sub) => {
      const parentForm = forms.find((f) => f.formCode === sub.formCode);
      const cat = parentForm?.category || 'SURVEY';
      submissionsByCategory[cat] = (submissionsByCategory[cat] || 0) + 1;
    });

    return {
      totalForms,
      activeForms,
      totalSubmissions,
      submissionsByCategory,
      completionRatePercentage: 98.4,
    };
  }
}

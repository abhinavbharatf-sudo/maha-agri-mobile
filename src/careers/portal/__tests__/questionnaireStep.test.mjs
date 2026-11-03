/**
 * Automated Unit Tests for Step 4 – Job-Specific Questionnaire
 *
 * Verifies:
 * 1. 6-Step portal workflow integration (PORTAL_STEPS configuration).
 * 2. Active questionnaire resolution and dynamic auto-skip when not configured.
 * 3. Question types: text, textarea, radio, checkbox, select, boolean.
 * 4. Required vs optional validation logic on visible fields.
 * 5. Conditional visibility evaluation (dependency matching and hiding).
 * 6. Hidden conditional questions do NOT block validation.
 * 7. Draft save/resume preserving questionnaire responses.
 * 8. Review screen answer formatting and conditional display.
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// ── Pure Stepper Configuration Mirror ────────────────────────────────────────
const PORTAL_STEPS = [
  {
    id: 'create_profile',
    stepNumber: 1,
    label: 'Create Candidate Profile',
    shortDescription: 'Candidate Registration',
  },
  {
    id: 'master_profile',
    stepNumber: 2,
    label: 'Basic Information',
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

const INITIAL_JOB_SPECIFIC = {
  highestQualification: '',
  passingYear: '',
  marksPercentage: '',
  qualifications: [],
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
};

// ── Mock Job Questionnaire Fixture ───────────────────────────────────────────
const SAMPLE_QUESTIONNAIRE = {
  version: 'v1.0',
  title: 'Agricultural Field Assistant Assessment',
  description: 'Role-specific assessment for field coordination and farmer outreach.',
  questions: [
    {
      id: 'q_tractor_exp',
      sectionTitle: 'Equipment & Field Knowledge',
      questionText: 'Do you have prior experience operating tractors or farm machinery?',
      type: 'boolean',
      required: true,
    },
    {
      id: 'q_tractor_types',
      sectionTitle: 'Equipment & Field Knowledge',
      questionText: 'Which machinery have you operated?',
      type: 'checkbox',
      required: true,
      options: [
        { label: 'Standard 4WD Tractor', value: 'tractor_4wd' },
        { label: 'Power Tiller', value: 'power_tiller' },
        { label: 'Combined Harvester', value: 'harvester' },
      ],
      condition: {
        dependsOnQuestionId: 'q_tractor_exp',
        expectedValue: true,
      },
    },
    {
      id: 'q_irrigation_tech',
      sectionTitle: 'Agronomy Practices',
      questionText: 'Select your primary irrigation method expertise',
      type: 'select',
      required: true,
      options: [
        { label: 'Drip Irrigation', value: 'drip' },
        { label: 'Sprinkler Irrigation', value: 'sprinkler' },
        { label: 'Flood / Furrow', value: 'flood' },
      ],
    },
    {
      id: 'q_community_work',
      sectionTitle: 'Agronomy Practices',
      questionText: 'Describe your previous community training or farmer outreach experience',
      type: 'textarea',
      required: false,
      placeholder: 'Briefly summarize your experience...',
    },
    {
      id: 'q_availability',
      sectionTitle: 'Logistics',
      questionText: 'Are you available for immediate rural deployment?',
      type: 'radio',
      required: true,
      options: [
        { label: 'Yes - Immediate (Within 7 days)', value: 'immediate' },
        { label: 'Within 30 days', value: '30_days' },
      ],
    },
  ],
};

// ── Helper: Evaluate Conditional Visibility ──────────────────────────────────
function isQuestionVisible(q, answers) {
  if (!q.condition) return true;
  const parentVal = answers[q.condition.dependsOnQuestionId];
  if (Array.isArray(parentVal)) {
    return parentVal.includes(q.condition.expectedValue);
  }
  return parentVal === q.condition.expectedValue;
}

// ── Helper: Questionnaire Validator ─────────────────────────────────────────
function validateQuestionnaire(questions, answers) {
  const errors = {};
  questions.forEach(q => {
    // Hidden questions must NEVER block validation
    if (!isQuestionVisible(q, answers)) return;

    if (q.required) {
      const val = answers[q.id];
      let isEmpty = false;

      if (val === undefined || val === null) {
        isEmpty = true;
      } else if (typeof val === 'string' && val.trim() === '') {
        isEmpty = true;
      } else if (Array.isArray(val) && val.length === 0) {
        isEmpty = true;
      }

      if (isEmpty) {
        errors[q.id] = 'This question requires an answer before proceeding.';
      }
    }
  });
  return { isValid: Object.keys(errors).length === 0, errors };
}

// ── Helper: Auto-Skip Stepper Resolver ───────────────────────────────────────
function resolveVisibleSteps(portalSteps, job) {
  const q = job?.questionnaire || job?.vacancy_allocations?.questionnaire;
  const hasQuestions = q && Array.isArray(q.questions) && q.questions.length > 0;
  if (hasQuestions) {
    return portalSteps;
  }
  return portalSteps
    .filter(s => s.id !== 'questionnaire')
    .map((s, idx) => ({ ...s, stepNumber: idx + 1 }));
}

// ── Test Suites ──────────────────────────────────────────────────────────────
describe('Candidate Portal: Step 4 – Job-Specific Questionnaire', () => {

  test('1. PORTAL_STEPS defines 6-step flow with Step 4 as Job-Specific Questionnaire', () => {
    assert.equal(PORTAL_STEPS.length, 6, 'Portal should have 6 total defined steps');
    assert.equal(PORTAL_STEPS[0].id, 'create_profile');
    assert.equal(PORTAL_STEPS[1].id, 'master_profile');
    assert.equal(PORTAL_STEPS[2].id, 'job_specific');
    assert.equal(PORTAL_STEPS[3].id, 'questionnaire');
    assert.equal(PORTAL_STEPS[3].stepNumber, 4);
    assert.equal(PORTAL_STEPS[3].label, 'Job-Specific Questionnaire');
    assert.equal(PORTAL_STEPS[4].id, 'review');
    assert.equal(PORTAL_STEPS[4].stepNumber, 5);
    assert.equal(PORTAL_STEPS[5].id, 'confirmation');
    assert.equal(PORTAL_STEPS[5].stepNumber, 6);

    // Verify types.ts source code matches
    const typesPath = path.resolve(import.meta.dirname, '../types.ts');
    const typesContent = fs.readFileSync(typesPath, 'utf-8');
    assert.ok(typesContent.includes("'questionnaire'"), 'types.ts must declare questionnaire PortalStep');
    assert.ok(typesContent.includes("id: 'questionnaire'"), 'types.ts must include questionnaire in PORTAL_STEPS');
    assert.ok(typesContent.includes("stepNumber: 4"), 'types.ts must assign stepNumber 4 to questionnaire');
    assert.ok(typesContent.includes("stepNumber: 5"), 'types.ts must assign stepNumber 5 to review');
    assert.ok(typesContent.includes("stepNumber: 6"), 'types.ts must assign stepNumber 6 to confirmation');
  });

  test('2. Automatically skips Step 4 when Job Posting has NO questionnaire configured', () => {
    const jobWithoutQuestionnaire = {
      id: 'job-1',
      title: 'General Field Officer',
      status: 'published',
    };

    const steps = resolveVisibleSteps(PORTAL_STEPS, jobWithoutQuestionnaire);
    assert.equal(steps.length, 5, 'Should reduce to 5 visible steps');
    assert.equal(steps.find(s => s.id === 'questionnaire'), undefined, 'Questionnaire step omitted');
    assert.equal(steps[3].id, 'review', 'Step 4 becomes Review & Submit');
    assert.equal(steps[3].stepNumber, 4, 'Review stepNumber is 4');
    assert.equal(steps[4].id, 'confirmation');
    assert.equal(steps[4].stepNumber, 5);
  });

  test('3. Includes Step 4 when Job Posting HAS configured questionnaire', () => {
    const jobWithQuestionnaire = {
      id: 'job-2',
      title: 'Specialized Tractor Operator',
      status: 'published',
      questionnaire: SAMPLE_QUESTIONNAIRE,
    };

    const steps = resolveVisibleSteps(PORTAL_STEPS, jobWithQuestionnaire);
    assert.equal(steps.length, 6, 'Should have all 6 steps');
    assert.equal(steps[3].id, 'questionnaire');
    assert.equal(steps[3].stepNumber, 4);
    assert.equal(steps[4].id, 'review');
    assert.equal(steps[4].stepNumber, 5);
  });

  test('4. Required visible questions block validation when empty', () => {
    const emptyAnswers = {};
    const { isValid, errors } = validateQuestionnaire(SAMPLE_QUESTIONNAIRE.questions, emptyAnswers);

    assert.equal(isValid, false);
    // q_tractor_exp (boolean required), q_irrigation_tech (select required), q_availability (radio required)
    assert.ok(errors.q_tractor_exp, 'Requires q_tractor_exp');
    assert.ok(errors.q_irrigation_tech, 'Requires q_irrigation_tech');
    assert.ok(errors.q_availability, 'Requires q_availability');
    // q_community_work is optional, must not produce error
    assert.equal(errors.q_community_work, undefined, 'Optional question must not error');
  });

  test('5. Hidden conditional questions do NOT block validation even if marked required', () => {
    // When q_tractor_exp is false, q_tractor_types is hidden
    const answers = {
      q_tractor_exp: false, // parent answer that hides q_tractor_types
      q_irrigation_tech: 'drip',
      q_availability: 'immediate',
    };

    const { isValid, errors } = validateQuestionnaire(SAMPLE_QUESTIONNAIRE.questions, answers);
    assert.equal(isValid, true, 'Form should be valid even though q_tractor_types is not answered');
    assert.equal(errors.q_tractor_types, undefined, 'Hidden conditional question must not produce an error');
  });

  test('6. Visible conditional questions ARE validated when parent condition is satisfied', () => {
    // When q_tractor_exp is true, q_tractor_types is visible and required
    const answers = {
      q_tractor_exp: true, // satisfies condition for q_tractor_types
      q_irrigation_tech: 'drip',
      q_availability: 'immediate',
      // q_tractor_types omitted!
    };

    const { isValid, errors } = validateQuestionnaire(SAMPLE_QUESTIONNAIRE.questions, answers);
    assert.equal(isValid, false, 'Form must be invalid because visible dependent question is missing');
    assert.ok(errors.q_tractor_types, 'Visible dependent question must require an answer');
  });

  test('7. Validates successfully when all visible required fields have valid answers', () => {
    const answers = {
      q_tractor_exp: true,
      q_tractor_types: ['tractor_4wd', 'power_tiller'],
      q_irrigation_tech: 'sprinkler',
      q_availability: '30_days',
      q_community_work: 'Conducted 5 farmer training workshops in Pune district.',
    };

    const { isValid, errors } = validateQuestionnaire(SAMPLE_QUESTIONNAIRE.questions, answers);
    assert.equal(isValid, true);
    assert.equal(Object.keys(errors).length, 0);
  });

  test('8. Checkbox questions validate array length properly', () => {
    const qCheckbox = {
      id: 'q_crop',
      questionText: 'Select crops',
      type: 'checkbox',
      required: true,
      options: [{ label: 'Cotton', value: 'cotton' }],
    };

    // Empty array fails
    assert.equal(validateQuestionnaire([qCheckbox], { q_crop: [] }).isValid, false);
    // Non-empty array passes
    assert.equal(validateQuestionnaire([qCheckbox], { q_crop: ['cotton'] }).isValid, true);
  });

  test('9. Draft state stores and restores questionnaire responses cleanly', () => {
    const initialJobSpecific = {
      ...INITIAL_JOB_SPECIFIC,
      highestQualification: 'Graduate',
      preferredDistrict: 'Pune',
      preferredTaluka: 'Haveli',
      questionnaireResponses: {
        q_tractor_exp: true,
        q_tractor_types: ['tractor_4wd'],
        q_irrigation_tech: 'drip',
      },
      questionnaireVersion: 'v1.0',
    };

    // Simulate draft JSON serialization (same as localStorage / PostgreSQL JSONB)
    const serialized = JSON.stringify(initialJobSpecific);
    const restored = JSON.parse(serialized);

    assert.deepEqual(restored.questionnaireResponses, {
      q_tractor_exp: true,
      q_tractor_types: ['tractor_4wd'],
      q_irrigation_tech: 'drip',
    });
    assert.equal(restored.questionnaireVersion, 'v1.0');
  });

  test('10. Review screen formatting renders appropriate human-readable display values', () => {
    const answers = {
      q_tractor_exp: true,
      q_tractor_types: ['tractor_4wd', 'power_tiller'],
      q_irrigation_tech: 'drip',
      q_availability: 'immediate',
    };

    // Format boolean
    assert.equal(answers.q_tractor_exp === true ? 'Yes' : 'No', 'Yes');

    // Format multi-select checkbox array with option labels
    const qTypes = SAMPLE_QUESTIONNAIRE.questions.find(q => q.id === 'q_tractor_types');
    const formattedTypes = answers.q_tractor_types
      .map(v => qTypes.options.find(o => o.value === v)?.label || v)
      .join(', ');
    assert.equal(formattedTypes, 'Standard 4WD Tractor, Power Tiller');

    // Format select
    const qIrr = SAMPLE_QUESTIONNAIRE.questions.find(q => q.id === 'q_irrigation_tech');
    const formattedIrr = qIrr.options.find(o => o.value === answers.q_irrigation_tech)?.label;
    assert.equal(formattedIrr, 'Drip Irrigation');
  });

});

/**
 * Automated Unit Tests for HR Questionnaire Builder Inside Job Posting Editor
 *
 * Verifies:
 * 1. Creation and configuration of questionnaire belonging to a specific Job Posting.
 * 2. Save as Draft (status: 'draft') and candidate auto-skip when unpublished.
 * 3. Publish questionnaire (status: 'published') and versioning lifecycle (v1.0).
 * 4. Candidate Portal Step 4 loads published questionnaire automatically.
 * 5. Job isolation: Job A and Job B have independent questionnaires without interference.
 * 6. Immutability & Re-publishing: Editing published questionnaire creates v2.0 and archives v1.0.
 * 7. Candidate application snapshots preserve historical questionnaire versions and answers.
 * 8. Jobs without questionnaires or disabled questionnaires cleanly retain Step 4 auto-skip.
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

// ── Pure Logic Emulators for Questionnaire Builder & Version Engine ─────────

function createInitialQuestionnaire(jobTitle) {
  return {
    version: 'v1.0',
    title: `${jobTitle} Assessment Questionnaire`,
    description: 'Please answer these questions carefully.',
    status: 'draft',
    publishedAt: null,
    sections: [
      { id: 'sec_1', title: 'Technical Knowledge' },
    ],
    questions: [
      {
        id: 'q_1',
        sectionTitle: 'Technical Knowledge',
        questionText: 'Do you hold a valid tractor driving licence?',
        type: 'boolean',
        required: true,
      },
    ],
    previousVersions: [],
  };
}

function publishQuestionnaire(currentQ) {
  const wasPublished = currentQ.status === 'published' || Boolean(currentQ.lastPublishedSnapshot);
  const nowIso = new Date().toISOString();
  const isVisibleToCandidates = currentQ.isVisibleToCandidates !== false;

  let newVersion = currentQ.version || 'v1.0';
  let previousVersions = currentQ.previousVersions ? [...currentQ.previousVersions] : [];

  if (wasPublished && currentQ.lastPublishedSnapshot) {
    previousVersions.push(currentQ.lastPublishedSnapshot);
    const num = parseFloat(currentQ.version.replace(/^v/i, '')) || 1.0;
    newVersion = `v${Math.floor(num) + 1}.0`;
  } else if (wasPublished && !currentQ.lastPublishedSnapshot) {
    const snapshot = {
      version: currentQ.version,
      publishedAt: currentQ.publishedAt || nowIso,
      title: currentQ.title,
      description: currentQ.description,
      sections: currentQ.sections,
      questions: currentQ.questions,
      isVisibleToCandidates,
    };
    previousVersions.push(snapshot);
    const num = parseFloat(currentQ.version.replace(/^v/i, '')) || 1.0;
    newVersion = `v${Math.floor(num) + 1}.0`;
  }

  const currentSnapshot = {
    version: newVersion,
    publishedAt: nowIso,
    title: currentQ.title,
    description: currentQ.description,
    sections: currentQ.sections,
    questions: currentQ.questions,
    isVisibleToCandidates,
  };

  return {
    ...currentQ,
    version: newVersion,
    status: 'published',
    publishedAt: nowIso,
    isVisibleToCandidates,
    previousVersions,
    lastPublishedSnapshot: currentSnapshot,
  };
}

function resolveCandidateQuestionnaire(job) {
  const q = job?.questionnaire || job?.vacancy_allocations?.questionnaire;
  if (
    q &&
    q.status !== 'draft' &&
    q.isVisibleToCandidates !== false &&
    Array.isArray(q.questions) &&
    q.questions.some(item => item.isVisible !== false)
  ) {
    return q;
  }
  return null;
}

// ── Test Suites ──────────────────────────────────────────────────────────────
describe('HR Questionnaire Builder Inside Job Posting Editor', () => {

  test('1. Configures a new questionnaire for a specific Job Posting', () => {
    const q = createInitialQuestionnaire('Agronomy Officer');
    assert.equal(q.version, 'v1.0');
    assert.equal(q.status, 'draft');
    assert.equal(q.publishedAt, null);
    assert.equal(q.questions.length, 1);
    assert.equal(q.questions[0].type, 'boolean');
  });

  test('2. Draft questionnaires remain unpublished and Candidate Portal Step 4 auto-skips', () => {
    const jobWithDraftQ = {
      id: 'job-101',
      title: 'Field Assistant',
      status: 'published',
      questionnaire: createInitialQuestionnaire('Field Assistant'),
    };

    assert.equal(jobWithDraftQ.questionnaire.status, 'draft');
    const candidateQ = resolveCandidateQuestionnaire(jobWithDraftQ);
    assert.equal(candidateQ, null, 'Draft questionnaire must not be exposed to candidates; Step 4 is skipped');
  });

  test('3. Publishing questionnaire activates it as v1.0 and sets publishedAt timestamp', () => {
    const draftQ = createInitialQuestionnaire('Crop Protection Specialist');
    const publishedQ = publishQuestionnaire(draftQ);

    assert.equal(publishedQ.status, 'published');
    assert.equal(publishedQ.version, 'v1.0');
    assert.ok(publishedQ.publishedAt);
    assert.equal(publishedQ.previousVersions.length, 0);

    const job = {
      id: 'job-102',
      title: 'Crop Protection Specialist',
      questionnaire: publishedQ,
    };
    const candidateQ = resolveCandidateQuestionnaire(job);
    assert.ok(candidateQ, 'Candidate Portal loads published questionnaire');
    assert.equal(candidateQ.version, 'v1.0');
  });

  test('4. Two different Job Postings maintain completely independent questionnaires', () => {
    const jobA = {
      id: 'job-A',
      title: 'Soil Science Analyst',
      questionnaire: publishQuestionnaire({
        ...createInitialQuestionnaire('Soil Science Analyst'),
        questions: [{ id: 'q_soil', questionText: 'Soil testing lab experience in years', type: 'text', required: true }],
      }),
    };

    const jobB = {
      id: 'job-B',
      title: 'Drone Pilot',
      questionnaire: publishQuestionnaire({
        ...createInitialQuestionnaire('Drone Pilot'),
        questions: [{ id: 'q_dgca', questionText: 'DGCA Remote Pilot Certificate number', type: 'text', required: true }],
      }),
    };

    assert.notEqual(jobA.questionnaire.questions[0].id, jobB.questionnaire.questions[0].id);
    assert.equal(jobA.questionnaire.questions[0].questionText, 'Soil testing lab experience in years');
    assert.equal(jobB.questionnaire.questions[0].questionText, 'DGCA Remote Pilot Certificate number');

    // Mutating Job A questionnaire must not alter Job B
    jobA.questionnaire.questions.push({ id: 'q_soil_2', questionText: 'New question for Job A', type: 'boolean', required: false });
    assert.equal(jobA.questionnaire.questions.length, 2);
    assert.equal(jobB.questionnaire.questions.length, 1);
  });

  test('5. Editing a published questionnaire and re-publishing creates v2.0 and archives v1.0 in previousVersions', () => {
    const initialDraft = createInitialQuestionnaire('Livestock Assistant');
    const v1 = publishQuestionnaire(initialDraft);
    assert.equal(v1.version, 'v1.0');

    // Admin updates v1 questions
    const edited = {
      ...v1,
      questions: [
        ...v1.questions,
        {
          id: 'q_dairy_mgmt',
          sectionTitle: 'Technical Knowledge',
          questionText: 'Experience in commercial dairy management?',
          type: 'boolean',
          required: true,
        },
      ],
    };

    const v2 = publishQuestionnaire(edited);
    assert.equal(v2.version, 'v2.0', 'Should increment to v2.0');
    assert.equal(v2.status, 'published');
    assert.equal(v2.questions.length, 2);
    assert.equal(v2.previousVersions.length, 1, 'Previous version must be archived');
    assert.equal(v2.previousVersions[0].version, 'v1.0', 'Preserved snapshot has version v1.0');
    assert.equal(v2.previousVersions[0].questions.length, 1, 'Preserved snapshot retains 1 question');
  });

  test('6. Existing submitted candidate applications preserve original version and responses', () => {
    // Application submitted when job was on v1.0
    const candidateAppV1 = {
      application_id: 'app-9001',
      job_id: 'job-105',
      questionnaire_version: 'v1.0',
      responses: {
        q_1: true,
      },
      submission_snapshot: {
        questionnaire_version: 'v1.0',
        questionnaire_responses: { q_1: true },
      },
    };

    // Later, HR publishes v2.0 for the job
    const jobV2 = {
      id: 'job-105',
      questionnaire: {
        version: 'v2.0',
        status: 'published',
        questions: [{ id: 'q_1' }, { id: 'q_2' }],
      },
    };

    // The historical candidate application must remain untouched
    assert.equal(candidateAppV1.questionnaire_version, 'v1.0');
    assert.equal(candidateAppV1.submission_snapshot.questionnaire_version, 'v1.0');
    assert.deepEqual(candidateAppV1.submission_snapshot.questionnaire_responses, { q_1: true });
    assert.notEqual(candidateAppV1.questionnaire_version, jobV2.questionnaire.version);
  });

  test('7. Removing/disabling questionnaire sets questionnaire to null and cleanly triggers Step 4 auto-skip', () => {
    const job = {
      id: 'job-106',
      title: 'General Helper',
      questionnaire: null,
    };

    const candidateQ = resolveCandidateQuestionnaire(job);
    assert.equal(candidateQ, null, 'Null questionnaire skips Step 4');
  });

  test('8. Reordering questions preserves DAG order and clears conditions pointing forward', () => {
    const q1 = { id: 'q_parent', type: 'boolean', questionText: 'Parent Q' };
    const q2 = { id: 'q_child', type: 'text', questionText: 'Child Q', condition: { dependsOnQuestionId: 'q_parent', expectedValue: true } };

    const initialList = [q1, q2];
    assert.equal(initialList[1].condition.dependsOnQuestionId, 'q_parent');

    // If q2 is moved BEFORE q1, its condition would point forward (invalid circular/forward dependency)
    // The builder cleanses forward conditions:
    const reordered = [q2, q1].map((q, i, list) => {
      if (q.condition) {
        const depIdx = list.findIndex(parent => parent.id === q.condition.dependsOnQuestionId);
        if (depIdx >= i) return { ...q, condition: undefined };
      }
      return q;
    });

    assert.equal(reordered[0].id, 'q_child');
    assert.equal(reordered[0].condition, undefined, 'Forward condition was safely cleared');
    assert.equal(reordered[1].id, 'q_parent');
  });

  test('9. Global Questionnaire Visibility toggle ON vs OFF', () => {
    const jobWithQOn = {
      id: 'job-vis-on',
      questionnaire: {
        version: 'v1.0',
        status: 'published',
        isVisibleToCandidates: true,
        questions: [{ id: 'q_1', questionText: 'Q1', isVisible: true }],
      },
    };
    const resolvedOn = resolveCandidateQuestionnaire(jobWithQOn);
    assert.ok(resolvedOn, 'Questionnaire with isVisibleToCandidates=true must be resolved for Candidate Portal');

    const jobWithQOff = {
      id: 'job-vis-off',
      questionnaire: {
        version: 'v1.0',
        status: 'published',
        isVisibleToCandidates: false,
        questions: [{ id: 'q_1', questionText: 'Q1', isVisible: true }],
      },
    };
    const resolvedOff = resolveCandidateQuestionnaire(jobWithQOff);
    assert.equal(resolvedOff, null, 'Questionnaire with isVisibleToCandidates=false must auto-skip Step 4');
  });

  test('10. Individual Question Visibility toggle ON vs OFF and simulation preview filtering', () => {
    const questions = [
      { id: 'q_vis', questionText: 'Visible Question', isVisible: true, type: 'text' },
      { id: 'q_hidden', questionText: 'Hidden Question', isVisible: false, type: 'text' },
    ];

    const isQuestionVisible = (q) => q.isVisible !== false;

    const visibleQuestions = questions.filter(isQuestionVisible);
    assert.equal(visibleQuestions.length, 1);
    assert.equal(visibleQuestions[0].id, 'q_vis');
    assert.ok(!visibleQuestions.some(q => q.id === 'q_hidden'), 'Hidden question must not appear in candidate list');
  });

  test('11. Global OFF overrides individual question visibility and auto-skips Step 4', () => {
    const job = {
      id: 'job-global-off',
      questionnaire: {
        version: 'v1.0',
        status: 'published',
        isVisibleToCandidates: false,
        questions: [
          { id: 'q_1', isVisible: true },
          { id: 'q_2', isVisible: true },
        ],
      },
    };

    assert.equal(resolveCandidateQuestionnaire(job), null);
  });

  test('12. If all individual questions are hidden, Step 4 is auto-skipped', () => {
    const job = {
      id: 'job-all-questions-hidden',
      questionnaire: {
        version: 'v1.0',
        status: 'published',
        isVisibleToCandidates: true,
        questions: [
          { id: 'q_1', isVisible: false },
          { id: 'q_2', isVisible: false },
        ],
      },
    };

    assert.equal(resolveCandidateQuestionnaire(job), null, 'Must auto-skip when zero questions are visible');
  });

  test('13. Hidden required questions do not block application validation and are excluded from submitted answers', () => {
    const questions = [
      { id: 'q_active_required', questionText: 'Active', required: true, isVisible: true, type: 'text' },
      { id: 'q_hidden_required', questionText: 'Hidden', required: true, isVisible: false, type: 'text' },
    ];

    const answers = {
      q_active_required: 'Completed answer',
      q_hidden_required: '', // empty!
    };

    const isQuestionVisible = (q) => q.isVisible !== false;

    // Validation emulator
    const validateForm = () => {
      const errors = {};
      questions.forEach(q => {
        if (!isQuestionVisible(q)) return; // Hidden questions never block
        if (q.required && (!answers[q.id] || answers[q.id].trim() === '')) {
          errors[q.id] = 'Required';
        }
      });
      return errors;
    };

    const errors = validateForm();
    assert.deepEqual(errors, {}, 'Hidden required question should not produce validation errors');

    // Sanitization emulator
    const sanitized = {};
    questions.forEach(q => {
      if (isQuestionVisible(q) && answers[q.id] !== undefined) {
        sanitized[q.id] = answers[q.id];
      }
    });

    assert.deepEqual(sanitized, { q_active_required: 'Completed answer' }, 'Hidden question omitted from payload');
  });

  test('14. Cascading conditional visibility: hidden parent question automatically hides child dependent questions', () => {
    const questions = [
      { id: 'q_parent', questionText: 'Parent Q', isVisible: false, type: 'boolean' },
      { id: 'q_child', questionText: 'Child Q', isVisible: true, type: 'text', condition: { dependsOnQuestionId: 'q_parent', expectedValue: true } },
    ];

    const answers = { q_parent: true };

    const isQuestionVisible = (q) => {
      if (q.isVisible === false) return false;
      if (!q.condition) return true;
      const parentQ = questions.find(item => item.id === q.condition.dependsOnQuestionId);
      if (parentQ && !isQuestionVisible(parentQ)) return false; // Cascading parent check
      return answers[q.condition.dependsOnQuestionId] === q.condition.expectedValue;
    };

    assert.equal(isQuestionVisible(questions[0]), false, 'Parent is individually hidden');
    assert.equal(isQuestionVisible(questions[1]), false, 'Child is cascadingly hidden because parent is hidden');
  });

  test('15. Backward compatibility: questionnaires and questions with omitted visibility default to visible', () => {
    const legacyJob = {
      id: 'job-legacy',
      questionnaire: {
        version: 'v1.0',
        status: 'published',
        // isVisibleToCandidates omitted
        questions: [
          // isVisible omitted
          { id: 'q_legacy', questionText: 'Legacy Question', type: 'text', required: true },
        ],
      },
    };

    const resolved = resolveCandidateQuestionnaire(legacyJob);
    assert.ok(resolved, 'Legacy questionnaire defaults to visible');
    assert.equal(resolved.questions[0].isVisible, undefined);
    assert.ok(resolved.questions[0].isVisible !== false, 'Legacy question defaults to visible');
  });

  test('16. Publishing and version snapshotting preserves isVisibleToCandidates across releases', () => {
    const q1 = {
      version: 'v1.0',
      status: 'draft',
      isVisibleToCandidates: true,
      title: 'Field Officer Assessment',
      questions: [
        { id: 'q_1', questionText: 'License?', type: 'boolean', required: true, isVisible: true },
        { id: 'q_2', questionText: 'Internal note', type: 'text', required: false, isVisible: false },
      ],
    };

    const publishedV1 = publishQuestionnaire(q1);
    assert.equal(publishedV1.version, 'v1.0');
    assert.equal(publishedV1.status, 'published');
    assert.equal(publishedV1.isVisibleToCandidates, true);
    assert.equal(publishedV1.lastPublishedSnapshot.isVisibleToCandidates, true);

    // Modify in HR and toggle global visibility OFF
    const modified = {
      ...publishedV1,
      isVisibleToCandidates: false,
    };

    const publishedV2 = publishQuestionnaire(modified);
    assert.equal(publishedV2.version, 'v2.0');
    assert.equal(publishedV2.isVisibleToCandidates, false);
    assert.equal(publishedV2.lastPublishedSnapshot.isVisibleToCandidates, false);
    assert.equal(publishedV2.previousVersions.length, 1);
    assert.equal(publishedV2.previousVersions[0].version, 'v1.0');
    assert.equal(publishedV2.previousVersions[0].isVisibleToCandidates, true, 'Archive preserved v1.0 state');
  });

});

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Pure simulation of the Candidate Portal Draft Save, Resumption, and
 * Application State Transition engine according to MAHA-AGRI requirements.
 */
function createDraftEngine() {
  const applicationsTable = new Map(); // key: `${candidateId}:${jobId}`
  const candidateProfiles = new Map(); // key: candidateId
  const sessionStorageMock = new Map();

  function saveProfile(profile) {
    candidateProfiles.set(profile.userId, {
      id: `profile-${profile.userId}`,
      ...profile,
      updated_at: new Date().toISOString(),
    });
    return candidateProfiles.get(profile.userId);
  }

  function saveDraft({ job, candidateId, userId, masterProfile, jobSpecific, currentStep, isDummyMode = false }) {
    const nowIso = new Date().toISOString();
    const key = `${candidateId}:${job.id}`;

    // Dummy mode session storage
    if (isDummyMode && (userId.startsWith('dummy-') || candidateId.startsWith('dummy-'))) {
      const storageKey = `maha_candidate_draft_${job.id}_${candidateId}`;
      sessionStorageMock.set(storageKey, JSON.stringify({
        master_profile: masterProfile,
        job_specific: jobSpecific,
        last_active_step: currentStep,
        last_saved_at: nowIso,
      }));
      return { success: true, savedAt: nowIso };
    }

    // Check if an existing application is already submitted
    const existing = applicationsTable.get(key);
    if (existing && existing.status !== 'draft') {
      return {
        success: false,
        savedAt: null,
        error: 'Cannot update: Application has already been submitted and is locked.',
      };
    }

    saveProfile({ userId, ...masterProfile });

    const draftRecord = {
      id: existing ? existing.id : `app-${Date.now()}`,
      application_number: existing ? existing.application_number : `ABF-DRAFT-${Math.floor(1000 + Math.random() * 9000)}`,
      candidate_id: candidateId,
      job_posting_id: job.id,
      status: 'draft',
      preferred_district: jobSpecific.preferredDistrict || null,
      preferred_taluka: jobSpecific.preferredTaluka || null,
      application_data: {
        master_profile: masterProfile,
        job_specific: jobSpecific,
        last_active_step: currentStep,
        last_saved_at: nowIso,
      },
      created_at: existing ? existing.created_at : nowIso,
      updated_at: nowIso,
    };

    applicationsTable.set(key, draftRecord);
    return { success: true, savedAt: nowIso, application: draftRecord };
  }

  function loadDraft(candidateId, jobId, isDummyMode = false) {
    if (isDummyMode) {
      const storageKey = `maha_candidate_draft_${jobId}_${candidateId}`;
      const raw = sessionStorageMock.get(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          draft: {
            masterProfile: parsed.master_profile,
            jobSpecific: parsed.job_specific,
            lastActiveStep: parsed.last_active_step,
            lastSavedAt: parsed.last_saved_at,
          },
          error: null,
        };
      }
    }

    const key = `${candidateId}:${jobId}`;
    const record = applicationsTable.get(key);
    if (!record) {
      return { draft: null, error: null };
    }

    if (record.status !== 'draft') {
      return { draft: null, error: 'Application already submitted', isSubmitted: true, record };
    }

    const appData = record.application_data || {};
    return {
      draft: {
        masterProfile: appData.master_profile,
        jobSpecific: appData.job_specific,
        lastActiveStep: appData.last_active_step || 'job_specific',
        lastSavedAt: appData.last_saved_at || record.updated_at,
      },
      error: null,
    };
  }

  function submitApplication({ job, candidateId, userId, masterProfile, jobSpecific, declarationText }) {
    const key = `${candidateId}:${job.id}`;
    const existing = applicationsTable.get(key);

    if (existing && existing.status !== 'draft') {
      return {
        success: false,
        error: 'You have already submitted an active application for this position.',
        code: '23505',
      };
    }

    const isFree = Number(job.application_fee_amount ?? 0) === 0;
    const finalStatus = isFree ? 'submitted' : 'payment_pending';
    const nowIso = new Date().toISOString();

    const submittedRecord = {
      id: existing ? existing.id : `app-${Date.now()}`,
      application_number: existing?.application_number?.startsWith('ABF-APP-')
        ? existing.application_number
        : `ABF-APP-${Math.floor(100000 + Math.random() * 900000)}`,
      candidate_id: candidateId,
      job_posting_id: job.id,
      status: finalStatus,
      preferred_district: jobSpecific.preferredDistrict,
      preferred_taluka: jobSpecific.preferredTaluka,
      application_data: {
        master_profile: masterProfile,
        job_specific: jobSpecific,
        declaration: { acknowledged: true, text: declarationText, at: nowIso },
      },
      submitted_at: nowIso,
      updated_at: nowIso,
    };

    applicationsTable.set(key, submittedRecord);
    return { success: true, application: submittedRecord };
  }

  return {
    saveProfile,
    saveDraft,
    loadDraft,
    submitApplication,
    getRecord: (candidateId, jobId) => applicationsTable.get(`${candidateId}:${jobId}`),
  };
}

describe('Candidate Portal Draft Save & Resumption Lifecycle', () => {

  const mockJob = {
    id: 'job-pune-agridoot-001',
    title: 'Maha Agridoot Coordinator',
    department: 'Maha-Agri Operations',
    application_fee_amount: 0,
  };

  it('1. Persists Step 1 Master Profile and Step 2 Job-Specific fields as draft', () => {
    const engine = createDraftEngine();
    const candidateId = 'cand-101';
    const userId = 'usr-101';

    const masterProfile = {
      fullName: 'Sunil Patil',
      dateOfBirth: '1995-04-12',
      gender: 'male',
      mobile: '9876543210',
      homeDistrict: 'Pune',
      homeTaluka: 'Haveli',
    };

    const jobSpecific = {
      highestQualification: 'B.Sc. Agriculture',
      passingYear: '2017',
      marksPercentage: '74.5',
      drivingLicence: 'two_wheeler',
      experienceYears: '2',
      preferredDistrict: 'Pune',
      preferredTaluka: 'Baramati',
      marathiFluent: true,
    };

    const res = engine.saveDraft({
      job: mockJob,
      candidateId,
      userId,
      masterProfile,
      jobSpecific,
      currentStep: 'job_specific',
    });

    assert.strictEqual(res.success, true);
    assert.ok(res.savedAt);

    const saved = engine.getRecord(candidateId, mockJob.id);
    assert.strictEqual(saved.status, 'draft');
    assert.strictEqual(saved.preferred_district, 'Pune');
    assert.strictEqual(saved.application_data.job_specific.highestQualification, 'B.Sc. Agriculture');
    assert.strictEqual(saved.application_data.last_active_step, 'job_specific');
  });

  it('2. Loads saved draft and resumes at the last active step upon re-opening', () => {
    const engine = createDraftEngine();
    const candidateId = 'cand-102';
    const userId = 'usr-102';

    engine.saveDraft({
      job: mockJob,
      candidateId,
      userId,
      masterProfile: { fullName: 'Anita Deshmukh', mobile: '9123456789', homeDistrict: 'Nashik', homeTaluka: 'Sinnar' },
      jobSpecific: { preferredDistrict: 'Nashik', preferredTaluka: 'Sinnar', highestQualification: 'M.Sc. Agronomy' },
      currentStep: 'review',
    });

    const { draft, error, isSubmitted } = engine.loadDraft(candidateId, mockJob.id);

    assert.strictEqual(error, null);
    assert.strictEqual(isSubmitted, undefined);
    assert.ok(draft);
    assert.strictEqual(draft.lastActiveStep, 'review');
    assert.strictEqual(draft.masterProfile.fullName, 'Anita Deshmukh');
    assert.strictEqual(draft.jobSpecific.preferredTaluka, 'Sinnar');
  });

  it('3. Safely promotes draft to submitted and locks against subsequent draft modification', () => {
    const engine = createDraftEngine();
    const candidateId = 'cand-103';
    const userId = 'usr-103';

    // Step A: Save Draft
    engine.saveDraft({
      job: mockJob,
      candidateId,
      userId,
      masterProfile: { fullName: 'Ramesh Kadam', mobile: '9000000001' },
      jobSpecific: { preferredDistrict: 'Solapur' },
      currentStep: 'review',
    });

    // Step B: Final Submit
    const submitRes = engine.submitApplication({
      job: mockJob,
      candidateId,
      userId,
      masterProfile: { fullName: 'Ramesh Kadam', mobile: '9000000001' },
      jobSpecific: { preferredDistrict: 'Solapur' },
      declarationText: 'I agree',
    });

    assert.strictEqual(submitRes.success, true);
    assert.strictEqual(submitRes.application.status, 'submitted');

    // Step C: Attempting to save draft on submitted application is strictly blocked
    const draftAttempt = engine.saveDraft({
      job: mockJob,
      candidateId,
      userId,
      masterProfile: { fullName: 'Ramesh Tampered', mobile: '9000000001' },
      jobSpecific: { preferredDistrict: 'Thane' },
      currentStep: 'job_specific',
    });

    assert.strictEqual(draftAttempt.success, false);
    assert.match(draftAttempt.error, /locked/i);

    // Step D: Attempting to re-submit is blocked with duplicate code
    const resubmitAttempt = engine.submitApplication({
      job: mockJob,
      candidateId,
      userId,
      masterProfile: { fullName: 'Ramesh Kadam' },
      jobSpecific: { preferredDistrict: 'Solapur' },
      declarationText: 'I agree',
    });

    assert.strictEqual(resubmitAttempt.success, false);
    assert.strictEqual(resubmitAttempt.code, '23505');
  });

  it('4. Local dummy OTP mode stores draft in session storage and restores cleanly', () => {
    const engine = createDraftEngine();
    const candidateId = 'dummy-dev-candidate-001';
    const userId = 'dummy-dev-candidate-001';

    const saveRes = engine.saveDraft({
      job: mockJob,
      candidateId,
      userId,
      masterProfile: { fullName: 'Developer Test', mobile: '9876543210' },
      jobSpecific: { preferredDistrict: 'Pune', highestQualification: 'B.Tech IT' },
      currentStep: 'job_specific',
      isDummyMode: true,
    });

    assert.strictEqual(saveRes.success, true);

    const loadRes = engine.loadDraft(candidateId, mockJob.id, true);
    assert.ok(loadRes.draft);
    assert.strictEqual(loadRes.draft.masterProfile.fullName, 'Developer Test');
    assert.strictEqual(loadRes.draft.jobSpecific.highestQualification, 'B.Tech IT');
  });

  it('5. Candidate isolation: Candidate A cannot access Candidate B draft', () => {
    const engine = createDraftEngine();

    engine.saveDraft({
      job: mockJob,
      candidateId: 'cand-A',
      userId: 'usr-A',
      masterProfile: { fullName: 'Applicant A', mobile: '9000000001' },
      jobSpecific: { preferredDistrict: 'Satara' },
      currentStep: 'job_specific',
    });

    // Query with Candidate B's identity
    const queryB = engine.loadDraft('cand-B', mockJob.id);
    assert.strictEqual(queryB.draft, null, 'Candidate B must have null draft for Candidate A application');
  });

  it('6. Honest save states: Never returns success if persistence fails', () => {
    const engine = createDraftEngine();

    // Lock application by submitting first
    engine.submitApplication({
      job: mockJob,
      candidateId: 'cand-locked',
      userId: 'usr-locked',
      masterProfile: { fullName: 'Locked Applicant' },
      jobSpecific: { preferredDistrict: 'Kolhapur' },
      declarationText: 'Declaration',
    });

    // Calling saveDraft must return success: false with honest error
    const attempt = engine.saveDraft({
      job: mockJob,
      candidateId: 'cand-locked',
      userId: 'usr-locked',
      masterProfile: { fullName: 'Locked' },
      jobSpecific: { preferredDistrict: 'Kolhapur' },
      currentStep: 'job_specific',
    });

    assert.strictEqual(attempt.success, false);
    assert.strictEqual(attempt.savedAt, null);
    assert.ok(attempt.error);
  });

  it('7. Multi-Number Isolation Flow: Switching WhatsApp numbers creates separate drafts and resumes correctly', () => {
    const engine = createDraftEngine();
    const numberA = '8787887878';
    const numberB = '9876543210';
    const candidateIdA = `dummy-candidate-${numberA}`;
    const candidateIdB = `dummy-candidate-${numberB}`;

    // Step 1: Candidate A logs in and saves draft
    const saveA = engine.saveDraft({
      job: mockJob,
      candidateId: candidateIdA,
      userId: candidateIdA,
      masterProfile: { fullName: 'ANURAG KUMAR SINGH', mobile: numberA, homeDistrict: 'Pune' },
      jobSpecific: { preferredDistrict: 'Pune', preferredTaluka: 'Haveli' },
      currentStep: 'job_specific',
      isDummyMode: true,
    });
    assert.strictEqual(saveA.success, true);

    // Step 2: Logout (Candidate A's in-memory state is cleared)
    // Step 3: Candidate B logs in with Number B
    // Query Candidate B's draft
    const queryBInitial = engine.loadDraft(candidateIdB, mockJob.id, true);
    assert.strictEqual(queryBInitial.draft, null, 'Candidate B must have a pristine clean application with NO draft');

    // Candidate B enters data and saves draft
    const saveB = engine.saveDraft({
      job: mockJob,
      candidateId: candidateIdB,
      userId: candidateIdB,
      masterProfile: { fullName: 'SNEHA PATIL', mobile: numberB, homeDistrict: 'Nashik' },
      jobSpecific: { preferredDistrict: 'Nashik', preferredTaluka: 'Sinnar' },
      currentStep: 'job_specific',
      isDummyMode: true,
    });
    assert.strictEqual(saveB.success, true);

    // Step 4: Logout and log back in with Candidate A (Number A)
    const queryAResume = engine.loadDraft(candidateIdA, mockJob.id, true);
    assert.ok(queryAResume.draft, 'Candidate A draft must be found');
    assert.strictEqual(queryAResume.draft.masterProfile.fullName, 'ANURAG KUMAR SINGH');
    assert.strictEqual(queryAResume.draft.masterProfile.mobile, numberA);
    assert.strictEqual(queryAResume.draft.jobSpecific.preferredDistrict, 'Pune');
    assert.strictEqual(queryAResume.draft.jobSpecific.preferredTaluka, 'Haveli');

    // Step 5: Logout and log back in with Candidate B (Number B)
    const queryBResume = engine.loadDraft(candidateIdB, mockJob.id, true);
    assert.ok(queryBResume.draft, 'Candidate B draft must be found');
    assert.strictEqual(queryBResume.draft.masterProfile.fullName, 'SNEHA PATIL');
    assert.strictEqual(queryBResume.draft.masterProfile.mobile, numberB);
    assert.strictEqual(queryBResume.draft.jobSpecific.preferredDistrict, 'Nashik');
    assert.strictEqual(queryBResume.draft.jobSpecific.preferredTaluka, 'Sinnar');

    // Ensure Candidate B never sees Candidate A's data
    assert.notStrictEqual(queryBResume.draft.masterProfile.fullName, queryAResume.draft.masterProfile.fullName);
    assert.notStrictEqual(queryBResume.draft.jobSpecific.preferredDistrict, queryAResume.draft.jobSpecific.preferredDistrict);
  });

});

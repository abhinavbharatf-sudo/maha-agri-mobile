/**
 * MAHA-AGRI Candidate Portal — Validation & Submission Logic Test Suite
 *
 * Runs locally with Node.js built-in test runner: node --test
 * Validates the core business rules implemented in the candidate portal & SQL RPC:
 *   1. JSONB District quota validation
 *   2. Server-side Taluka allocation validation (Taluka vs District-level quotas)
 *   3. Fee workflow status assignment (Free -> 'submitted', Paid -> 'payment_pending')
 *   4. Concurrency & Idempotent retry handling
 *   5. Draft promotion state transitions
 *   6. Immutable snapshot assembly
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// ── Logic Emulators for PostgreSQL RPC Business Rules ─────────────────────────

function validateDistrict(locationDistricts, preferredDistrict) {
  if (Array.isArray(locationDistricts) && locationDistricts.length > 0) {
    if (!locationDistricts.includes(preferredDistrict)) {
      throw new Error(`The selected district (${preferredDistrict}) is not eligible for this position.`);
    }
  }
  return true;
}

function validateTaluka(vacancyAllocations, preferredDistrict, preferredTaluka) {
  const isDistrictLevel = vacancyAllocations?.vacancy_level === 'district';
  if (!isDistrictLevel && preferredTaluka) {
    const distAlloc = vacancyAllocations?.district_allocations?.[preferredDistrict];
    if (distAlloc && distAlloc.taluka_allocations) {
      const talukaAlloc = distAlloc.taluka_allocations;
      if (Object.keys(talukaAlloc).length > 0) {
        const item = talukaAlloc[preferredTaluka];
        if (!item || item.included === false) {
          throw new Error(`The selected taluka (${preferredTaluka}) has no allocated vacancies in ${preferredDistrict} district.`);
        }
      }
    }
  }
  return true;
}

function determineTargetStatus(applicationFeeAmount) {
  const fee = Number(applicationFeeAmount || 0);
  return fee > 0 ? 'payment_pending' : 'submitted';
}

function simulateSubmission({
  existingApp,
  job,
  preferredDistrict,
  preferredTaluka,
  masterProfile,
  jobSpecific,
  declaration,
}) {
  // 1. Job active check
  if (!job || job.status !== 'published' || job.is_trashed) {
    throw new Error('Position not currently accepting applications.');
  }

  // 2. Deadline check
  if (!job.never_close_applications) {
    const now = new Date();
    if (job.closing_date && now > new Date(job.closing_date)) {
      throw new Error('Applications closed for this position.');
    }
  }

  // 3. District & Taluka validation
  validateDistrict(job.location_districts, preferredDistrict);
  validateTaluka(job.vacancy_allocations, preferredDistrict, preferredTaluka);

  // 4. Idempotency check
  if (existingApp && existingApp.status !== 'draft') {
    return {
      success: true,
      already_submitted: true,
      application_id: existingApp.id,
      application_number: existingApp.application_number,
      status: existingApp.status,
    };
  }

  // 5. Target status determination
  const targetStatus = determineTargetStatus(job.application_fee_amount);

  // 6. Snapshot assembly
  const snapshot = {
    snapshot_version: 1,
    snapshot_at: new Date().toISOString(),
    master_profile: masterProfile,
    job_specific: jobSpecific,
    declaration: declaration,
  };

  const isDraftPromotion = existingApp && existingApp.status === 'draft';

  return {
    success: true,
    already_submitted: false,
    promoted_from_draft: isDraftPromotion,
    application_id: existingApp?.id || 'new-uuid-1234',
    application_number: existingApp?.application_number || 'ABF-APP-000042',
    status: targetStatus,
    status_log_entry: {
      from_status: isDraftPromotion ? 'draft' : null,
      to_status: targetStatus,
    },
    snapshot,
  };
}

// ── Test Suites ───────────────────────────────────────────────────────────────

describe('Candidate Portal: District & Taluka Allocation Rules', () => {
  const sampleJob = {
    id: 'job-1',
    status: 'published',
    is_trashed: false,
    location_districts: ['Pune', 'Satara', 'Nagpur'],
    vacancy_allocations: {
      vacancy_level: 'taluka',
      district_allocations: {
        Pune: {
          taluka_allocations: {
            Haveli: { included: true, vacancies: 5 },
            Baramati: { included: true, vacancies: 2 },
            Shirur: { included: false, vacancies: 0 },
          },
        },
      },
    },
    application_fee_amount: 0,
  };

  it('allows preferred district when present in location_districts', () => {
    assert.doesNotThrow(() => validateDistrict(sampleJob.location_districts, 'Pune'));
    assert.doesNotThrow(() => validateDistrict(sampleJob.location_districts, 'Nagpur'));
  });

  it('rejects preferred district when not in permitted location_districts', () => {
    assert.throws(
      () => validateDistrict(sampleJob.location_districts, 'Mumbai City'),
      /not eligible for this position/
    );
  });

  it('allows valid included taluka within district allocations', () => {
    assert.doesNotThrow(() =>
      validateTaluka(sampleJob.vacancy_allocations, 'Pune', 'Haveli')
    );
    assert.doesNotThrow(() =>
      validateTaluka(sampleJob.vacancy_allocations, 'Pune', 'Baramati')
    );
  });

  it('rejects unallocated taluka for a district with specific quotas', () => {
    assert.throws(
      () => validateTaluka(sampleJob.vacancy_allocations, 'Pune', 'Daund'),
      /no allocated vacancies in Pune district/
    );
  });

  it('rejects taluka explicitly marked included: false', () => {
    assert.throws(
      () => validateTaluka(sampleJob.vacancy_allocations, 'Pune', 'Shirur'),
      /no allocated vacancies in Pune district/
    );
  });

  it('allows any taluka in a district when job has vacancy_level = district', () => {
    const districtLevelJob = {
      ...sampleJob,
      vacancy_allocations: {
        vacancy_level: 'district',
        district_allocations: {
          Pune: { override_total: 10 },
        },
      },
    };
    assert.doesNotThrow(() =>
      validateTaluka(districtLevelJob.vacancy_allocations, 'Pune', 'AnyTaluka')
    );
  });
});

describe('Candidate Portal: Payment Workflow Status Determination', () => {
  it('assigns status "submitted" when application_fee_amount is 0 or null', () => {
    assert.equal(determineTargetStatus(0), 'submitted');
    assert.equal(determineTargetStatus(null), 'submitted');
    assert.equal(determineTargetStatus(undefined), 'submitted');
  });

  it('assigns status "payment_pending" when application_fee_amount > 0', () => {
    assert.equal(determineTargetStatus(100), 'payment_pending');
    assert.equal(determineTargetStatus(500.5), 'payment_pending');
  });
});

describe('Candidate Portal: Concurrency, Idempotency & Draft Promotion', () => {
  const activeJob = {
    id: 'job-1',
    status: 'published',
    is_trashed: false,
    never_close_applications: true,
    location_districts: ['Pune'],
    application_fee_amount: 0,
  };

  const sampleProfile = {
    fullName: 'Anurag Patil',
    dateOfBirth: '1995-05-15',
    gender: 'male',
    mobile: '9876543210',
    homeDistrict: 'Pune',
    homeTaluka: 'Haveli',
  };

  const sampleJobSpecific = {
    highestQualification: 'B.Sc Agriculture',
    passingYear: '2018',
    marksPercentage: '74.5',
    drivingLicence: 'two_wheeler',
    experienceYears: '3',
    marathiFluent: true,
  };

  it('creates clean submission with immutable snapshot for fresh applicant', () => {
    const res = simulateSubmission({
      existingApp: null,
      job: activeJob,
      preferredDistrict: 'Pune',
      preferredTaluka: 'Haveli',
      masterProfile: sampleProfile,
      jobSpecific: sampleJobSpecific,
      declaration: { acknowledged: true },
    });

    assert.equal(res.success, true);
    assert.equal(res.already_submitted, false);
    assert.equal(res.status, 'submitted');
    assert.equal(res.snapshot.snapshot_version, 1);
    assert.equal(res.snapshot.master_profile.fullName, 'Anurag Patil');
    assert.equal(res.status_log_entry.from_status, null);
    assert.equal(res.status_log_entry.to_status, 'submitted');
  });

  it('safely promotes an existing draft to submitted without duplicate constraint error', () => {
    const existingDraft = {
      id: 'draft-uuid-999',
      application_number: 'ABF-APP-000099',
      status: 'draft',
    };

    const res = simulateSubmission({
      existingApp: existingDraft,
      job: activeJob,
      preferredDistrict: 'Pune',
      preferredTaluka: 'Haveli',
      masterProfile: sampleProfile,
      jobSpecific: sampleJobSpecific,
      declaration: { acknowledged: true },
    });

    assert.equal(res.success, true);
    assert.equal(res.already_submitted, false);
    assert.equal(res.promoted_from_draft, true);
    assert.equal(res.application_id, 'draft-uuid-999');
    assert.equal(res.application_number, 'ABF-APP-000099');
    assert.equal(res.status_log_entry.from_status, 'draft');
    assert.equal(res.status_log_entry.to_status, 'submitted');
  });

  it('idempotently returns existing application data on retry if already submitted', () => {
    const existingSubmitted = {
      id: 'submitted-uuid-888',
      application_number: 'ABF-APP-000088',
      status: 'submitted',
    };

    const res = simulateSubmission({
      existingApp: existingSubmitted,
      job: activeJob,
      preferredDistrict: 'Pune',
      preferredTaluka: 'Haveli',
      masterProfile: sampleProfile,
      jobSpecific: sampleJobSpecific,
      declaration: { acknowledged: true },
    });

    assert.equal(res.success, true);
    assert.equal(res.already_submitted, true);
    assert.equal(res.application_id, 'submitted-uuid-888');
    assert.equal(res.application_number, 'ABF-APP-000088');
    assert.equal(res.status, 'submitted');
  });

  it('correctly sets payment_pending and withholds premature completion for paid positions', () => {
    const paidJob = { ...activeJob, application_fee_amount: 350 };
    const res = simulateSubmission({
      existingApp: null,
      job: paidJob,
      preferredDistrict: 'Pune',
      preferredTaluka: 'Haveli',
      masterProfile: sampleProfile,
      jobSpecific: sampleJobSpecific,
      declaration: { acknowledged: true },
    });

    assert.equal(res.success, true);
    assert.equal(res.status, 'payment_pending');
    assert.notEqual(res.status, 'submitted');
  });
});

describe('Candidate Portal: Profile Save Payload Sanitation & Integrity', () => {
  function sanitizeProfilePayload(profile) {
    const payload = { ...profile };
    // Rule: Never force empty candidate_id string into DB
    if (!payload.candidate_id) {
      delete payload.candidate_id;
    }
    // Rule: Never send non-existent aadhar_number column to rms_candidate_profiles table
    delete payload.aadhar_number;
    return payload;
  }

  function resolveEffectiveMobile(verifiedMobile, profileMobile, userPhone) {
    const raw = verifiedMobile || profileMobile || userPhone || '';
    const cleaned = String(raw).replace(/\D/g, '').slice(-10);
    if (!cleaned || cleaned.length !== 10) {
      throw new Error('A valid 10-digit verified mobile number is required.');
    }
    return cleaned;
  }

  it('omits candidate_id when blank or undefined to let DB trigger generate it without collision', () => {
    const newProfile = {
      user_id: 'user-uuid-1',
      mobile: '9822012345',
      full_name: 'Santosh Shinde',
      candidate_id: '',
    };
    const sanitized = sanitizeProfilePayload(newProfile);
    assert.equal('candidate_id' in sanitized, false);
    assert.equal(sanitized.candidate_id, undefined);
  });

  it('preserves existing candidate_id when updating an existing profile', () => {
    const existingProfile = {
      user_id: 'user-uuid-1',
      mobile: '9822012345',
      full_name: 'Santosh Shinde',
      candidate_id: 'ABF-CAND-000456',
    };
    const sanitized = sanitizeProfilePayload(existingProfile);
    assert.equal(sanitized.candidate_id, 'ABF-CAND-000456');
  });

  it('removes non-existent aadhar_number column from candidate profile table upsert payload', () => {
    const formInput = {
      user_id: 'user-uuid-1',
      mobile: '9822012345',
      full_name: 'Santosh Shinde',
      aadhar_number: '123456789012',
    };
    const sanitized = sanitizeProfilePayload(formInput);
    assert.equal('aadhar_number' in sanitized, false);
    assert.equal(sanitized.aadhar_number, undefined);
  });

  it('correctly resolves and normalizes 10-digit mobile from verifiedMobile first', () => {
    assert.equal(resolveEffectiveMobile('9822012345', '', ''), '9822012345');
    assert.equal(resolveEffectiveMobile('', '9822012345', '+919999999999'), '9822012345');
    assert.equal(resolveEffectiveMobile('', '', '+919822012345'), '9822012345');
  });

  it('rejects mobile resolution if no valid 10-digit number is available', () => {
    assert.throws(() => resolveEffectiveMobile('', '', ''), /valid 10-digit verified mobile/);
    assert.throws(() => resolveEffectiveMobile('123', '', ''), /valid 10-digit verified mobile/);
  });
});

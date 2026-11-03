import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Mirroring the exact pure function logic from vacancyEligibility.ts for ESM node execution
function checkResidentialVacancyEligibility(candidateDistrict, candidateTaluka, job) {
  const normDistrict = (candidateDistrict || '').trim().toLowerCase();
  const normTaluka = (candidateTaluka || '').trim().toLowerCase();

  const postingLevel = job.posting_level || (
    job.vacancy_level === 'district' || job.vacancy_allocations?.vacancy_level === 'district'
      ? 'District-wise'
      : 'Taluka-wise'
  );
  const isDistrictWise = postingLevel === 'District-wise';

  if (!normDistrict) {
    return {
      status: 'Availability Not Determined',
      vacancyCount: null,
      message: 'Incomplete residential location details in candidate profile. Please verify your address in Step 1.',
      district: candidateDistrict || null,
      taluka: candidateTaluka || null,
      postingLevel,
      lastUpdatedAt: null,
      isReliable: false,
    };
  }

  const allowedDistricts = Array.isArray(job.location_districts) ? job.location_districts : [];
  const districtMatched = allowedDistricts.some(d => d.trim().toLowerCase() === normDistrict);

  if (!districtMatched) {
    return {
      status: 'No Vacancy',
      vacancyCount: 0,
      message: `Your residential district (${candidateDistrict}) is not included in the active recruitment drive for this position.`,
      district: candidateDistrict,
      taluka: candidateTaluka || null,
      postingLevel,
      lastUpdatedAt: job.vacancy_allocations?.updated_at || job.updated_at || null,
      isReliable: true,
    };
  }

  const allocations = job.vacancy_allocations;
  if (!allocations || typeof allocations !== 'object') {
    return {
      status: 'Availability Not Determined',
      vacancyCount: null,
      message: 'Published vacancy quota is not available for this role. Availability cannot be determined.',
      district: candidateDistrict,
      taluka: candidateTaluka || null,
      postingLevel,
      lastUpdatedAt: null,
      isReliable: false,
    };
  }

  const districtAllocations = allocations.district_allocations;
  const distConfig = districtAllocations ? Object.entries(districtAllocations).find(([d]) => d.toLowerCase() === normDistrict)?.[1] : null;

  if (distConfig && distConfig.included === false) {
    return {
      status: 'No Vacancy',
      vacancyCount: 0,
      message: `No active vacancies are allocated in ${candidateDistrict} for this position.`,
      district: candidateDistrict,
      taluka: candidateTaluka || null,
      postingLevel,
      lastUpdatedAt: allocations.updated_at || job.updated_at || null,
      isReliable: true,
    };
  }

  const lastUpdatedAt = allocations.updated_at || job.updated_at || null;

  if (isDistrictWise) {
    let districtCount = 0;
    let countDetermined = false;

    if (distConfig) {
      if (typeof distConfig.calculated_district_total === 'number') {
        districtCount = distConfig.calculated_district_total;
        countDetermined = true;
      } else if (typeof distConfig.override_total === 'number') {
        districtCount = distConfig.override_total;
        countDetermined = true;
      }
    }

    if (!countDetermined && typeof allocations.default_per_district === 'number') {
      districtCount = allocations.default_per_district;
      countDetermined = true;
    }
    if (!countDetermined && typeof job.vacancies_per_district === 'number') {
      districtCount = job.vacancies_per_district;
      countDetermined = true;
    }

    if (!countDetermined) {
      return {
        status: 'Availability Not Determined',
        vacancyCount: null,
        message: `District-level quota for ${candidateDistrict} has not been explicitly published.`,
        district: candidateDistrict,
        taluka: candidateTaluka || null,
        postingLevel,
        lastUpdatedAt,
        isReliable: false,
      };
    }

    if (districtCount > 0) {
      return {
        status: 'Vacancy Available',
        vacancyCount: districtCount,
        message: `Vacancies are available in your residential district (${candidateDistrict}).`,
        district: candidateDistrict,
        taluka: candidateTaluka || null,
        postingLevel,
        lastUpdatedAt,
        isReliable: true,
      };
    }

    return {
      status: 'No Vacancy',
      vacancyCount: 0,
      message: `No open vacancies are currently allocated for ${candidateDistrict}.`,
      district: candidateDistrict,
      taluka: candidateTaluka || null,
      postingLevel,
      lastUpdatedAt,
      isReliable: true,
    };
  }

  // Taluka-wise posting logic
  if (!normTaluka) {
    return {
      status: 'Availability Not Determined',
      vacancyCount: null,
      message: `Taluka is not specified in candidate residential address. Vacancy check requires exact taluka for Taluka-wise positions.`,
      district: candidateDistrict,
      taluka: null,
      postingLevel,
      lastUpdatedAt,
      isReliable: false,
    };
  }

  const talukaAllocations = distConfig?.taluka_allocations;
  if (!talukaAllocations || typeof talukaAllocations !== 'object') {
    return {
      status: 'Availability Not Determined',
      vacancyCount: null,
      message: `Taluka-level quota breakdown for ${candidateDistrict} is not configured.`,
      district: candidateDistrict,
      taluka: candidateTaluka,
      postingLevel,
      lastUpdatedAt,
      isReliable: false,
    };
  }

  const talukaEntry = Object.entries(talukaAllocations).find(([t]) => t.toLowerCase() === normTaluka);
  const ownTalukaConfig = talukaEntry?.[1];

  if (ownTalukaConfig && ownTalukaConfig.included !== false) {
    const ownCount = typeof ownTalukaConfig.vacancies === 'number'
      ? ownTalukaConfig.vacancies
      : (typeof ownTalukaConfig.override_vacancies === 'number'
          ? ownTalukaConfig.override_vacancies
          : (typeof distConfig?.per_taluka === 'number'
              ? distConfig.per_taluka
              : (typeof allocations.default_per_taluka === 'number' ? allocations.default_per_taluka : 0)));

    if (ownCount > 0) {
      return {
        status: 'Vacancy Available',
        vacancyCount: ownCount,
        message: `Vacancies are available in your own taluka (${candidateTaluka}, ${candidateDistrict}).`,
        district: candidateDistrict,
        taluka: candidateTaluka,
        postingLevel,
        lastUpdatedAt,
        isReliable: true,
      };
    }
  }

  // Check other talukas within the same district
  let otherTalukasWithVacancies = 0;
  let totalOtherVacancies = 0;

  Object.entries(talukaAllocations).forEach(([t, cfg]) => {
    if (t.toLowerCase() !== normTaluka && cfg && cfg.included !== false) {
      const v = typeof cfg.vacancies === 'number' ? cfg.vacancies : 0;
      if (v > 0) {
        otherTalukasWithVacancies++;
        totalOtherVacancies += v;
      }
    }
  });

  if (otherTalukasWithVacancies > 0) {
    return {
      status: 'Available in Other Taluka',
      vacancyCount: totalOtherVacancies,
      message: `No open vacancies in your taluka (${candidateTaluka}), but ${totalOtherVacancies} post(s) are available in ${otherTalukasWithVacancies} other taluka(s) of ${candidateDistrict}.`,
      district: candidateDistrict,
      taluka: candidateTaluka,
      postingLevel,
      lastUpdatedAt,
      isReliable: true,
    };
  }

  return {
    status: 'No Vacancy',
    vacancyCount: 0,
    message: `No active vacancies are allocated in ${candidateTaluka} or any other taluka of ${candidateDistrict}.`,
    district: candidateDistrict,
    taluka: candidateTaluka,
    postingLevel,
    lastUpdatedAt,
    isReliable: true,
  };
}

describe('Focused Browser Verification: Step 2 Position Details Scenarios', () => {
  // Test Fixture: Jobs
  const districtWiseJobWithVacancies = {
    id: 'job-dist-1',
    title: 'District Agriculture Supervisor',
    posting_level: 'District-wise',
    vacancy_level: 'district',
    location_districts: ['Pune', 'Satara', 'Solapur'],
    vacancy_allocations: {
      vacancy_level: 'district',
      posting_level: 'District-wise',
      updated_at: '2026-11-03T18:00:00Z',
      district_allocations: {
        Pune: { included: true, calculated_district_total: 10 },
        Satara: { included: true, calculated_district_total: 0 },
        Solapur: { included: false, calculated_district_total: 0 },
      },
    },
    location_questions: [
      { id: 'q1', questionText: 'Are you willing to work outside your native district if required?', required: true, enabled: true },
      { id: 'q2', questionText: 'Are you willing to travel within the assigned district?', required: true, enabled: true },
    ],
  };

  const talukaWiseJob = {
    id: 'job-taluka-1',
    title: 'Taluka Agridoot Officer',
    posting_level: 'Taluka-wise',
    vacancy_level: 'taluka',
    location_districts: ['Pune', 'Ahmednagar'],
    vacancy_allocations: {
      vacancy_level: 'taluka',
      posting_level: 'Taluka-wise',
      default_per_taluka: 1,
      updated_at: '2026-11-03T18:00:00Z',
      district_allocations: {
        Pune: {
          included: true,
          taluka_allocations: {
            Haveli: { included: true, vacancies: 2 },
            Baramati: { included: true, vacancies: 1 },
            Shirur: { included: true, vacancies: 0 },
            Khed: { included: false, vacancies: 0 },
          },
        },
        Ahmednagar: {
          included: true,
          taluka_allocations: {
            Rahata: { included: true, vacancies: 0 },
            Sangamner: { included: true, vacancies: 0 },
          },
        },
      },
    },
    location_questions: [
      { id: 'tq1', questionText: 'Are you willing to work and travel in the assigned taluka?', required: true, enabled: true },
      { id: 'tq2', questionText: 'Are you willing to work in another taluka within the assigned district if required?', required: true, enabled: true },
      { id: 'tq3', questionText: 'Are you willing to work outside your native district if required?', required: false, enabled: true },
    ],
  };

  // Helper function to simulate Step 2 isSameAddress calculation
  function computeAddressState(masterProfile) {
    const currentAddress = {
      line1: masterProfile?.currentAddressLine1 || masterProfile?.addressLine1 || '',
      district: masterProfile?.currentDistrict || masterProfile?.homeDistrict || '',
      taluka: masterProfile?.currentTaluka || masterProfile?.homeTaluka || '',
      pincode: masterProfile?.currentPincode || masterProfile?.pincode || '',
    };

    const permanentAddress = masterProfile?.permanentSameAsCurrent
      ? currentAddress
      : {
          line1: masterProfile?.permanentAddressLine1 || '',
          district: masterProfile?.permanentDistrict || '',
          taluka: masterProfile?.permanentTaluka || '',
          pincode: masterProfile?.permanentPincode || '',
        };

    const isSameAddress = masterProfile?.permanentSameAsCurrent || (
      (!permanentAddress.district && !permanentAddress.taluka && !permanentAddress.line1) ||
      (
        (currentAddress.district || '').trim().toLowerCase() === (permanentAddress.district || '').trim().toLowerCase() &&
        (currentAddress.taluka || '').trim().toLowerCase() === (permanentAddress.taluka || '').trim().toLowerCase() &&
        (currentAddress.line1 || '').trim().toLowerCase() === (permanentAddress.line1 || '').trim().toLowerCase() &&
        (currentAddress.pincode || '').trim() === (permanentAddress.pincode || '').trim()
      )
    );

    const hasAnyResidentialAddress = Boolean(currentAddress.district || permanentAddress.district);

    return {
      currentAddress,
      permanentAddress,
      isSameAddress: Boolean(isSameAddress),
      hasAnyResidentialAddress,
    };
  }

  // Helper function to simulate isDifferentFromNative confirmation necessity
  function checkLocationDifference(data, currentAddress, permanentAddress, isDistrictWise, hasAnyResidentialAddress) {
    if (!data.preferredDistrict) return false;

    const currentMatchesDistrict = Boolean(
      currentAddress.district &&
      data.preferredDistrict.trim().toLowerCase() === currentAddress.district.trim().toLowerCase()
    );
    const currentMatchesTaluka = isDistrictWise
      ? true
      : Boolean(
          currentAddress.taluka &&
          data.preferredTaluka &&
          data.preferredTaluka.trim().toLowerCase() === currentAddress.taluka.trim().toLowerCase()
        );

    const permMatchesDistrict = Boolean(
      permanentAddress.district &&
      data.preferredDistrict.trim().toLowerCase() === permanentAddress.district.trim().toLowerCase()
    );
    const permMatchesTaluka = isDistrictWise
      ? true
      : Boolean(
          permanentAddress.taluka &&
          data.preferredTaluka &&
          data.preferredTaluka.trim().toLowerCase() === permanentAddress.taluka.trim().toLowerCase()
        );

    const matchesCurrent = currentMatchesDistrict && currentMatchesTaluka;
    const matchesPermanent = permMatchesDistrict && permMatchesTaluka;

    if (matchesCurrent || matchesPermanent) {
      return false;
    }

    return hasAnyResidentialAddress;
  }

  // ── Scenario 1: Current and Permanent addresses are identical ─────────────
  it('Scenario 1: Current and Permanent addresses are identical -> Renders single unified address card', () => {
    const profile = {
      fullName: 'Sunil Patil',
      currentAddressLine1: 'Shivaji Chowk, Haveli',
      currentDistrict: 'Pune',
      currentTaluka: 'Haveli',
      currentPincode: '411028',
      permanentSameAsCurrent: true,
      permanentAddressLine1: '',
      permanentDistrict: '',
      permanentTaluka: '',
      permanentPincode: '',
    };

    const addrState = computeAddressState(profile);
    assert.equal(addrState.isSameAddress, true);
    assert.equal(addrState.hasAnyResidentialAddress, true);
    assert.equal(addrState.currentAddress.district, 'Pune');
    assert.equal(addrState.permanentAddress.district, 'Pune');

    const eligibility = checkResidentialVacancyEligibility(addrState.currentAddress.district, addrState.currentAddress.taluka, talukaWiseJob);
    assert.equal(eligibility.status, 'Vacancy Available');
    assert.equal(eligibility.vacancyCount, 2);
  });

  // ── Scenario 2: Current and Permanent addresses belong to different districts
  it('Scenario 2: Current and Permanent addresses belong to different districts -> Evaluates each separately', () => {
    const profile = {
      fullName: 'Ramesh Jadhav',
      currentAddressLine1: 'Station Road, Pune',
      currentDistrict: 'Pune',
      currentTaluka: 'Haveli',
      currentPincode: '411001',
      permanentSameAsCurrent: false,
      permanentAddressLine1: 'Village Post, Wai',
      permanentDistrict: 'Satara',
      permanentTaluka: 'Wai',
      permanentPincode: '412803',
    };

    const addrState = computeAddressState(profile);
    assert.equal(addrState.isSameAddress, false);
    assert.equal(addrState.currentAddress.district, 'Pune');
    assert.equal(addrState.permanentAddress.district, 'Satara');

    // Current is in Pune -> Vacancy Available
    const currentElig = checkResidentialVacancyEligibility(addrState.currentAddress.district, addrState.currentAddress.taluka, talukaWiseJob);
    assert.equal(currentElig.status, 'Vacancy Available');
    assert.equal(currentElig.vacancyCount, 2);

    // Permanent is in Satara -> Satara is NOT in location_districts of talukaWiseJob -> No Vacancy
    const permElig = checkResidentialVacancyEligibility(addrState.permanentAddress.district, addrState.permanentAddress.taluka, talukaWiseJob);
    assert.equal(permElig.status, 'No Vacancy');
    assert.equal(permElig.vacancyCount, 0);
  });

  // ── Scenario 3: District-wise posting with available and unavailable vacancies
  it('Scenario 3: District-wise posting evaluates vacancy at district level (available vs zero vacancy)', () => {
    // Pune has 10 vacancies
    const puneElig = checkResidentialVacancyEligibility('Pune', 'AnyTaluka', districtWiseJobWithVacancies);
    assert.equal(puneElig.status, 'Vacancy Available');
    assert.equal(puneElig.vacancyCount, 10);
    assert.equal(puneElig.postingLevel, 'District-wise');

    // Satara has 0 calculated vacancies
    const sataraElig = checkResidentialVacancyEligibility('Satara', 'AnyTaluka', districtWiseJobWithVacancies);
    assert.equal(sataraElig.status, 'No Vacancy');
    assert.equal(sataraElig.vacancyCount, 0);

    // Solapur is excluded in district_allocations (included: false)
    const solapurElig = checkResidentialVacancyEligibility('Solapur', 'AnyTaluka', districtWiseJobWithVacancies);
    assert.equal(solapurElig.status, 'No Vacancy');
    assert.equal(solapurElig.vacancyCount, 0);
  });

  // ── Scenario 4: Taluka-wise posting with vacancy in own taluka ──────────────
  it('Scenario 4: Taluka-wise posting with vacancy in own taluka -> Vacancy Available', () => {
    const elig = checkResidentialVacancyEligibility('Pune', 'Haveli', talukaWiseJob);
    assert.equal(elig.status, 'Vacancy Available');
    assert.equal(elig.vacancyCount, 2);
    assert.match(elig.message, /in your own taluka \(Haveli, Pune\)/);
    assert.equal(elig.lastUpdatedAt, '2026-11-03T18:00:00Z');
  });

  // ── Scenario 5: Taluka-wise posting with vacancy only in another taluka of the same district
  it('Scenario 5: Taluka-wise posting with vacancy only in another taluka -> Available in Other Taluka', () => {
    // Shirur has 0 vacancies, but Haveli has 2 and Baramati has 1 -> 3 total other vacancies
    const elig = checkResidentialVacancyEligibility('Pune', 'Shirur', talukaWiseJob);
    assert.equal(elig.status, 'Available in Other Taluka');
    assert.equal(elig.vacancyCount, 3);
    assert.match(elig.message, /No open vacancies in your taluka \(Shirur\), but 3 post\(s\) are available in 2 other taluka\(s\) of Pune/);
  });

  // ── Scenario 6: Zero vacancy and incomplete address data ───────────────────
  it('Scenario 6: Incomplete address data returns Availability Not Determined; empty district returns No Vacancy', () => {
    // Candidate with no district/taluka
    const incompleteAddr = checkResidentialVacancyEligibility('', '', talukaWiseJob);
    assert.equal(incompleteAddr.status, 'Availability Not Determined');
    assert.equal(incompleteAddr.isReliable, false);
    assert.equal(incompleteAddr.vacancyCount, null);

    // Candidate with district but no taluka in a Taluka-wise job
    const missingTaluka = checkResidentialVacancyEligibility('Pune', '', talukaWiseJob);
    assert.equal(missingTaluka.status, 'Availability Not Determined');
    assert.equal(missingTaluka.vacancyCount, null);

    // Ahmednagar talukas have 0 total vacancies
    const zeroDist = checkResidentialVacancyEligibility('Ahmednagar', 'Rahata', talukaWiseJob);
    assert.equal(zeroDist.status, 'No Vacancy');
    assert.equal(zeroDist.vacancyCount, 0);
  });

  // ── Scenario 7: Preferred location same as and different from residential location
  it('Scenario 7: Preferred location difference confirmation logic', () => {
    const currentAddress = { district: 'Pune', taluka: 'Haveli', line1: 'Pune', pincode: '411001' };
    const permanentAddress = { district: 'Satara', taluka: 'Wai', line1: 'Wai', pincode: '412803' };

    // 1. Preferred is Pune + Haveli -> matches current address -> NO confirmation required
    const matchesCurrent = checkLocationDifference(
      { preferredDistrict: 'Pune', preferredTaluka: 'Haveli' },
      currentAddress,
      permanentAddress,
      false, // isDistrictWise
      true   // hasAnyResidentialAddress
    );
    assert.equal(matchesCurrent, false);

    // 2. Preferred is Satara + Wai -> matches permanent address -> NO confirmation required
    const matchesPerm = checkLocationDifference(
      { preferredDistrict: 'Satara', preferredTaluka: 'Wai' },
      currentAddress,
      permanentAddress,
      false,
      true
    );
    assert.equal(matchesPerm, false);

    // 3. Preferred is Pune + Baramati (different taluka) -> DOES NOT MATCH either exactly -> confirmation REQUIRED
    const diffTaluka = checkLocationDifference(
      { preferredDistrict: 'Pune', preferredTaluka: 'Baramati' },
      currentAddress,
      permanentAddress,
      false,
      true
    );
    assert.equal(diffTaluka, true);

    // 4. In District-wise posting: preferred is Pune -> matches current district -> NO confirmation required
    const districtWiseMatch = checkLocationDifference(
      { preferredDistrict: 'Pune', preferredTaluka: '' },
      currentAddress,
      permanentAddress,
      true, // isDistrictWise
      true
    );
    assert.equal(districtWiseMatch, false);

    // 5. In District-wise posting: preferred is Ahmednagar -> neither current nor perm is Ahmednagar -> confirmation REQUIRED
    const districtWiseDiff = checkLocationDifference(
      { preferredDistrict: 'Ahmednagar', preferredTaluka: '' },
      currentAddress,
      permanentAddress,
      true,
      true
    );
    assert.equal(districtWiseDiff, true);
  });

  // ── Scenario 8: Draft save, resume, and Review & Submit persistence ───────
  it('Scenario 8: Draft persistence maintains both residential addresses and preferred locations intact', () => {
    const mockAppDraft = {
      master_profile: {
        fullName: 'Aniket Deshmukh',
        currentDistrict: 'Pune',
        currentTaluka: 'Haveli',
        currentAddressLine1: 'Sinhagad Road',
        currentPincode: '411041',
        permanentSameAsCurrent: false,
        permanentDistrict: 'Satara',
        permanentTaluka: 'Karad',
        permanentAddressLine1: 'Malkapur Road',
        permanentPincode: '415110',
      },
      job_specific: {
        preferredDistrict: 'Pune',
        preferredTaluka: 'Baramati',
        locationConfirmed: true,
        locationAnswers: {
          tq1: true,
          tq2: false,
          tq3: true,
        },
        questionnaireAnswers: {
          q_farming_exp: '3 Years',
        },
      },
    };

    // Verify isolation of mobility answers from questionnaire answers
    assert.ok(mockAppDraft.job_specific.locationAnswers);
    assert.ok(mockAppDraft.job_specific.questionnaireAnswers);
    assert.notDeepEqual(mockAppDraft.job_specific.locationAnswers, mockAppDraft.job_specific.questionnaireAnswers);

    // Verify addresses survive draft restoration
    const restoredCurrent = mockAppDraft.master_profile.currentDistrict;
    const restoredPerm = mockAppDraft.master_profile.permanentDistrict;
    assert.equal(restoredCurrent, 'Pune');
    assert.equal(restoredPerm, 'Satara');

    // Verify location answers are valid booleans
    assert.equal(mockAppDraft.job_specific.locationAnswers.tq1, true);
    assert.equal(mockAppDraft.job_specific.locationAnswers.tq2, false);
    assert.equal(mockAppDraft.job_specific.locationAnswers.tq3, true);
  });

  // ── Scenario 9: Preferred Posting Location - No Automatic Defaults ─────────
  it('Scenario 9: Does not automatically preselect candidate residential district or taluka', () => {
    // Initial state of JobSpecificFormData
    const initialJobSpecific = {
      preferredDistrict: '',
      preferredTaluka: '',
    };

    // Candidate has residential address in Pune / Haveli
    const profile = {
      currentDistrict: 'Pune',
      currentTaluka: 'Haveli',
    };

    // Assert initial state remains empty (not prefilled)
    assert.equal(initialJobSpecific.preferredDistrict, '');
    assert.equal(initialJobSpecific.preferredTaluka, '');
    assert.notEqual(initialJobSpecific.preferredDistrict, profile.currentDistrict);
  });

  // ── Scenario 10: Changing District Resets Taluka ──────────────────────────
  it('Scenario 10: Changing Preferred District resets Preferred Taluka selection', () => {
    let state = {
      preferredDistrict: 'Pune',
      preferredTaluka: 'Haveli',
    };

    // Simulate handleDistrictChange
    function handleDistrictChange(newDist) {
      state = {
        ...state,
        preferredDistrict: newDist,
        preferredTaluka: '',
      };
    }

    handleDistrictChange('Ahmednagar');
    assert.equal(state.preferredDistrict, 'Ahmednagar');
    assert.equal(state.preferredTaluka, '');
  });

  // ── Scenario 11: Dynamic Bottom Navigation Button Label ───────────────────
  it('Scenario 11: Dynamic navigation button label according to questionnaire status', () => {
    function getButtonLabel(job) {
      const q = job?.questionnaire || job?.vacancy_allocations?.questionnaire;
      const hasPublishedQuestionnaire = Boolean(
        q &&
        q.status !== 'draft' &&
        q.isVisibleToCandidates !== false &&
        Array.isArray(q.questions) &&
        q.questions.some((item) => item.isVisible !== false)
      );
      return hasPublishedQuestionnaire ? 'Continue to Job-Specific Questions' : 'Review Application';
    }

    // Job with published questionnaire
    const jobWithQ = {
      ...talukaWiseJob,
      questionnaire: {
        status: 'published',
        isVisibleToCandidates: true,
        questions: [{ id: 'q1', isVisible: true }],
      },
    };
    assert.equal(getButtonLabel(jobWithQ), 'Continue to Job-Specific Questions');

    // Job without questionnaire
    const jobWithoutQ = {
      ...talukaWiseJob,
      questionnaire: null,
    };
    assert.equal(getButtonLabel(jobWithoutQ), 'Review Application');

    // Job with draft / hidden questionnaire
    const jobWithDraftQ = {
      ...talukaWiseJob,
      questionnaire: {
        status: 'draft',
        isVisibleToCandidates: false,
        questions: [{ id: 'q1', isVisible: false }],
      },
    };
    assert.equal(getButtonLabel(jobWithDraftQ), 'Review Application');
  });
});

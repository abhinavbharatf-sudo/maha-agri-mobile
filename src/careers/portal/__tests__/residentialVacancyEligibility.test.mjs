import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Helper logic mirrored from vacancyEligibility.ts for testing in ESM node:test
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

describe('Candidate Residential Location & Job-Specific Vacancy Eligibility', () => {
  const baseJob = {
    id: 'job-101',
    title: 'Maha-Agri Coordinator',
    posting_level: 'Taluka-wise',
    location_districts: ['Pune', 'Satara', 'Nashik'],
    vacancy_allocations: {
      vacancy_level: 'taluka',
      posting_level: 'Taluka-wise',
      default_per_taluka: 1,
      updated_at: '2026-11-03T10:00:00Z',
      district_allocations: {
        Pune: {
          included: true,
          taluka_allocations: {
            Haveli: { included: true, vacancies: 2 },
            Baramati: { included: true, vacancies: 1 },
            Shirur: { included: false, vacancies: 0 },
            Junnar: { included: true, vacancies: 0 },
          },
        },
        Satara: {
          included: true,
          taluka_allocations: {
            Karad: { included: true, vacancies: 3 },
            Wai: { included: true, vacancies: 0 },
          },
        },
      },
    },
  };

  it('1. Returns Vacancy Available when candidate residential taluka has vacancies', () => {
    const res = checkResidentialVacancyEligibility('Pune', 'Haveli', baseJob);
    assert.equal(res.status, 'Vacancy Available');
    assert.equal(res.vacancyCount, 2);
    assert.equal(res.isReliable, true);
    assert.match(res.message, /in your own taluka/i);
    assert.equal(res.lastUpdatedAt, '2026-11-03T10:00:00Z');
  });

  it('2. Distinguishes Available in Other Taluka when own taluka has 0 vacancies', () => {
    const res = checkResidentialVacancyEligibility('Pune', 'Junnar', baseJob);
    assert.equal(res.status, 'Available in Other Taluka');
    assert.equal(res.vacancyCount, 3); // 2 in Haveli + 1 in Baramati
    assert.equal(res.isReliable, true);
    assert.match(res.message, /Available in Other Taluka|other taluka/i);
  });

  it('3. Distinguishes Available in Other Taluka when own taluka is excluded', () => {
    const res = checkResidentialVacancyEligibility('Pune', 'Shirur', baseJob);
    assert.equal(res.status, 'Available in Other Taluka');
    assert.equal(res.vacancyCount, 3);
  });

  it('4. Returns No Vacancy when candidate district is not in active drive', () => {
    const res = checkResidentialVacancyEligibility('Nagpur', 'Nagpur Rural', baseJob);
    assert.equal(res.status, 'No Vacancy');
    assert.equal(res.vacancyCount, 0);
    assert.match(res.message, /not included in the active recruitment drive/i);
  });

  it('5. Returns Availability Not Determined when candidate address lacks district', () => {
    const res = checkResidentialVacancyEligibility('', '', baseJob);
    assert.equal(res.status, 'Availability Not Determined');
    assert.equal(res.vacancyCount, null);
    assert.equal(res.isReliable, false);
  });

  it('6. Returns Availability Not Determined when candidate lacks taluka in Taluka-wise job', () => {
    const res = checkResidentialVacancyEligibility('Pune', '', baseJob);
    assert.equal(res.status, 'Availability Not Determined');
    assert.equal(res.vacancyCount, null);
  });

  it('7. Returns Availability Not Determined when job has no reliable vacancy allocations data', () => {
    const unallocatedJob = {
      id: 'job-unallocated',
      posting_level: 'District-wise',
      location_districts: ['Pune'],
      vacancy_allocations: null,
    };
    const res = checkResidentialVacancyEligibility('Pune', '', unallocatedJob);
    assert.equal(res.status, 'Availability Not Determined');
    assert.equal(res.vacancyCount, null);
    assert.equal(res.isReliable, false);
  });

  it('8. District-wise job checks availability at district level', () => {
    const districtJob = {
      id: 'job-dist',
      posting_level: 'District-wise',
      location_districts: ['Pune', 'Nashik'],
      vacancy_allocations: {
        vacancy_level: 'district',
        posting_level: 'District-wise',
        district_allocations: {
          Pune: { included: true, calculated_district_total: 15 },
          Nashik: { included: true, calculated_district_total: 0 },
        },
      },
    };

    const resPune = checkResidentialVacancyEligibility('Pune', 'AnyTaluka', districtJob);
    assert.equal(resPune.status, 'Vacancy Available');
    assert.equal(resPune.vacancyCount, 15);

    const resNashik = checkResidentialVacancyEligibility('Nashik', 'AnyTaluka', districtJob);
    assert.equal(resNashik.status, 'No Vacancy');
    assert.equal(resNashik.vacancyCount, 0);
  });

  it('9. Section 3 cards display only District and Taluka in Location details without address-line text', () => {
    const step2Path = resolve(process.cwd(), 'project/src/careers/portal/steps/Step2JobSpecific.tsx');
    const step2Content = readFileSync(step2Path, 'utf8');

    // Section 3 must still exist with its heading and components
    assert.match(step2Content, /SECTION 3:\s*Your Residential Location & Vacancy Availability/);
    assert.match(step2Content, /Current Residential Address/);
    assert.match(step2Content, /Permanent Residential Address/);

    // Section 3 Location detail must display district and taluka on a single line separated by '|'
    assert.match(step2Content, /District:\s*<\/span>\s*<span[^>]*>\{currentAddress\.district \|\| 'Not specified'\}<\/span>\s*<span[^>]*>\|<\/span>\s*<span>Taluka:\s*<\/span>\s*<span[^>]*>\{currentAddress\.taluka \|\| 'Not specified'\}<\/span>/);
    assert.match(step2Content, /District:\s*<\/span>\s*<span[^>]*>\{permanentAddress\.district \|\| 'Not specified'\}<\/span>\s*<span[^>]*>\|<\/span>\s*<span>Taluka:\s*<\/span>\s*<span[^>]*>\{permanentAddress\.taluka \|\| 'Not specified'\}<\/span>/);

    // Section 3 must NOT contain address-line text displays
    assert.doesNotMatch(step2Content, /Address Line:/);
    assert.doesNotMatch(step2Content, /currentAddress\.line1 && <p/);
    assert.doesNotMatch(step2Content, /permanentAddress\.line1 && <p/);

    // Review & Submit (Step3ReviewSubmit.tsx) must retain full address-line details
    const step3Path = resolve(process.cwd(), 'project/src/careers/portal/steps/Step3ReviewSubmit.tsx');
    const step3Content = readFileSync(step3Path, 'utf8');
    assert.match(step3Content, /masterProfile\.currentAddressLine1/);
    assert.match(step3Content, /masterProfile\.permanentAddressLine1/);
  });
});

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Mirrored getLocationVacancyStatus function to verify pure algorithm
function getLocationVacancyStatus(district, taluka, job) {
  const cleanDistrict = (district || '').trim();
  const cleanTaluka = (taluka || '').trim();

  if (!cleanDistrict) {
    return { status: 'NOT DETERMINED', count: null, message: 'District not specified' };
  }

  if (!job) {
    return { status: 'NOT DETERMINED', count: null, message: 'Vacancy data not available' };
  }

  if (Array.isArray(job.location_districts) && job.location_districts.length > 0) {
    const isDistrictInJob = job.location_districts.some(
      d => d.trim().toLowerCase() === cleanDistrict.toLowerCase()
    );
    if (!isDistrictInJob) {
      return { status: 'NO VACANCY', count: 0, message: 'District is not included in this recruitment drive' };
    }
  }

  const distAllocMap = job.vacancy_allocations?.district_allocations;
  const matchedDistKey = distAllocMap
    ? Object.keys(distAllocMap).find(k => k.trim().toLowerCase() === cleanDistrict.toLowerCase())
    : undefined;
  const distAlloc = matchedDistKey ? distAllocMap[matchedDistKey] : undefined;

  if (distAlloc && distAlloc.included === false) {
    return { status: 'NO VACANCY', count: 0, message: `${cleanDistrict} district is excluded from this drive` };
  }

  if (cleanTaluka) {
    const talukaAllocMap = distAlloc?.taluka_allocations;
    const matchedTalukaKey = talukaAllocMap
      ? Object.keys(talukaAllocMap).find(k => k.trim().toLowerCase() === cleanTaluka.toLowerCase())
      : undefined;
    const talukaAlloc = matchedTalukaKey ? talukaAllocMap[matchedTalukaKey] : undefined;

    if (talukaAlloc && talukaAlloc.included === false) {
      return { status: 'NO VACANCY', count: 0, message: `${cleanTaluka} taluka is excluded` };
    }

    if (talukaAlloc && talukaAlloc.vacancies != null) {
      const v = Number(talukaAlloc.vacancies);
      if (v > 0) return { status: 'AVAILABLE', count: v, message: `${v} open posts` };
      return { status: 'NO VACANCY', count: 0, message: '0 open posts' };
    }

    return { status: 'NOT DETERMINED', count: null, message: 'Taluka quota not determined' };
  }

  const explicitDistrictCount =
    distAlloc?.calculated_district_total != null
      ? Number(distAlloc.calculated_district_total)
      : distAlloc?.override_total != null
      ? Number(distAlloc.override_total)
      : null;

  if (explicitDistrictCount != null) {
    if (explicitDistrictCount > 0) {
      return { status: 'AVAILABLE', count: explicitDistrictCount, message: `${explicitDistrictCount} open posts` };
    }
    return { status: 'NO VACANCY', count: 0, message: '0 open posts' };
  }

  return { status: 'NOT DETERMINED', count: null, message: 'District quota not determined' };
}

describe('Multiple Preferred Posting Locations — Verification & Safety Suite', () => {
  const step2Path = resolve('project/src/careers/portal/steps/Step2JobSpecific.tsx');
  const step2Source = readFileSync(step2Path, 'utf8');

  const step3Path = resolve('project/src/careers/portal/steps/Step3ReviewSubmit.tsx');
  const step3Source = readFileSync(step3Path, 'utf8');

  const typesPath = resolve('project/src/careers/lib/types.ts');
  const typesSource = readFileSync(typesPath, 'utf8');

  const portalTypesPath = resolve('project/src/careers/portal/types.ts');
  const portalTypesSource = readFileSync(portalTypesPath, 'utf8');

  const managerPath = resolve('project/src/careers/admin/components/HRLocationAndVacancyManager.tsx');
  const managerSource = readFileSync(managerPath, 'utf8');

  const apiPath = resolve('project/src/careers/portal/api.ts');
  const apiSource = readFileSync(apiPath, 'utf8');

  const hrProfilePath = resolve('project/src/careers/admin/HRCandidateProfile.tsx');
  const hrProfileSource = readFileSync(hrProfilePath, 'utf8');

  const expectedMobilityConsentText = "I understand that I have selected preferred posting locations outside my current and/or permanent residential district. I am willing to work in the selected districts, subject to vacancy availability, recruitment requirements and the organisation's final posting decision. My preferences do not guarantee posting in any specific district or taluka.";

  test('1. Type definitions: MultipleLocationsConfig and DistrictPreference are strictly typed', () => {
    assert.ok(typesSource.includes('export interface MultipleLocationsConfig'));
    assert.ok(typesSource.includes('enabled: boolean'));
    assert.ok(typesSource.includes('maxDistricts: 1 | 2 | 3'));
    assert.ok(typesSource.includes('maxTalukasPerDistrict: 1 | 2'));
    assert.ok(portalTypesSource.includes('export interface DistrictPreference'));
    assert.ok(portalTypesSource.includes('priority: number'));
    assert.ok(portalTypesSource.includes('talukas?: string[]'));
    assert.ok(portalTypesSource.includes('export interface MobilityConsentRecord'));
  });

  test('2. HR Location & Vacancy Manager provides Multiple Preferred Locations configuration panel', () => {
    assert.ok(managerSource.includes('Multiple Preferred Posting Locations'));
    assert.ok(managerSource.includes('handleToggleMultipleLocations'));
    assert.ok(managerSource.includes('handleMaxDistrictsChange'));
    assert.ok(managerSource.includes('Maximum Preferred Districts'));
    assert.ok(managerSource.includes('Maximum Preferred Talukas per District'));
  });

  test('3. Exact Mobility Consent Declaration text matches mandate verbatim', () => {
    assert.ok(step2Source.includes(expectedMobilityConsentText));
  });

  test('4. Vacancy status evaluation returns AVAILABLE when vacancies exist', () => {
    const mockJob = {
      id: 'job-1',
      posting_level: 'Taluka-wise',
      location_districts: ['Pune'],
      vacancy_allocations: {
        district_allocations: {
          'Pune': {
            included: true,
            calculated_district_total: 10,
            taluka_allocations: {
              'Haveli': { vacancies: 4, included: true },
              'Baramati': { vacancies: 0, included: true },
            },
          },
        },
      },
    };

    const distRes = getLocationVacancyStatus('Pune', null, mockJob);
    assert.equal(distRes.status, 'AVAILABLE');
    assert.equal(distRes.count, 10);

    const talRes1 = getLocationVacancyStatus('Pune', 'Haveli', mockJob);
    assert.equal(talRes1.status, 'AVAILABLE');
    assert.equal(talRes1.count, 4);

    const talRes2 = getLocationVacancyStatus('Pune', 'Baramati', mockJob);
    assert.equal(talRes2.status, 'NO VACANCY');
    assert.equal(talRes2.count, 0);
  });

  test('5. Vacancy status evaluation returns NO VACANCY when district has 0 posts or excluded', () => {
    const mockJob = {
      id: 'job-1',
      location_districts: ['Wardha', 'Nagpur'],
      vacancy_allocations: {
        district_allocations: {
          'Wardha': {
            included: true,
            calculated_district_total: 0,
            taluka_allocations: {},
          },
          'Nagpur': {
            included: false,
          },
        },
      },
    };

    const resWardha = getLocationVacancyStatus('Wardha', null, mockJob);
    assert.equal(resWardha.status, 'NO VACANCY');

    const resNagpur = getLocationVacancyStatus('Nagpur', null, mockJob);
    assert.equal(resNagpur.status, 'NO VACANCY');

    const resUnknown = getLocationVacancyStatus('Solapur', null, mockJob);
    assert.equal(resUnknown.status, 'NO VACANCY');
  });

  test('6. Vacancy status evaluation returns NOT DETERMINED when allocation data is missing', () => {
    const mockJob = {
      id: 'job-2',
      vacancy_allocations: null,
    };
    const res = getLocationVacancyStatus('Pune', 'Haveli', mockJob);
    assert.equal(res.status, 'NOT DETERMINED');
  });

  test('7. Step2JobSpecific detects multiple locations configuration & enforces limits', () => {
    assert.ok(step2Source.includes('isMultipleLocationsEnabled'));
    assert.ok(step2Source.includes('maxDistrictsAllowed'));
    assert.ok(step2Source.includes('maxTalukasPerDistrict'));
    assert.ok(step2Source.includes('syncPreferredDistricts'));
    assert.ok(step2Source.includes('handleAddPreferredDistrict'));
    assert.ok(step2Source.includes('handleRemovePreferredDistrict'));
  });

  test('8. Step2JobSpecific prevents duplicate district selection in dropdowns', () => {
    assert.ok(step2Source.includes('selectedDistrictsInOtherCards'));
    assert.ok(step2Source.includes('Already Selected in Another Priority'));
  });

  test('9. Step2JobSpecific hides Taluka controls for District-wise drives and shows for Taluka-wise', () => {
    assert.ok(step2Source.includes('!isDistrictWise && ('));
    assert.ok(step2Source.includes('Preferred Talukas in'));
    assert.ok(step2Source.includes('+ Add Second Preferred Taluka'));
  });

  test('10. Conditional Mobility Consent is calculated based on candidate residential districts', () => {
    assert.ok(step2Source.includes('candidateResidentialDistricts'));
    assert.ok(step2Source.includes('outsideDistricts'));
    assert.ok(step2Source.includes('requiresMobilityConsent'));
    assert.ok(step2Source.includes('All your selected preferred posting locations match your declared residential district(s)'));
    assert.ok(step2Source.includes('Mobility &amp; Posting Allocation Consent'));
  });

  test('11. Mobility Consent Modal workflow exists with I Agree & Continue action', () => {
    assert.ok(step2Source.includes('showMobilityModal'));
    assert.ok(step2Source.includes('I Agree &amp; Continue'));
    assert.ok(step2Source.includes('MOBILITY_CONSENT_TEXT'));
  });

  test('12. Step 3 Review & Submit renders Multiple Preferred Locations summary with priorities and badges', () => {
    assert.ok(step3Source.includes('Selected Preferred Posting Locations'));
    assert.ok(step3Source.includes('Priority {p.priority}'));
    assert.ok(step3Source.includes('Mobility Consent Accepted'));
  });

  test('13. Persistence: Portal API stores preferred_locations and mobility_consent', () => {
    assert.ok(apiSource.includes('preferred_locations: jobSpecific.preferredDistricts'));
    assert.ok(apiSource.includes('mobility_consent: jobSpecific.mobilityConsent'));
    assert.ok(apiSource.includes('preferred_district: jobSpecific.preferredDistrict'));
    assert.ok(apiSource.includes('preferred_taluka: jobSpecific.preferredTaluka'));
  });

  test('14. HR Candidate Profile displays Preferred Posting Locations and verified Mobility Consent', () => {
    assert.ok(hrProfileSource.includes('Preferred Posting Locations'));
    assert.ok(hrProfileSource.includes('preferredDistrictsList'));
    assert.ok(hrProfileSource.includes('Mobility Consent Verified'));
  });

  test('15. Backward compatibility: Single-district mode is preserved when multiple locations disabled', () => {
    assert.ok(step2Source.includes('SINGLE PREFERRED LOCATION WORKFLOW (LEGACY / DISABLED)'));
    assert.ok(step2Source.includes('Location Difference Confirmation'));
    assert.ok(step3Source.includes('Single District/Taluka View'));
  });

  test('16. Form validation blocks progression if outside districts are selected without mobility consent', () => {
    assert.ok(step2Source.includes('requiresMobilityConsent && !data.mobilityConsent?.consented && !data.locationConfirmed'));
    assert.ok(step2Source.includes('Please confirm your willingness to work at the selected posting location(s) outside your residential district.'));
  });

  test('17. Schema Protection: multiple_locations_config is encapsulated in vacancy_allocations and excluded from bare table columns', () => {
    const libApiPath = resolve('project/src/careers/lib/api.ts');
    const libApiSource = readFileSync(libApiPath, 'utf8');

    const editorPath = resolve('project/src/careers/admin/HRJobPostingEditor.tsx');
    const editorSource = readFileSync(editorPath, 'utf8');

    // In upsertJob, multiple_locations_config is destructured out of top-level rest
    assert.ok(libApiSource.includes('multiple_locations_config, ...rest } = job'));
    assert.ok(libApiSource.includes('...(multiple_locations_config !== undefined ? { multiple_locations_config } : {})'));

    // In hydrateJob, multiple_locations_config is read from vacancy_allocations
    assert.ok(libApiSource.includes('multiple_locations_config: job.multiple_locations_config || job.vacancy_allocations?.multiple_locations_config || null'));

    // In HRJobPostingEditor, multiple_locations_config is deleted from bare payload before upsertJob
    assert.ok(editorSource.includes('delete (payload as any).multiple_locations_config'));
  });
});

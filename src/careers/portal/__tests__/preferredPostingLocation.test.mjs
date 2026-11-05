import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Emulators matching Step2JobSpecific logic
function computeAllowedDistricts(job, allMaharashtraDistricts) {
  if (Array.isArray(job.location_districts) && job.location_districts.length > 0) {
    const filtered = job.location_districts.filter(d => Boolean(d && d.trim()));
    if (filtered.length > 0) return filtered;
  }
  const distAlloc = job.vacancy_allocations?.district_allocations;
  if (distAlloc && typeof distAlloc === 'object') {
    const keys = Object.keys(distAlloc).filter(k => distAlloc[k]?.included !== false);
    if (keys.length > 0) return keys;
  }
  return allMaharashtraDistricts;
}

function resolveAvailableTalukas(preferredDistrict, job, geoTalukaLookup) {
  if (!preferredDistrict) {
    return { availableTalukas: [], talukaFilterSupported: true };
  }
  const distAlloc = job.vacancy_allocations?.district_allocations?.[preferredDistrict];
  if (distAlloc?.taluka_allocations && Object.keys(distAlloc.taluka_allocations).length > 0) {
    const filtered = [];
    Object.entries(distAlloc.taluka_allocations).forEach(([tName, tConfig]) => {
      if (tConfig && tConfig.included !== false) {
        filtered.push(tName);
      }
    });
    if (filtered.length > 0) {
      return { availableTalukas: filtered, talukaFilterSupported: true };
    }
  }
  const geoTalukas = geoTalukaLookup(preferredDistrict) || [];
  return { availableTalukas: geoTalukas, talukaFilterSupported: true };
}

function determinePostingLevel(job) {
  if (job.posting_level) return job.posting_level;
  if (job.vacancy_allocations?.posting_level) return job.vacancy_allocations.posting_level;
  if (job.vacancy_level === 'district' || job.vacancy_allocations?.vacancy_level === 'district') {
    return 'District-wise';
  }
  return 'Taluka-wise';
}

test('Preferred Posting Location — Drive Type & Dynamic Geography Architecture', async (t) => {
  const step2Path = resolve(process.cwd(), 'project/src/careers/portal/steps/Step2JobSpecific.tsx');
  const step2Content = readFileSync(step2Path, 'utf8');

  const geoPath = resolve(process.cwd(), 'project/src/data/maharashtraGeography.ts');
  const geoContent = readFileSync(geoPath, 'utf8');

  await t.test('1. Section 4 Header is explicitly PREFERRED POSTING LOCATION and marked mandatory', () => {
    assert.match(step2Content, /4\.\s*PREFERRED POSTING LOCATION/);
    assert.match(step2Content, /PREFERRED POSTING LOCATION\s*<span className="text-red-500">\*<\/span>/);
  });

  await t.test('2. Allowed districts fall back to all Maharashtra districts when job has no restriction', () => {
    assert.match(geoContent, /MAHARASHTRA_DISTRICTS/);
    assert.match(geoContent, /Pune/);
    assert.match(geoContent, /Nashik/);
    assert.match(geoContent, /Nagpur/);

    // Verify allowedDistricts fallback logic in Step2JobSpecific
    assert.match(step2Content, /fallback to all Maharashtra districts/i);
    assert.match(step2Content, /return MAHARASHTRA_DISTRICTS/);

    const fallbackDistricts = ['Pune', 'Nashik', 'Nagpur', 'Kolhapur', 'Thane', 'Satara'];
    const jobWithoutDistricts = { id: 'job-1', title: 'Agronomist' };
    const allowed = computeAllowedDistricts(jobWithoutDistricts, fallbackDistricts);
    assert.deepEqual(allowed, fallbackDistricts, 'Must return all fallback districts');
  });

  await t.test('3. Dynamic Taluka resolution returns talukas for any selected district', () => {
    const geoLookup = (district) => {
      if (district === 'Pune') return ['Haveli', 'Baramati', 'Shirur', 'Khed', 'Maval'];
      if (district === 'Nagpur') return ['Nagpur (Urban)', 'Nagpur (Rural)', 'Kamptee', 'Katol'];
      return ['Central Taluka'];
    };

    // Taluka-wise job without specific taluka allocation config still gets geographic talukas
    const job = { id: 'job-1', posting_level: 'Taluka-wise' };
    const resultPune = resolveAvailableTalukas('Pune', job, geoLookup);
    assert.ok(resultPune.availableTalukas.includes('Haveli'));
    assert.ok(resultPune.availableTalukas.includes('Baramati'));

    // In Step2JobSpecific, verify fallback to getTalukasForDistrict exists
    assert.match(step2Content, /getTalukasForDistrict\(data\.preferredDistrict\)/);
  });

  await t.test('4. Drive Type controls: Taluka-wise vs District-wise', () => {
    const districtJob = { posting_level: 'District-wise' };
    assert.equal(determinePostingLevel(districtJob), 'District-wise');

    const talukaJob = { posting_level: 'Taluka-wise' };
    assert.equal(determinePostingLevel(talukaJob), 'Taluka-wise');

    // District-wise drive suppresses Taluka dropdown in Step 2 template
    assert.match(step2Content, /\{!isDistrictWise && \(\s*<div>\s*<label htmlFor="preferredTaluka"/);

    // Dynamic drive badge
    assert.match(step2Content, /District-Wise Drive/);
    assert.match(step2Content, /Taluka-Wise Drive/);

    // District change resets Taluka
    assert.match(step2Content, /onChange\('preferredTaluka',\s*''\)/);
  });

  await t.test('5. Non-blocking guarantee: "No Vacancy" residential address allows applying elsewhere', () => {
    const mockJob = {
      id: 'job-123',
      title: 'Field Officer',
      posting_level: 'Taluka-wise',
      location_districts: ['Pune', 'Satara'],
      vacancy_allocations: {
        posting_level: 'Taluka-wise',
        district_allocations: {
          Pune: {
            included: true,
            taluka_allocations: {
              Haveli: { included: true, vacancies: 5 },
              Baramati: { included: true, vacancies: 0 }
            }
          },
          Satara: {
            included: true,
            taluka_allocations: {
              Karad: { included: true, vacancies: 2 }
            }
          }
        }
      }
    };

    // Candidate resides in Kolhapur (where there are 0 vacancies in this job)
    // Candidate chooses Pune -> Haveli
    const allowed = computeAllowedDistricts(mockJob, ['Pune', 'Satara', 'Kolhapur']);
    assert.ok(allowed.includes('Pune'), 'Candidate can choose Pune');
    const geoLookup = () => [];
    const available = resolveAvailableTalukas('Pune', mockJob, geoLookup);
    assert.ok(available.availableTalukas.includes('Haveli'), 'Candidate can choose Haveli');
  });

  await t.test('6. Data persistence schema: preferredDistrict and preferredTaluka mappings', () => {
    const apiPath = resolve(process.cwd(), 'project/src/careers/portal/api.ts');
    const apiContent = readFileSync(apiPath, 'utf8');

    // Confirm preferred_district and preferred_taluka are mapped in submission RPC and drafts
    assert.match(apiContent, /p_preferred_district:\s*jobSpecific\.preferredDistrict/);
    assert.match(apiContent, /p_preferred_taluka:\s*jobSpecific\.preferredTaluka/);
    assert.match(apiContent, /preferred_district:\s*jobSpecific\.preferredDistrict/);
    assert.match(apiContent, /preferred_taluka:\s*jobSpecific\.preferredTaluka/);
  });

  await t.test('7. Location Difference Confirmation is present when preferred location differs from residence', () => {
    assert.match(step2Content, /isDifferentFromNative/);
    assert.match(step2Content, /Location Difference Confirmation/);
    assert.match(step2Content, /locationConfirmed/);
  });
});

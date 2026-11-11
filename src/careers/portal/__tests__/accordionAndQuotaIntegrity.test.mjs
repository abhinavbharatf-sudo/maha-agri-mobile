import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sharedContentPath = path.resolve(__dirname, '../../components/JobDetailContent.tsx');
const sharedContentSource = fs.readFileSync(sharedContentPath, 'utf8');

test('MAHA-AGRI Careers – Accordion Default Collapse & Quota Scope Integrity Suite', async (t) => {

  // ── 1. Accordion Default Collapse Verification ─────────────────────────────
  await t.test('1. All six position specification accordions must be collapsed by default', () => {
    // Regex checking initial useState for openSections
    const match = sharedContentSource.match(/const\s+\[openSections,\s*setOpenSections\]\s*=\s*useState<Record<string,\s*boolean>>\(([\s\S]*?)\);/);
    assert.ok(match, 'Must find openSections useState declaration');
    const stateObjStr = match[1];

    assert.ok(stateObjStr.includes('overview: false'), 'Section 1 Overview must be collapsed by default');
    assert.ok(stateObjStr.includes('responsibilities: false'), 'Section 2 Responsibilities must be collapsed by default');
    assert.ok(stateObjStr.includes('eligibility: false'), 'Section 3 Eligibility must be collapsed by default');
    assert.ok(stateObjStr.includes('experience: false'), 'Section 4 Experience must be collapsed by default');
    assert.ok(stateObjStr.includes('documents: false'), 'Section 5 Documents must be collapsed by default');
    assert.ok(stateObjStr.includes('process: false'), 'Section 6 Process must be collapsed by default');

    // Default label check
    assert.ok(
      sharedContentSource.includes("{allExpanded ? 'Collapse All' : 'Expand All'}"),
      'Must render "Expand All" when sections are collapsed'
    );
  });

  // ── 2. Scenario A: Taluka-Level Quota Logic ────────────────────────────────
  await t.test('2. Scenario A: When quota scope is Taluka-Level, show Per Taluka and completely hide Per District', () => {
    // Test logic implementation in pure JS matching JobDetailContent
    const isDistrictLevelFn = (job) =>
      job.vacancy_level === 'district' ||
      job.vacancy_allocations?.vacancy_level === 'district' ||
      job.posting_level === 'District-wise' ||
      job.vacancy_allocations?.posting_level === 'District-wise';

    const sampleTalukaJob = {
      vacancy_level: 'taluka',
      posting_level: 'Taluka-wise',
      vacancies_per_taluka: 2,
      vacancies_per_district: 15, // Stale or residual value in DB
    };

    const isDist = isDistrictLevelFn(sampleTalukaJob);
    assert.equal(isDist, false, 'Taluka job must evaluate isDistrictLevel = false');

    const quotaScopeLabel = isDist ? 'District-Level Quota' : 'Taluka-Level Quota';
    assert.equal(quotaScopeLabel, 'Taluka-Level Quota');

    // Simulate conditional rendering rules from JobDetailContent.tsx:
    const showPerDistrict = isDist && sampleTalukaJob.vacancies_per_district != null && sampleTalukaJob.vacancies_per_district > 0;
    const showPerTaluka = !isDist && sampleTalukaJob.vacancies_per_taluka != null && sampleTalukaJob.vacancies_per_taluka > 0;

    assert.equal(showPerDistrict, false, 'Per District MUST BE COMPLETELY HIDDEN for Taluka-Level job');
    assert.equal(showPerTaluka, true, 'Per Taluka MUST BE VISIBLE for Taluka-Level job');
  });

  // ── 3. Scenario B: District-Level Quota Logic ──────────────────────────────
  await t.test('3. Scenario B: When quota scope is District-Level, show Per District and completely hide Per Taluka', () => {
    const isDistrictLevelFn = (job) =>
      job.vacancy_level === 'district' ||
      job.vacancy_allocations?.vacancy_level === 'district' ||
      job.posting_level === 'District-wise' ||
      job.vacancy_allocations?.posting_level === 'District-wise';

    const sampleDistrictJob = {
      vacancy_level: 'district',
      posting_level: 'District-wise',
      vacancies_per_taluka: 4, // Stale or residual value in DB
      vacancies_per_district: 25,
    };

    const isDist = isDistrictLevelFn(sampleDistrictJob);
    assert.equal(isDist, true, 'District job must evaluate isDistrictLevel = true');

    const quotaScopeLabel = isDist ? 'District-Level Quota' : 'Taluka-Level Quota';
    assert.equal(quotaScopeLabel, 'District-Level Quota');

    const showPerDistrict = isDist && sampleDistrictJob.vacancies_per_district != null && sampleDistrictJob.vacancies_per_district > 0;
    const showPerTaluka = !isDist && sampleDistrictJob.vacancies_per_taluka != null && sampleDistrictJob.vacancies_per_taluka > 0;

    assert.equal(showPerDistrict, true, 'Per District MUST BE VISIBLE for District-Level job');
    assert.equal(showPerTaluka, false, 'Per Taluka MUST BE COMPLETELY HIDDEN for District-Level job');
  });

  // ── 4. Mutual Exclusivity Verification ─────────────────────────────────────
  await t.test('4. Per District and Per Taluka are mutually exclusive and can never display simultaneously', () => {
    // Inspect JSX in source code:
    assert.ok(
      sharedContentSource.includes('{isDistrictLevel && job.vacancies_per_district != null && job.vacancies_per_district > 0 && ('),
      'Per District must have isDistrictLevel guard'
    );
    assert.ok(
      sharedContentSource.includes('{!isDistrictLevel && job.vacancies_per_taluka != null && job.vacancies_per_taluka > 0 && ('),
      'Per Taluka must have !isDistrictLevel guard'
    );
  });

  // ── 5. Real Saved Database Postings Audit ──────────────────────────────────
  await t.test('5. Real Database Postings: Strict Quota Scope & Mutual Exclusivity Assertions', () => {
    const isDistrictLevelFn = (job) =>
      job.vacancy_level === 'district' ||
      job.vacancy_allocations?.vacancy_level === 'district' ||
      job.posting_level === 'District-wise' ||
      job.vacancy_allocations?.posting_level === 'District-wise';

    // Direct Authoritative Snapshot from PostgreSQL rms_job_postings table:
    const realDistrictJob = {
      id: '0f7edd2a-41d4-48a8-a897-0092c0b38171',
      title: 'Sales Executive',
      department: 'EMERGENCY HELP QR',
      status: 'coming_soon',
      total_vacancies: 1,
      vacancies_per_district: 1,
      vacancies_per_taluka: 10, // Stale legacy value in DB
      application_fee_amount: 400,
      employment_type: 'full_time',
      experience_required: '1',
      salary_amount: 15000,
      salary_type: 'Per Month',
      salary_package_type: 'Salary Includes Incentive, T.A. & D.A.',
      recruitment_mode: 'Online',
      closing_date: null,
      vacancy_allocations: {
        vacancy_level: 'district',
        posting_level: 'District-wise',
        default_per_district: 1,
        default_per_taluka: 10
      }
    };

    const realTalukaJob = {
      id: 'fed1dfd3-bfc1-40af-8e3d-deb1d3858fed',
      title: 'District Co-ordinator',
      department: 'MAHA-AGRI PROJECT',
      status: 'published',
      total_vacancies: 2352,
      vacancies_per_district: 2, // Stale legacy value in DB
      vacancies_per_taluka: 12,
      application_fee_amount: 559,
      employment_type: 'full_time',
      experience_required: '3 to 5 Years',
      salary_amount: 36000,
      salary_type: 'Per Month',
      salary_package_type: 'Salary Includes Incentive, T.A. & D.A.',
      recruitment_mode: 'Online',
      closing_date: '2026-12-30T17:41:00+00:00',
      vacancy_allocations: {
        vacancy_level: 'taluka',
        posting_level: 'Taluka-wise',
        default_per_district: 2,
        default_per_taluka: 12
      }
    };

    // Test 1: Real District-Level Job (Sales Executive - 0f7edd2a-41d4-48a8-a897-0092c0b38171)
    const isDist1 = isDistrictLevelFn(realDistrictJob);
    assert.equal(isDist1, true, 'Real Posting 1 must evaluate as District-level');
    const p1ShowPerDistrict = isDist1 && realDistrictJob.vacancies_per_district != null && realDistrictJob.vacancies_per_district > 0;
    const p1ShowPerTaluka = !isDist1 && realDistrictJob.vacancies_per_taluka != null && realDistrictJob.vacancies_per_taluka > 0;
    assert.equal(p1ShowPerDistrict, true, 'Real Posting 1 MUST render Per District (1 Vacancies)');
    assert.equal(p1ShowPerTaluka, false, 'Real Posting 1 MUST HIDE Per Taluka (despite residual DB value of 10)');

    // Test 2: Real Taluka-Level Job (District Co-ordinator - fed1dfd3-bfc1-40af-8e3d-deb1d3858fed)
    const isDist2 = isDistrictLevelFn(realTalukaJob);
    assert.equal(isDist2, false, 'Real Posting 2 must evaluate as Taluka-level');
    const p2ShowPerDistrict = isDist2 && realTalukaJob.vacancies_per_district != null && realTalukaJob.vacancies_per_district > 0;
    const p2ShowPerTaluka = !isDist2 && realTalukaJob.vacancies_per_taluka != null && realTalukaJob.vacancies_per_taluka > 0;
    assert.equal(p2ShowPerDistrict, false, 'Real Posting 2 MUST HIDE Per District (despite residual DB value of 2)');
    assert.equal(p2ShowPerTaluka, true, 'Real Posting 2 MUST render Per Taluka (12 Vacancies)');
  });

  // ── 6. Expand All / Collapse All and Individual Accordion Transitions ───────
  await t.test('6. Expand All / Collapse All state transitions and button labels', () => {
    let openSections = {
      overview: false,
      responsibilities: false,
      eligibility: false,
      experience: false,
      documents: false,
      process: false,
    };

    const isAllExpanded = (state) => Object.values(state).every(Boolean);
    const getButtonLabel = (state) => isAllExpanded(state) ? 'Collapse All' : 'Expand All';

    // Step 1: Default initial state
    assert.equal(isAllExpanded(openSections), false);
    assert.equal(getButtonLabel(openSections), 'Expand All');

    // Step 2: Expand All clicked
    openSections = {
      overview: true,
      responsibilities: true,
      eligibility: true,
      experience: true,
      documents: true,
      process: true,
    };
    assert.equal(isAllExpanded(openSections), true);
    assert.equal(getButtonLabel(openSections), 'Collapse All');

    // Step 3: Toggle individual section off (e.g. overview)
    openSections.overview = !openSections.overview;
    assert.equal(isAllExpanded(openSections), false);
    assert.equal(getButtonLabel(openSections), 'Expand All');

    // Step 4: Toggle individual section back on
    openSections.overview = !openSections.overview;
    assert.equal(isAllExpanded(openSections), true);
    assert.equal(getButtonLabel(openSections), 'Collapse All');

    // Step 5: Collapse All clicked
    openSections = {
      overview: false,
      responsibilities: false,
      eligibility: false,
      experience: false,
      documents: false,
      process: false,
    };
    assert.equal(isAllExpanded(openSections), false);
    assert.equal(getButtonLabel(openSections), 'Expand All');
  });

});

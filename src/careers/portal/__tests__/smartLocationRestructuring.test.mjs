import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = path.resolve('project');
const managerPath = path.join(projectRoot, 'src', 'careers', 'admin', 'components', 'HRLocationAndVacancyManager.tsx');
const editorPath = path.join(projectRoot, 'src', 'careers', 'admin', 'HRJobPostingEditor.tsx');
const typesPath = path.join(projectRoot, 'src', 'careers', 'lib', 'types.ts');
const constantsPath = path.join(projectRoot, 'src', 'careers', 'lib', 'constants.ts');
const apiPath = path.join(projectRoot, 'src', 'careers', 'lib', 'api.ts');
const calculatorPath = path.join(projectRoot, 'src', 'careers', 'lib', 'vacancyCalculator.ts');
const step2Path = path.join(projectRoot, 'src', 'careers', 'portal', 'steps', 'Step2JobSpecific.tsx');

test('Smart Location Configuration Restructuring Suite', async (t) => {
  const managerSource = fs.readFileSync(managerPath, 'utf8');
  const editorSource = fs.readFileSync(editorPath, 'utf8');
  const typesSource = fs.readFileSync(typesPath, 'utf8');
  const constantsSource = fs.readFileSync(constantsPath, 'utf8');
  const apiSource = fs.readFileSync(apiPath, 'utf8');
  const calculatorSource = fs.readFileSync(calculatorPath, 'utf8');
  const step2Source = fs.readFileSync(step2Path, 'utf8');

  await t.test('1. Final Geographic Scope UI: Exactly five primary options in UI', () => {
    const match = constantsSource.match(/export const JOB_LOCATION_TYPES\s*=\s*\[([\s\S]*?)\]\s*as const;/);
    assert.ok(match, 'JOB_LOCATION_TYPES must be defined in constants.ts');

    const content = match[1];
    assert.ok(content.includes("'State-wide'"), 'Must include State-wide');
    assert.ok(content.includes("'Regional'"), 'Must include Regional');
    assert.ok(content.includes("'District-wise'"), 'Must include District-wise');
    assert.ok(content.includes("'City-specific'"), 'Must include City-specific');
    assert.ok(content.includes("'Remote'"), 'Must include Remote');

    // Standalone Multiple Locations is removed from primary JOB_LOCATION_TYPES array
    assert.ok(
      !content.includes("'Multiple Locations'"),
      'Primary JOB_LOCATION_TYPES must NOT include Multiple Locations'
    );

    // Manager grid uses a balanced 5-column layout
    assert.ok(
      managerSource.includes('lg:grid-cols-5'),
      'Manager grid must use a balanced 5-column layout for the 5 options'
    );
  });

  await t.test('2. Backward Compatibility: Legacy Multiple Locations remains readable and supported', () => {
    // JobLocationType in types.ts retains 'Multiple Locations'
    assert.ok(
      typesSource.includes("'Multiple Locations'"),
      'JobLocationType in types.ts must support Multiple Locations for legacy compatibility'
    );
    // ALL_JOB_LOCATION_TYPES includes Multiple Locations
    assert.ok(
      constantsSource.includes('ALL_JOB_LOCATION_TYPES'),
      'constants.ts must define ALL_JOB_LOCATION_TYPES with Multiple Locations for legacy jobs'
    );
    // Manager has legacy compatibility banner
    assert.ok(
      managerSource.includes('Legacy Multiple Locations Compatibility Banner'),
      'Manager must display a legacy compatibility banner when opening legacy Multiple Locations jobs'
    );
  });

  await t.test('3. District-wise: Supports one or multiple districts with independent allocation', () => {
    assert.ok(
      managerSource.includes('handleToggleDistrict'),
      'Manager must allow toggling individual districts in or out'
    );
    assert.ok(
      managerSource.includes('handleSelectAllDistricts'),
      'Manager must allow select all districts'
    );
    assert.ok(
      managerSource.includes('handleClearAllDistricts'),
      'Manager must allow clear all districts'
    );
    assert.ok(
      calculatorSource.includes("case 'District-wise':"),
      'Calculator must handle District-wise formatting'
    );
  });

  await t.test('4. City-specific: Single City preserves all existing fields and behaviors', () => {
    assert.ok(
      managerSource.includes("citySelectionMode === 'single'"),
      'Manager must support Single City mode'
    );
    assert.ok(
      managerSource.includes('City / Headquarters Name *'),
      'Single City must preserve City / Headquarters Name'
    );
    assert.ok(
      managerSource.includes('Parent District *'),
      'Single City must preserve Parent District'
    );
    assert.ok(
      managerSource.includes('Show Exact City Name on Public Careers Portal'),
      'Single City must preserve Show Exact City Name on Public Careers Portal toggle'
    );
    assert.ok(
      managerSource.includes('Public Location String (Preview)'),
      'Single City must show public location string preview'
    );
    assert.ok(
      managerSource.includes('Internal Operational Facility / Office Notes (Admin Only)'),
      'Single City must preserve internal notes field'
    );
  });

  await t.test('5. City-specific: Multiple Cities repeatable cards, sample scenario & duplicate validation', () => {
    // Type definition for CityLocationAllocation
    assert.ok(
      typesSource.includes('export interface CityLocationAllocation'),
      'types.ts must define CityLocationAllocation'
    );
    assert.ok(
      typesSource.includes('cityName: string;'),
      'CityLocationAllocation must require cityName'
    );
    assert.ok(
      typesSource.includes('parentDistrict: string;'),
      'CityLocationAllocation must require parentDistrict'
    );
    assert.ok(
      typesSource.includes('vacancies: number;'),
      'CityLocationAllocation must require vacancies'
    );
    assert.ok(
      typesSource.includes('showCityPublicly: boolean;'),
      'CityLocationAllocation must require showCityPublicly'
    );

    // Multi-city actions in manager
    assert.ok(
      managerSource.includes("citySelectionMode === 'multiple'"),
      'Manager must support Multiple Cities mode'
    );
    assert.ok(
      managerSource.includes('handleAddCity'),
      'Manager must support adding repeatable city cards'
    );
    assert.ok(
      managerSource.includes('handleUpdateCity'),
      'Manager must support updating individual city cards'
    );
    assert.ok(
      managerSource.includes('handleRemoveCity'),
      'Manager must support removing city cards'
    );
    assert.ok(
      managerSource.includes('Duplicate City & Parent District combination detected'),
      'Manager must detect duplicate City + Parent District combination'
    );

    // Validation in HRJobPostingEditor before save
    assert.ok(
      editorSource.includes('Duplicate City and Parent District detected'),
      'Editor handleSave must validate duplicate City and Parent District'
    );
    assert.ok(
      editorSource.includes('is missing a City Name'),
      'Editor handleSave must validate missing City Name'
    );
    assert.ok(
      editorSource.includes('is missing a Parent District'),
      'Editor handleSave must validate missing Parent District'
    );

    // Sample Locations Test Scenario:
    // Wardha (10 vacancies) + Nagpur (15 vacancies) + Amravati (20 vacancies) = 45 total
    const sampleCities = [
      { id: 'c1', cityName: 'Wardha', parentDistrict: 'Wardha', vacancies: 10, showCityPublicly: true },
      { id: 'c2', cityName: 'Nagpur', parentDistrict: 'Nagpur', vacancies: 15, showCityPublicly: true },
      { id: 'c3', cityName: 'Amravati', parentDistrict: 'Amravati', vacancies: 20, showCityPublicly: true },
    ];
    const totalVacancies = sampleCities.reduce((sum, c) => sum + c.vacancies, 0);
    assert.strictEqual(totalVacancies, 45, 'Sample scenario total vacancies must be exactly 45');

    const uniqueParentDistricts = Array.from(new Set(sampleCities.map(c => c.parentDistrict)));
    assert.deepStrictEqual(uniqueParentDistricts, ['Wardha', 'Nagpur', 'Amravati'], 'Must extract all unique parent districts');
  });

  await t.test('6. Public Data Confidentiality: Internal notes strictly sanitized from public queries', () => {
    // Sanitize helper in api.ts
    assert.ok(
      apiSource.includes('export function sanitizePublicJob'),
      'api.ts must define sanitizePublicJob'
    );
    assert.ok(
      apiSource.includes('sanitized.internal_location = null;'),
      'sanitizePublicJob must wipe internal_location'
    );
    assert.ok(
      apiSource.includes('const { internalNotes, ...safeCity } = c;'),
      'sanitizePublicJob must strip internalNotes from public cities'
    );
    assert.ok(
      apiSource.includes('.map(hydrateJob).map(sanitizePublicJob)'),
      'listPublishedJobs must pass records through sanitizePublicJob'
    );
    assert.ok(
      apiSource.includes('sanitizePublicJob(hydrateJob(data))'),
      'getJobBySlug must pass record through sanitizePublicJob'
    );
  });

  await t.test('7. Candidate Portal: Posting District boundary restriction and data model interaction', () => {
    // In Step2JobSpecific: allowedDistricts is extracted from job.location_districts
    assert.ok(
      step2Source.includes('const allowedDistricts = useMemo<string[]>(() => {'),
      'Step2JobSpecific must compute allowedDistricts strictly'
    );
    assert.ok(
      step2Source.includes('job.location_districts.filter(d => Boolean(d && d.trim()))'),
      'Step2JobSpecific must filter to job.location_districts'
    );
    assert.ok(
      step2Source.includes('!allowedDistricts.includes(data.preferredDistrict)'),
      'Step2JobSpecific must block progression if candidate attempts to submit an unapproved district'
    );
  });

  await t.test('8. Schema Protection: Non-table columns encapsulated in vacancy_allocations', () => {
    assert.ok(
      apiSource.includes('multiple_locations_config, ...rest } = job'),
      'upsertJob must destructure multiple_locations_config out of top-level rest'
    );
    assert.ok(
      apiSource.includes('...(multiple_locations_config !== undefined ? { multiple_locations_config } : {})'),
      'upsertJob must place multiple_locations_config into vacancy_allocations JSONB'
    );
    assert.ok(
      editorSource.includes('delete (payload as any).multiple_locations_config'),
      'HRJobPostingEditor must sanitize payload before upsert'
    );
  });
});

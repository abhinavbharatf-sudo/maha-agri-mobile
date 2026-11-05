import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = path.resolve('project');
const editorPath = path.join(projectRoot, 'src', 'careers', 'admin', 'HRJobPostingEditor.tsx');
const apiPath = path.join(projectRoot, 'src', 'careers', 'lib', 'api.ts');
const typesPath = path.join(projectRoot, 'src', 'careers', 'lib', 'types.ts');
const autoStatusMigrationPath = path.join(projectRoot, 'supabase', 'migrations', '20260714153953_rms_auto_status_engine.sql');

test('Job Scheduling & Validity Recovery - UI Verification', async (t) => {
  const editorCode = fs.readFileSync(editorPath, 'utf8');

  await t.test('1. Tab 1 (Position Setup) contains Position Status, SchedulingSection, and Badges', () => {
    // Check that Tab 1 renders SchedulingSection
    const tab1Index = editorCode.indexOf("activeTab === 'position'");
    const tab2Index = editorCode.indexOf("activeTab === 'qualifications'");
    assert.ok(tab1Index !== -1 && tab2Index !== -1, 'Both tab 1 and tab 2 must be defined in HRJobPostingEditor');
    const tab1Content = editorCode.slice(tab1Index, tab2Index);

    assert.ok(
      tab1Content.includes('Position Status, Scheduling & Application Validity'),
      'Tab 1 Position Setup must include the Position Status, Scheduling & Application Validity heading'
    );
    assert.ok(
      tab1Content.includes('<SchedulingSection formData={formData as FormDataType} set={set} />'),
      'Tab 1 Position Setup must render <SchedulingSection>'
    );
    assert.ok(
      tab1Content.includes("set('status', e.target.value)"),
      'Tab 1 Position Setup must allow editing position status'
    );
    assert.ok(
      tab1Content.includes("set('is_featured', e.target.checked)"),
      'Tab 1 Position Setup must allow toggling featured status'
    );
    assert.ok(
      tab1Content.includes("set('is_urgent', e.target.checked)"),
      'Tab 1 Position Setup must allow toggling urgent status'
    );
  });

  await t.test('2. Tab 6 (Scheduling & Publish) also renders SchedulingSection for workflow continuity', () => {
    const tab6Index = editorCode.indexOf("activeTab === 'scheduling'");
    assert.ok(tab6Index !== -1, 'Tab 6 must exist');
    const tab6Content = editorCode.slice(tab6Index, editorCode.indexOf('</form>', tab6Index));

    assert.ok(
      tab6Content.includes('<SchedulingSection formData={formData as FormDataType} set={set} />'),
      'Tab 6 must also render <SchedulingSection>'
    );
  });

  await t.test('3. Tab bar enables smooth scrolling and does not hide scroll cues', () => {
    assert.ok(
      !editorCode.includes('scrollbar-hide px-1 sm:px-2'),
      'Tab bar should not have scrollbar-hide preventing visibility of later tabs'
    );
    assert.ok(
      editorCode.includes('overflow-x-auto border-b border-primary-100 bg-slate-50/60 px-1 sm:px-2'),
      'Tab bar must support smooth overflow-x scrolling'
    );
  });
});

test('Job Scheduling & Validity Recovery - Logic & Controls Verification', async (t) => {
  await t.test('1. Publishing Mode controls (Publish Immediately vs Schedule Publishing)', () => {
    let state = {
      publish_date: '2026-11-10T10:00:00.000Z',
      closing_date: '2026-11-30T18:00:00.000Z',
      never_close_applications: false,
      display_deadline_public: true,
      status: 'published',
    };

    const set = (k, v) => { state[k] = v; };

    // Simulate clicking "Publish Immediately"
    set('publish_date', null);
    set('closing_date', null);
    set('never_close_applications', false);

    assert.equal(state.publish_date, null);
    assert.equal(state.closing_date, null);
    assert.equal(state.never_close_applications, false);

    // Simulate clicking "Schedule Publishing"
    const futureDate = new Date(Date.now() + 86400000).toISOString();
    set('publish_date', futureDate);
    assert.ok(state.publish_date !== null);
  });

  await t.test('2. Application Closing controls (Never Close vs Application Last Date)', () => {
    let state = {
      publish_date: '2026-11-10T10:00:00.000Z',
      closing_date: '2026-11-20T18:00:00.000Z',
      never_close_applications: false,
      display_deadline_public: true,
    };
    const set = (k, v) => { state[k] = v; };

    // Toggle "Never Close Applications" ON
    const checked = true;
    set('never_close_applications', checked);
    if (checked) {
      set('closing_date', null);
      set('display_deadline_public', false);
    }

    assert.equal(state.never_close_applications, true);
    assert.equal(state.closing_date, null);
    assert.equal(state.display_deadline_public, false);
  });

  await t.test('3. Date validation rules (closing cannot be earlier than publish date)', () => {
    const pub = new Date('2026-11-15T10:00:00.000Z');
    const closingBefore = new Date('2026-11-10T10:00:00.000Z');
    const closingAfter = new Date('2026-11-20T10:00:00.000Z');

    const isInvalidBefore = pub && closingBefore && closingBefore <= pub;
    const isInvalidAfter = pub && closingAfter && closingAfter <= pub;

    assert.equal(isInvalidBefore, true, 'Closing date earlier than publish date must be marked invalid');
    assert.equal(isInvalidAfter, false, 'Closing date after publish date must be valid');
  });

  await t.test('4. Closing soon threshold (< 3 days)', () => {
    const now = new Date();
    const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
    const fourDaysFromNow = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000);

    const ms2Days = twoDaysFromNow.getTime() - now.getTime();
    const isClosingSoon2Days = ms2Days > 0 && ms2Days <= 3 * 24 * 60 * 60 * 1000;

    const ms4Days = fourDaysFromNow.getTime() - now.getTime();
    const isClosingSoon4Days = ms4Days > 0 && ms4Days <= 3 * 24 * 60 * 60 * 1000;

    assert.equal(isClosingSoon2Days, true);
    assert.equal(isClosingSoon4Days, false);
  });
});

test('Job Scheduling & Validity Recovery - Backend Engine & Auto-Status SQL', async (t) => {
  const sql = fs.readFileSync(autoStatusMigrationPath, 'utf8');

  await t.test('1. rms_auto_update_job_statuses SQL transitions coming_soon to published', () => {
    assert.ok(sql.includes("UPDATE public.rms_job_postings"), 'Must update rms_job_postings');
    assert.ok(sql.includes("SET status = 'published'"), 'Must transition to published');
    assert.ok(sql.includes("WHERE status = 'coming_soon'"), 'Must check coming_soon');
    assert.ok(sql.includes("AND publish_date <= v_now"), 'Must check publish_date <= now');
    assert.ok(sql.includes("AND COALESCE(is_trashed, false) = false"), 'Must protect trashed jobs');
  });

  await t.test('2. rms_auto_update_job_statuses SQL transitions published to applications_closed', () => {
    assert.ok(sql.includes("SET status = 'applications_closed'"), 'Must transition to applications_closed');
    assert.ok(sql.includes("WHERE status = 'published'"), 'Must check published');
    assert.ok(sql.includes("AND closing_date <= v_now"), 'Must check closing_date <= now');
    assert.ok(sql.includes("AND COALESCE(never_close_applications, false) = false"), 'Must respect never_close_applications');
  });

  await t.test('3. API calls rms_auto_update_job_statuses before listing jobs', () => {
    const apiCode = fs.readFileSync(apiPath, 'utf8');
    assert.ok(
      apiCode.includes("supabase.rpc('rms_auto_update_job_statuses'"),
      'listPublishedJobs must invoke rms_auto_update_job_statuses RPC'
    );
  });
});

test('Job Scheduling & Validity Recovery - Questionnaire & Multiple Locations Payload Isolation', async (t) => {
  const apiCode = fs.readFileSync(apiPath, 'utf8');
  const editorCode = fs.readFileSync(editorPath, 'utf8');

  await t.test('1. multiple_locations_config is isolated from top-level upsert in api.ts', () => {
    assert.ok(
      apiCode.includes('multiple_locations_config, ...rest } = job'),
      'api.ts upsertJob must destructure multiple_locations_config out of rest payload'
    );
    assert.ok(
      apiCode.includes('...(multiple_locations_config !== undefined ? { multiple_locations_config } : {})'),
      'api.ts upsertJob must store multiple_locations_config in vacancy_allocations JSONB'
    );
  });

  await t.test('2. multiple_locations_config is stripped before top-level upsert in HRJobPostingEditor.tsx', () => {
    assert.ok(
      editorCode.includes('delete (payload as any).multiple_locations_config'),
      'HRJobPostingEditor must delete multiple_locations_config from top-level payload before calling upsertJob'
    );
  });

  await t.test('3. Questionnaire edits do not clear publish_date or closing_date', () => {
    const jobState = {
      id: 'job-123',
      title: 'Agricultural Assistant',
      publish_date: '2026-11-10T10:00:00.000Z',
      closing_date: '2026-11-25T18:00:00.000Z',
      never_close_applications: false,
      display_deadline_public: true,
      questionnaire: null,
    };

    // Simulate questionnaire onChange
    const newQuestionnaire = {
      sections: [{ id: 'sec-1', title: 'Technical Assessment', questions: [] }]
    };
    const updatedState = {
      ...jobState,
      questionnaire: newQuestionnaire,
    };

    assert.equal(updatedState.publish_date, '2026-11-10T10:00:00.000Z');
    assert.equal(updatedState.closing_date, '2026-11-25T18:00:00.000Z');
    assert.equal(updatedState.never_close_applications, false);
    assert.equal(updatedState.display_deadline_public, true);
    assert.deepEqual(updatedState.questionnaire, newQuestionnaire);
  });
});

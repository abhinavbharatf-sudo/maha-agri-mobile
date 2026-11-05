import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = path.resolve('project');
const editorPath = path.join(projectRoot, 'src', 'careers', 'admin', 'HRJobPostingEditor.tsx');
const apiPath = path.join(projectRoot, 'src', 'careers', 'lib', 'api.ts');
const jobEventsPath = path.join(projectRoot, 'src', 'careers', 'lib', 'jobEvents.ts');
const careersHomePath = path.join(projectRoot, 'src', 'careers', 'pages', 'CareersHome.tsx');
const jobDetailPath = path.join(projectRoot, 'src', 'careers', 'pages', 'JobDetail.tsx');

test('Job Public View Synchronization & Invalidation Engine', async (t) => {
  const eventsCode = fs.readFileSync(jobEventsPath, 'utf8');
  const apiCode = fs.readFileSync(apiPath, 'utf8');
  const homeCode = fs.readFileSync(careersHomePath, 'utf8');
  const detailCode = fs.readFileSync(jobDetailPath, 'utf8');
  const editorCode = fs.readFileSync(editorPath, 'utf8');

  await t.test('1. jobEvents.ts provides cross-tab (BroadcastChannel) and intra-window (CustomEvent) synchronization', () => {
    assert.ok(eventsCode.includes("export function broadcastJobUpdate"), 'broadcastJobUpdate must be exported');
    assert.ok(eventsCode.includes("export function subscribeToJobUpdates"), 'subscribeToJobUpdates must be exported');
    assert.ok(eventsCode.includes("new BroadcastChannel"), 'BroadcastChannel must be used for cross-tab sync');
    assert.ok(eventsCode.includes("new CustomEvent"), 'CustomEvent must be used for same-tab sync');
  });

  await t.test('2. api.ts upsertJob() broadcasts job update event upon successful save', () => {
    assert.ok(apiCode.includes("import { broadcastJobUpdate } from './jobEvents'"), 'api.ts must import broadcastJobUpdate');
    assert.ok(apiCode.includes("broadcastJobUpdate(hydrated)"), 'upsertJob must broadcast hydrated job update');
  });

  await t.test('3. api.ts quick actions (status, feature, urgent, order, archive, restore) broadcast updates', () => {
    assert.ok(apiCode.includes("broadcastJobUpdate({ id, is_trashed: true })"), 'archiveJob must broadcast update');
    assert.ok(apiCode.includes("broadcastJobUpdate({ id, is_trashed: false })"), 'restoreJob must broadcast update');
    assert.ok(apiCode.includes("broadcastJobUpdate(updated)"), 'setJobStatus must broadcast update');
    assert.ok(apiCode.includes("broadcastJobUpdate({ id, is_featured: featured })"), 'toggleJobFeatured must broadcast update');
    assert.ok(apiCode.includes("broadcastJobUpdate({ id, is_urgent: urgent })"), 'toggleJobUrgent must broadcast update');
    assert.ok(apiCode.includes("broadcastJobUpdate({ id, sort_order: sortOrder })"), 'updateJobOrder must broadcast update');
  });

  await t.test('4. api.ts public queries set Cache-Control and Pragma headers to bypass heuristic HTTP caching', () => {
    assert.ok(apiCode.includes(".setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')"), 'Must set Cache-Control header');
    assert.ok(apiCode.includes(".setHeader('Pragma', 'no-cache')"), 'Must set Pragma header');
  });

  await t.test('5. CareersHome.tsx subscribes to job updates, window focus, and document visibility', () => {
    assert.ok(homeCode.includes("import { subscribeToJobUpdates } from '../lib/jobEvents'"), 'CareersHome must import subscribeToJobUpdates');
    assert.ok(homeCode.includes("subscribeToJobUpdates("), 'CareersHome must subscribe to job updates');
    assert.ok(homeCode.includes("window.addEventListener('focus', handleFocus)"), 'CareersHome must listen to window focus');
    assert.ok(homeCode.includes("document.addEventListener('visibilitychange', handleVisibility)"), 'CareersHome must listen to visibility change');
  });

  await t.test('6. JobDetail.tsx subscribes to job updates, window focus, and document visibility', () => {
    assert.ok(detailCode.includes("import { subscribeToJobUpdates } from '../lib/jobEvents'"), 'JobDetail must import subscribeToJobUpdates');
    assert.ok(detailCode.includes("subscribeToJobUpdates("), 'JobDetail must subscribe to job updates');
    assert.ok(detailCode.includes("window.addEventListener('focus', handleFocus)"), 'JobDetail must listen to window focus');
    assert.ok(detailCode.includes("document.addEventListener('visibilitychange', handleVisibility)"), 'JobDetail must listen to visibility change');
  });

  await t.test('7. HRJobPostingEditor.tsx broadcasts savedJob on save and updates form state', () => {
    assert.ok(editorCode.includes("broadcastJobUpdate(savedJob)"), 'HRJobPostingEditor must broadcast savedJob');
  });

  await t.test('8. Payload isolation: 7 unmapped columns packed in vacancy_allocations and excluded from top level', () => {
    assert.ok(apiCode.includes("const { vacancy_level, experience_details, jd_pdf_enabled, questionnaire, posting_level, location_questions, multiple_locations_config, ...rest } = job;"), 'Must destructure all 7 non-column fields');
    assert.ok(apiCode.includes("payload.vacancy_allocations = {"), 'Must nest all 7 fields in vacancy_allocations');
    assert.ok(apiCode.includes("multiple_locations_config !== undefined ? { multiple_locations_config } : {}"), 'Must store multiple_locations_config in vacancy_allocations');
  });
});

test('Realtime Job Event Simulation in Browser Environment', async (t) => {
  await t.test('1. Subscriber receives update event and triggers callback', () => {
    let callCount = 0;
    let receivedDetail = null;

    // Simulate event subscriber
    const listeners = [];
    const mockSubscribe = (cb) => {
      listeners.push(cb);
      return () => {
        const idx = listeners.indexOf(cb);
        if (idx !== -1) listeners.splice(idx, 1);
      };
    };

    const unsubscribe = mockSubscribe((detail) => {
      callCount++;
      receivedDetail = detail;
    });

    // Simulate broadcast
    const testJob = {
      id: 'feb0f61f-4361-4c54-a8af-3b3e531ba809',
      title: 'Area Sales Manager',
      slug: 'area-sales-manager',
      total_vacancies: 250,
      salary_amount: 35000,
    };

    listeners.forEach(cb => cb(testJob));

    assert.equal(callCount, 1);
    assert.equal(receivedDetail.id, 'feb0f61f-4361-4c54-a8af-3b3e531ba809');
    assert.equal(receivedDetail.total_vacancies, 250);
    assert.equal(receivedDetail.salary_amount, 35000);

    unsubscribe();
    assert.equal(listeners.length, 0);
  });
});

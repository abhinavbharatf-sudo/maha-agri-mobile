import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

function resolveFilePath(relPath) {
  const directPath = path.resolve(relPath);
  if (fs.existsSync(directPath)) return directPath;
  const projectPath = path.resolve('project', relPath);
  if (fs.existsSync(projectPath)) return projectPath;
  const parentProjectPath = path.resolve('..', relPath);
  if (fs.existsSync(parentProjectPath)) return parentProjectPath;
  return directPath;
}

const myProfileSource = fs.readFileSync(resolveFilePath('src/careers/dashboard/MyProfile.tsx'), 'utf8');
const step1Source = fs.readFileSync(resolveFilePath('src/careers/portal/steps/Step1CreateProfile.tsx'), 'utf8');
const step2Source = fs.readFileSync(resolveFilePath('src/careers/portal/steps/Step2MasterProfile.tsx'), 'utf8');
const typesSource = fs.readFileSync(resolveFilePath('src/careers/portal/types.ts'), 'utf8');
const wizardSource = fs.readFileSync(resolveFilePath('src/careers/portal/CandidateApplyWizard.tsx'), 'utf8');

test('Audit Fix 1: Heading is Candidate Master Profile & sidebar preserves My Profile', () => {
  assert.ok(
    myProfileSource.includes('Candidate Master Profile'),
    'MyProfile.tsx must display "Candidate Master Profile"'
  );
  assert.ok(
    !myProfileSource.includes('Master Candidate Profile</h2>'),
    'Old heading "Master Candidate Profile" must be removed from MyProfile.tsx'
  );
  assert.ok(
    myProfileSource.includes('Candidate Master Profile Successfully Updated!'),
    'Success toast/banner must mention Candidate Master Profile'
  );
});

test('Audit Fix 2: Step names standardized across types, MyProfile, Step1 and Step2', () => {
  // Types PORTAL_STEPS
  assert.ok(
    typesSource.includes("label: 'Personal Details & Contact'"),
    'PORTAL_STEPS[0] must be labeled "Personal Details & Contact"'
  );
  assert.ok(
    typesSource.includes("label: 'Identity & Address Details'"),
    'PORTAL_STEPS[1] must be labeled "Identity & Address Details"'
  );

  // MyProfile tabs
  assert.ok(
    myProfileSource.includes('Step 1: Personal Details & Contact') || myProfileSource.includes('Personal Details &amp; Contact'),
    'MyProfile Tab 1 must use "Step 1: Personal Details & Contact"'
  );
  assert.ok(
    myProfileSource.includes('Step 2: Identity & Address Details') || myProfileSource.includes('Identity &amp; Address Details'),
    'MyProfile Tab 2 must use "Step 2: Identity & Address Details"'
  );

  // Step 1 header and submit action
  assert.ok(
    step1Source.includes('Step 1: Personal Details & Contact') || step1Source.includes('Personal Details &amp; Contact'),
    'Step1CreateProfile header must be "Step 1: Personal Details & Contact"'
  );
  assert.ok(
    step1Source.includes('Save &amp; Continue &rarr;') || step1Source.includes('Save & Continue →') || step1Source.includes('SAVE & CONTINUE TO IDENTITY & ADDRESS DETAILS') || step1Source.includes('SAVE &amp; CONTINUE TO IDENTITY &amp; ADDRESS DETAILS'),
    'Step1 submit button must direct to "Save & Continue →"'
  );

  // Step 2 header and back button
  assert.ok(
    step2Source.includes('Step 2: Identity & Address Details') || step2Source.includes('Identity &amp; Address Details'),
    'Step2MasterProfile header must be "Step 2: Identity & Address Details"'
  );
  assert.ok(
    step2Source.includes('Back to Personal Details'),
    'Step2 back button must read "Back to Personal Details"'
  );
});

test('Audit Fix 3: Step 1 accessibility markup (IDs, htmlFor, error IDs, aria-describedby)', () => {
  const requiredA11yFields = [
    { id: 'field-fullName', labelFor: 'htmlFor="field-fullName"', desc: 'fullName' },
    { id: 'field-dateOfBirth', labelFor: 'htmlFor="field-dateOfBirth"', desc: 'dateOfBirth' },
    { id: 'field-gender', labelFor: 'htmlFor="field-gender"', desc: 'gender' },
    { id: 'field-verifiedMobile', labelFor: 'htmlFor="field-verifiedMobile"', desc: 'verifiedMobile' },
    { id: 'field-alternateMobile', labelFor: 'htmlFor="field-alternateMobile"', desc: 'alternateMobile' },
    { id: 'field-email', labelFor: 'htmlFor="field-email"', desc: 'email' },
    { id: 'field-consent', labelFor: 'htmlFor="field-consent"', desc: 'consent' },
  ];

  for (const field of requiredA11yFields) {
    assert.ok(
      step1Source.includes(`id="${field.id}"`),
      `Step 1 input must have id="${field.id}"`
    );
    assert.ok(
      step1Source.includes(field.labelFor),
      `Step 1 label must have ${field.labelFor}`
    );
  }

  // Check aria-describedby references
  assert.ok(step1Source.includes('aria-describedby='), 'Step 1 inputs must include aria-describedby attributes');
  assert.ok(step1Source.includes('id="fullName-error"') || step1Source.includes('id="fullName-hint"'), 'fullName must have error/hint IDs');
  assert.ok(step1Source.includes('id="dateOfBirth-error"') || step1Source.includes('id="dateOfBirth-hint"'), 'dateOfBirth must have error/hint IDs');
  assert.ok(step1Source.includes('id="gender-error"') || step1Source.includes('id="gender-hint"'), 'gender must have error/hint IDs');
});

test('Audit Fix 4: Standalone profile action labels and cancelButtonLabel prop', () => {
  // Step 1 supports cancelButtonLabel
  assert.ok(
    step1Source.includes('cancelButtonLabel?: string'),
    'Step1CreateProfileProps must support cancelButtonLabel'
  );
  assert.ok(
    step1Source.includes('{cancelButtonLabel || \'Cancel Application\'}'),
    'Step1 cancel button must use {cancelButtonLabel || \'Cancel Application\'}'
  );

  // Step 2 supports cancelButtonLabel
  assert.ok(
    step2Source.includes('cancelButtonLabel?: string'),
    'Step1MasterProfileProps must support cancelButtonLabel'
  );
  assert.ok(
    step2Source.includes('{cancelButtonLabel || \'Cancel Application\'}'),
    'Step2 cancel button must use {cancelButtonLabel || \'Cancel Application\'}'
  );

  // MyProfile passes Return to Dashboard
  assert.ok(
    myProfileSource.includes('cancelButtonLabel="Return to Dashboard"'),
    'MyProfile must pass cancelButtonLabel="Return to Dashboard" to step components'
  );

  // CandidateApplyWizard passes Cancel Application
  assert.ok(
    wizardSource.includes('cancelButtonLabel="Cancel Application"'),
    'CandidateApplyWizard must pass cancelButtonLabel="Cancel Application"'
  );
});

test('Audit Fix 5: Typography and responsive grid harmonization', () => {
  assert.ok(
    step1Source.includes('grid grid-cols-1 sm:grid-cols-2 gap-4'),
    'Step1 must use sm:grid-cols-2'
  );
  assert.ok(
    step2Source.includes('grid grid-cols-1 sm:grid-cols-2 gap-4'),
    'Step2 must use sm:grid-cols-2'
  );
  assert.ok(
    step2Source.includes('sm:col-span-2'),
    'Step2 full-width cards must use sm:col-span-2 instead of md:col-span-2'
  );
});

test('Audit Fix 6: DOB max date calculation uses getLocalTodayIso utility', () => {
  assert.ok(
    step1Source.includes('getLocalTodayIso()'),
    'Step1 must use getLocalTodayIso() for max DOB'
  );
  assert.ok(
    step2Source.includes('getLocalTodayIso()'),
    'Step2 must use getLocalTodayIso() for max DOB'
  );
  assert.ok(
    !step2Source.includes("new Date().toISOString().split('T')[0]"),
    'Step2 must not use raw UTC toISOString for max DOB'
  );
});

test('Audit Fix 7: Visible focus indicators (focus-visible rings)', () => {
  assert.ok(
    myProfileSource.includes('focus-visible:ring-2 focus-visible:ring-primary-600'),
    'MyProfile step tabs must include visible focus-visible ring classes'
  );
  assert.ok(
    step2Source.includes('focus-visible:ring-2 focus-visible:ring-primary-600'),
    'Step2 Aadhaar eye toggle must include visible focus-visible ring classes'
  );
});

test('Audit Fix 8: Motion-reduce support for button scaling and scrolling', () => {
  assert.ok(
    step1Source.includes('motion-reduce:transform-none motion-reduce:transition-none'),
    'Step1 submit button must support motion-reduce'
  );
  assert.ok(
    step2Source.includes('motion-reduce:transform-none motion-reduce:transition-none'),
    'Step2 submit button must support motion-reduce'
  );
  assert.ok(
    myProfileSource.includes('prefers-reduced-motion'),
    'MyProfile must respect prefers-reduced-motion when scrolling'
  );
  assert.ok(
    step1Source.includes('prefers-reduced-motion'),
    'Step1 auto-scroll must respect prefers-reduced-motion'
  );
});

test('Audit Fix 9: Touch targets improved to min-h-[44px]', () => {
  assert.ok(
    step1Source.includes('min-h-[44px]'),
    'Step1 getFieldClass must include min-h-[44px]'
  );
  assert.ok(
    step2Source.includes('min-h-[44px]'),
    'Step2 getFieldClass must include min-h-[44px]'
  );
});

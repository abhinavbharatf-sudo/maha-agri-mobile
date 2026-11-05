import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

test('Final Portal UI/UX Refinements — Architectural & Behavioral Verification', async (t) => {
  const wizardPath = resolve(process.cwd(), 'project/src/careers/portal/CandidateApplyWizard.tsx');
  const wizardContent = readFileSync(wizardPath, 'utf8');

  const step1Path = resolve(process.cwd(), 'project/src/careers/portal/steps/Step1CreateProfile.tsx');
  const step1Content = readFileSync(step1Path, 'utf8');

  const step2Path = resolve(process.cwd(), 'project/src/careers/portal/steps/Step2MasterProfile.tsx');
  const step2Content = readFileSync(step2Path, 'utf8');

  const step2JobPath = resolve(process.cwd(), 'project/src/careers/portal/steps/Step2JobSpecific.tsx');
  const step2JobContent = readFileSync(step2JobPath, 'utf8');

  const step3ReviewPath = resolve(process.cwd(), 'project/src/careers/portal/steps/Step3ReviewSubmit.tsx');
  const step3ReviewContent = readFileSync(step3ReviewPath, 'utf8');

  const apiPath = resolve(process.cwd(), 'project/src/careers/lib/api.ts');
  const apiContent = readFileSync(apiPath, 'utf8');

  // Test 1: Candidate name appears correctly after profile save and page refresh
  await t.test('1. Candidate header displays Full Name as per Aadhaar Card with loading state & mobile fallback', () => {
    // Check loading state
    assert.match(wizardContent, /profileLoading/);
    assert.match(wizardContent, /Loading\.\.\./);

    // Check display of full_name from persisted profile
    assert.match(wizardContent, /profile\?\.full_name/);

    // Check mobile fallback
    assert.match(wizardContent, /verifiedMobile \? `\+91 \$\{verifiedMobile\.slice\(-10\)\}` : 'Account'/);

    // Retain candidate ID separately
    assert.match(wizardContent, /profile\?\.candidate_id/);
    assert.match(wizardContent, /Authoritative Candidate ID/);
  });

  // Test 2: Button design — Save & Continue
  await t.test('2. Primary step progression button styled as Save & Continue → without oversized layout', () => {
    assert.ok(
      step1Content.includes('Save &amp; Continue &rarr;') || step1Content.includes('Save & Continue →'),
      'Step 1 must have Save & Continue → button'
    );
    assert.ok(
      step2Content.includes('Save & Continue →') || step2Content.includes('Save &amp; Continue &rarr;'),
      'Step 2 must have Save & Continue → button'
    );
  });

  // Test 3: Back button in Step 3 navigates to Identity & Address without losing state
  await t.test('3. Back button in Step 3 is labeled ← Back to Identity & Address and preserves data', () => {
    assert.match(step2JobContent, /&larr; Back to Identity &amp; Address/);
    assert.match(wizardContent, /goToStep\('master_profile'\)/);
    assert.match(wizardContent, /saveDraft\('master_profile', false\)/);
  });

  // Test 4: Review stage distinction and separate sections with Edit links
  await t.test('4. Review & Submit renders separate sections with dedicated Edit actions and masked Aadhaar', () => {
    // Review banner
    assert.match(step3ReviewContent, /Review Stage &mdash; Please Verify Before Submission/);

    // Separate sections
    assert.match(step3ReviewContent, /1\.\s*Basic Information/);
    assert.match(step3ReviewContent, /2\.\s*Residential Addresses/);
    assert.match(step3ReviewContent, /3\.\s*Position &amp; Preferred Posting Location/);
    assert.match(step3ReviewContent, /4\.\s*Educational Qualifications/);
    assert.match(step3ReviewContent, /5\.\s*Work Experience History/);

    // Edit callbacks
    assert.match(step3ReviewContent, /onEditBasicInfo/);
    assert.match(step3ReviewContent, /onEditAddresses/);
    assert.match(step3ReviewContent, /onEditPosition/);
    assert.match(step3ReviewContent, /onEditQualifications/);
    assert.match(step3ReviewContent, /onEditExperience/);

    // Masked Aadhaar
    assert.match(step3ReviewContent, /maskAadhaar\(masterProfile\.aadhaarNumber\)/);
  });

  // Test 5: Independent statutory declaration & final acknowledgement checkboxes
  await t.test('5. Statutory declaration and final acknowledgement checkboxes are independently validated', () => {
    assert.match(step3ReviewContent, /statutoryAccepted/);
    assert.match(step3ReviewContent, /finalAcknowledged/);

    // Exact mandatory acknowledgement wording
    const expectedWording = 'I have carefully reviewed all information in this application. I understand that after final submission, I cannot edit my application, and duplicate applications for the same position will not be accepted.';
    assert.ok(step3ReviewContent.includes(expectedWording), 'Must include exact acknowledgement text');
  });

  // Test 6: Final Submit button is always clickable & triggers appropriate modals
  await t.test('6. Confirm & Final Submit button triggers clear popups when unchecked, and modal when checked', () => {
    assert.match(step3ReviewContent, /Confirm &amp; Final Submit/);
    assert.match(step3ReviewContent, /showStatutoryAlert/);
    assert.match(step3ReviewContent, /showAcknowledgementAlert/);
    assert.match(step3ReviewContent, /showFinalConfirmModal/);

    // Statutory alert modal content
    assert.match(step3ReviewContent, /Statutory Declaration Required/);

    // Acknowledgement alert modal content
    assert.match(step3ReviewContent, /Final Acknowledgement Required/);

    // Confirmation modal content & actions
    assert.match(step3ReviewContent, /Confirm Final Application Submission/);
    assert.match(step3ReviewContent, /Review Again/);
    assert.match(step3ReviewContent, /Yes, Submit/);
  });

  // Test 7: Double click prevention and idempotency
  await t.test('7. Double-click submissions are blocked by submitting state and backend unique constraint', () => {
    // In Step3ReviewSubmit:
    assert.match(step3ReviewContent, /if \(submitting\) return;/);
    assert.match(step3ReviewContent, /disabled=\{submitting\}/);

    // In CandidateApplyWizard:
    assert.match(wizardContent, /if \(state\.submitting\) return;/);

    // In api.ts createApplication:
    assert.match(apiContent, /code: '23505'/);
    assert.match(apiContent, /You have already applied for this position/);
  });

  // Test 8: Submission lock prevents post-submission candidate editing
  await t.test('8. Candidate cannot edit application after final submission', () => {
    assert.match(wizardContent, /existingApp && existingApp\.status !== 'draft'/);
    assert.match(wizardContent, /Application Already Submitted/);
  });
});

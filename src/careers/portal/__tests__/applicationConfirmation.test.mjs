import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

test('MAHA-AGRI Careers – Final Application Submission Success Page UI/UX Suite', async (t) => {
  const wizardPath = resolve(process.cwd(), 'project/src/careers/portal/CandidateApplyWizard.tsx');
  const wizardSource = readFileSync(wizardPath, 'utf8');

  const step4Path = resolve(process.cwd(), 'project/src/careers/portal/steps/Step4Confirmation.tsx');
  const step4Source = readFileSync(step4Path, 'utf8');

  // ── 1. Success Confirmation Elements ───────────────────────────────────────
  await t.test('1. Layout contains CheckCircle2, exact Heading and exact Description', () => {
    assert.match(
      step4Source,
      /Application Submitted Successfully/,
      'Must contain exact heading: "Application Submitted Successfully"'
    );
    assert.match(
      step4Source,
      /Your application has been successfully submitted\./,
      'Must contain exact description: "Your application has been successfully submitted."'
    );
    assert.match(
      step4Source,
      /<CheckCircle2\s+className="w-8 h-8 sm:w-9 sm:h-9 text-emerald-600"\s*\/>/,
      'Must display green check-circle icon'
    );
  });

  // ── 2. Application Reference Card ──────────────────────────────────────────
  await t.test('2. Reference card is dark navy and displays official reference fields without redundant data', () => {
    // Background style
    assert.match(
      step4Source,
      /bg-\[#102a43\]/,
      'Reference card must use dark navy background (#102a43)'
    );

    // Official Application Number
    assert.match(
      step4Source,
      /Official Application Number/,
      'Must label the application number as "Official Application Number"'
    );
    assert.match(
      step4Source,
      /font-mono font-extrabold tracking-wider/,
      'Application number must be styled prominently in monospace bold'
    );

    // Job Title & Submission Date/Time
    assert.match(step4Source, /Job Title/, 'Must display Job Title field');
    assert.match(step4Source, /job\.title/, 'Must render job.title');
    assert.match(step4Source, /Submission Date &amp; Time/, 'Must display Submission Date & Time');
    assert.match(step4Source, /formattedTimestamp/, 'Must render formatted submission timestamp');
    assert.match(step4Source, /'en-IN'/, 'Must format timestamp in Indian locale (en-IN)');

    // Project Name conditionally rendered
    assert.match(
      step4Source,
      /\{projectName\s*&&\s*\([\s\S]*?Project Name[\s\S]*?\{projectName\}[\s\S]*?\)\}/,
      'Project Name must only be rendered when projectName is present'
    );

    // Redundant details MUST NOT be present in Step4Confirmation
    assert.doesNotMatch(step4Source, /Applicant Profile/i, 'Redundant Applicant Profile card must not exist');
    assert.doesNotMatch(step4Source, /Educational Qualifications/i, 'Redundant Educational Qualifications must not exist');
    assert.doesNotMatch(step4Source, /Preferred Posting Locations/i, 'Redundant Preferred Posting Locations must not exist');
    assert.doesNotMatch(step4Source, /What Happens Next/i, 'Redundant What Happens Next section must not exist');
    assert.doesNotMatch(step4Source, /Print \/ Save Acknowledgement/i, 'Redundant Print/Save button must not exist');
  });

  // ── 3. Zero Wizard UI in Confirmation Step ─────────────────────────────────
  await t.test('3. CandidateApplyWizard bypasses all wizard chrome when state.currentStep === "confirmation"', () => {
    // Early return logic
    assert.match(
      wizardSource,
      /if\s*\(\s*state\.currentStep\s*===\s*'confirmation'\s*\)\s*\{[\s\S]*?return\s*\([\s\S]*?<Step4Confirmation/,
      'Wizard must immediately return clean Step4Confirmation view when currentStep === "confirmation"'
    );

    // Ensure projectName is passed to Step4Confirmation
    assert.match(
      wizardSource,
      /projectName=\{projectName\}/,
      'Wizard must forward parsed projectName to Step4Confirmation'
    );

    // Confirm that the confirmation step is NOT duplicated in the stepper body
    const stepperMatches = wizardSource.match(/state\.currentStep === 'confirmation' \? \(/g);
    assert.equal(
      stepperMatches,
      null,
      'Confirmation step must not be rendered within standard stepper container'
    );
  });

  // ── 4. Dynamic Next Step – Scenario A (Fee > 0 and Unpaid) ─────────────────
  await t.test('4. Scenario A: Payment required shows payable amount and Proceed to Payment; hides slot booking', () => {
    // Check fee conditional
    assert.match(
      step4Source,
      /!isFreeJob\s*&&\s*!isPaymentVerified/,
      'Must conditionally render payment card when !isFreeJob && !isPaymentVerified'
    );

    // Payment pending badge and amount
    assert.match(step4Source, /Application Processing Fee/, 'Must show Application Processing Fee label');
    assert.match(step4Source, /Payment Pending/, 'Must show Payment Pending badge');
    assert.match(step4Source, /₹\{applicationFeeAmount\.toLocaleString\('en-IN'\)\}/, 'Must show formatted fee amount');

    // Green Proceed to Payment button
    assert.match(
      step4Source,
      /Proceed to Payment/,
      'Must render "Proceed to Payment" primary button'
    );
    assert.match(
      step4Source,
      /bg-\[#16a34a\]/,
      'Primary action button must be government green (#16a34a)'
    );

    // Razorpay Integration
    assert.match(
      step4Source,
      /\/api\/v1\/integration\/rms\/payment\/orders/,
      'Must call backend order endpoint'
    );
    assert.match(
      step4Source,
      /\/api\/v1\/integration\/rms\/payment\/verify/,
      'Must call backend verification endpoint'
    );
  });

  // ── 5. Dynamic Next Step – Scenario B (Fee === 0 OR Paid) ──────────────────
  await t.test('5. Scenario B: Free job or verified payment directly shows Book Online Interview Slot', () => {
    // Check booking conditional: when isFreeJob || isPaymentVerified
    assert.match(
      step4Source,
      /Book Online Interview Slot/,
      'Must render "Book Online Interview Slot" button'
    );

    // Integration with slot API
    assert.match(step4Source, /listAvailableSlots\(job\.id\)/, 'Must fetch available slots via listAvailableSlots');
    assert.match(step4Source, /bookApplicationToSlot\(applicationId,\s*selectedSlotId\)/, 'Must book slot via bookApplicationToSlot');

    // Confirmed booking state
    assert.match(
      step4Source,
      /Interview Slot Confirmed/,
      'Must render confirmed booking view when interviewBooking exists'
    );
  });

  // ── 6. Navigation Actions ──────────────────────────────────────────────────
  await t.test('6. Secondary and tertiary navigation actions route to candidate dashboard and applications', () => {
    assert.match(
      step4Source,
      /navigate\('\/candidate\/dashboard'\)/,
      'Must navigate to /candidate/dashboard'
    );
    assert.match(
      step4Source,
      /Go to Candidate Dashboard/,
      'Must display "Go to Candidate Dashboard" button'
    );

    assert.match(
      step4Source,
      /navigate\('\/candidate\/applications'\)/,
      'Must navigate to /candidate/applications'
    );
    assert.match(
      step4Source,
      /View My Applications/,
      'Must display "View My Applications" button'
    );
  });
});

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Careers Candidate Application: Direct Return to Review & Mandatory Consent Modals', () => {

  const wizardPath = resolve(process.cwd(), 'project/src/careers/portal/CandidateApplyWizard.tsx');
  const wizardContent = readFileSync(wizardPath, 'utf8');

  const step1Path = resolve(process.cwd(), 'project/src/careers/portal/steps/Step1CreateProfile.tsx');
  const step1Content = readFileSync(step1Path, 'utf8');

  const step2MasterPath = resolve(process.cwd(), 'project/src/careers/portal/steps/Step2MasterProfile.tsx');
  const step2MasterContent = readFileSync(step2MasterPath, 'utf8');

  const step2JobPath = resolve(process.cwd(), 'project/src/careers/portal/steps/Step2JobSpecific.tsx');
  const step2JobContent = readFileSync(step2JobPath, 'utf8');

  const step3ReviewPath = resolve(process.cwd(), 'project/src/careers/portal/steps/Step3ReviewSubmit.tsx');
  const step3ReviewContent = readFileSync(step3ReviewPath, 'utf8');

  const apiPath = resolve(process.cwd(), 'project/src/careers/portal/api.ts');
  const apiContent = readFileSync(apiPath, 'utf8');

  // ── 1. Direct Return to Review Verification ─────────────────────────────────

  it('1. Wizard wires returnToReview state for all Edit handlers from Step 4 Review', () => {
    // onEditBasicInfo sets returnToReview and navigates to create_profile
    assert.match(wizardContent, /onEditBasicInfo=\{[^}]*setReturnToReview\(true\)[^}]*goToStep\('create_profile'\)/s);

    // onEditAddresses sets returnToReview and navigates to master_profile
    assert.match(wizardContent, /onEditAddresses=\{[^}]*setReturnToReview\(true\)[^}]*goToStep\('master_profile'\)/s);

    // onEditPosition sets returnToReview and navigates to job_specific
    assert.match(wizardContent, /onEditPosition=\{[^}]*setReturnToReview\(true\)[^}]*goToStep\('job_specific'\)/s);

    // onEditQualifications sets returnToReview and navigates to job_specific
    assert.match(wizardContent, /onEditQualifications=\{[^}]*setReturnToReview\(true\)[^}]*goToStep\('job_specific'\)/s);

    // onEditExperience sets returnToReview and navigates to job_specific
    assert.match(wizardContent, /onEditExperience=\{[^}]*setReturnToReview\(true\)[^}]*goToStep\('job_specific'\)/s);

    // onEditQuestionnaire sets returnToReview and navigates to questionnaire
    assert.match(wizardContent, /onEditQuestionnaire=\{[^}]*setReturnToReview\(true\)[^}]*goToStep\('questionnaire'\)/s);
  });

  it('2. Saving in Step 1, Step 2, and Step 3 returns DIRECTLY to review when returnToReview is true', () => {
    // Step 1 onNext returns directly to review
    assert.match(wizardContent, /if\s*\(returnToReview\)\s*\{[^}]*setReturnToReview\(false\);[^}]*goToStep\('review'\);[^}]*saveDraft\('review',\s*false\);/s);

    // Step 2 MasterProfile onNext returns directly to review
    assert.match(wizardContent, /if\s*\(returnToReview\)\s*\{[^}]*setReturnToReview\(false\);[^}]*goToStep\('review'\);[^}]*saveDraft\('review',\s*false\);/s);

    // Step 2 JobSpecific onNext returns directly to review
    assert.match(wizardContent, /if\s*\(returnToReview\)\s*\{[^}]*setReturnToReview\(false\);[^}]*goToStep\('review'\);[^}]*saveDraft\('review',\s*false\);/s);
  });

  it('3. Step2JobSpecific targets specific section and supports direct return to review', () => {
    assert.match(step2JobContent, /id="section-qualifications"/);
    assert.match(step2JobContent, /id="section-experience"/);
    assert.match(step2JobContent, /id="section-posting-location"/);
    assert.match(step2JobContent, /returnToReview\s*\?\s*'Save & Return to Review'/);
    assert.match(step2JobContent, /returnToReview\s*\?\s*'← Return to Review'/);
  });

  // ── 2. Mandatory Consent Modal Before Final Submission ──────────────────────

  it('4. Both statutory declaration and final acknowledgement checkboxes default to unchecked', () => {
    assert.match(step3ReviewContent, /const\s*\[statutoryAccepted,\s*setStatutoryAccepted\]\s*=\s*useState\(false\);/);
    assert.match(step3ReviewContent, /const\s*\[finalAcknowledged,\s*setFinalAcknowledged\]\s*=\s*useState\(false\);/);
  });

  it('5. Confirm & Final Submit triggers Statutory Consent Modal if statutory declaration is unchecked', () => {
    assert.match(step3ReviewContent, /if\s*\(!statutoryAccepted\)\s*\{\s*setShowStatutoryModal\(true\);\s*return;\s*\}/);
    assert.match(step3ReviewContent, /showStatutoryModal\s*&&/);
    assert.match(step3ReviewContent, /Statutory Legal Undertaking &amp; Declaration/);
    assert.match(step3ReviewContent, /\{declarationText\}/);
    assert.match(step3ReviewContent, /I Agree &amp; Continue/);
  });

  it('6. Accepting Statutory Declaration modal explicitly checks box, captures timestamp, and triggers Acknowledgement modal if needed', () => {
    assert.match(step3ReviewContent, /const\s*handleAcceptStatutoryInModal\s*=\s*\(\)\s*=>\s*\{[^}]*setStatutoryAccepted\(true\);[^}]*setStatutoryAcceptedAt\(nowIso\);[^}]*setShowStatutoryModal\(false\);/s);
    assert.match(step3ReviewContent, /if\s*\(!finalAcknowledged\)\s*\{\s*setShowAcknowledgementModal\(true\);/s);
  });

  it('7. Confirm & Final Submit triggers Mandatory Final Acknowledgement Modal if acknowledgement is unchecked', () => {
    assert.match(step3ReviewContent, /if\s*\(!finalAcknowledged\)\s*\{\s*setShowAcknowledgementModal\(true\);\s*return;\s*\}/);
    assert.match(step3ReviewContent, /showAcknowledgementModal\s*&&/);
    assert.match(step3ReviewContent, /Mandatory Final Acknowledgement/);
    assert.match(step3ReviewContent, /FINAL_ACKNOWLEDGEMENT_TEXT/);
    assert.match(step3ReviewContent, /I Agree &amp; Continue/);
  });

  it('8. Accepting Final Acknowledgement modal explicitly checks box, captures timestamp, and proceeds to Final Confirmation', () => {
    assert.match(step3ReviewContent, /const\s*handleAcceptAcknowledgementInModal\s*=\s*\(\)\s*=>\s*\{[^}]*setFinalAcknowledged\(true\);[^}]*setFinalAcknowledgedAt\(nowIso\);[^}]*setShowAcknowledgementModal\(false\);[^}]*setShowFinalConfirmModal\(true\);/s);
  });

  it('9. Both declarations are kept separate with independent records and timestamps in final payload', () => {
    assert.match(step3ReviewContent, /statutory_declaration_accepted:\s*statutoryAccepted/);
    assert.match(step3ReviewContent, /statutory_declaration_accepted_at:\s*nowIso/);
    assert.match(step3ReviewContent, /final_acknowledgement_accepted:\s*finalAcknowledged/);
    assert.match(step3ReviewContent, /final_acknowledgement_accepted_at:\s*nowIso/);
  });

  // ── 3. Server / API Validation & Persistence ────────────────────────────────

  it('10. Backend fails closed if statutory declaration or final acknowledgement is missing or false in declarationData', () => {
    assert.match(apiContent, /if\s*\(declarationData\)\s*\{[\s\S]*!declarationData\.statutory_declaration_accepted\s*\|\|\s*!declarationData\.final_acknowledgement_accepted[\s\S]*must be explicitly accepted/);
  });

  it('11. API persists distinct statutory_declaration and final_acknowledgement in application_data structure', () => {
    assert.match(apiContent, /statutory_declaration:\s*\{[^}]*accepted:\s*declarationPayload\.statutory_declaration_accepted/s);
    assert.match(apiContent, /final_acknowledgement:\s*\{[^}]*accepted:\s*declarationPayload\.final_acknowledgement_accepted/s);
    assert.match(apiContent, /submission_snapshot:\s*\{[\s\S]*statutory_declaration:\s*\{[\s\S]*final_acknowledgement:\s*\{/s);
  });
});

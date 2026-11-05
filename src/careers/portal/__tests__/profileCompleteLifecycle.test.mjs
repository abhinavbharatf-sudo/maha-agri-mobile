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

const step1Source = fs.readFileSync(resolveFilePath('src/careers/portal/steps/Step1CreateProfile.tsx'), 'utf8');
const step2Source = fs.readFileSync(resolveFilePath('src/careers/portal/steps/Step2MasterProfile.tsx'), 'utf8');
const apiSource = fs.readFileSync(resolveFilePath('src/careers/lib/api.ts'), 'utf8');
const dashboardSource = fs.readFileSync(resolveFilePath('src/careers/dashboard/CandidateDashboard.tsx'), 'utf8');
const crmApiSource = fs.readFileSync(resolveFilePath('src/crm/lib/api.ts'), 'utf8');
const applySource = fs.readFileSync(resolveFilePath('src/careers/pages/Apply.tsx'), 'utf8');
const atomicSubmissionSource = fs.readFileSync(
  resolveFilePath('supabase/migrations/20261028160000_rms_atomic_candidate_portal_submission.sql'),
  'utf8'
);

test('Profile Complete 1: New profile remains incomplete after Step 1 (profile_complete is omitted from payload)', () => {
  const executeSaveMatch = step1Source.match(/const executeSaveProfile = async \(\) => {([\s\S]*?)const { data: savedProfile/);
  assert.ok(executeSaveMatch, 'executeSaveProfile payload setup must exist in Step1CreateProfile');
  const payloadSetup = executeSaveMatch[1];

  // Must not include profile_complete
  assert.ok(
    !payloadSetup.includes('profile_complete'),
    'Step1CreateProfile payload must NEVER include profile_complete: true'
  );

  // PostgreSQL column default is false
  assert.ok(
    !payloadSetup.includes('profile_complete: true'),
    'Step 1 must not prematurely set profile_complete to true'
  );
});

test('Profile Complete 2: Existing completed profile remains complete after a Step 1 edit (onConflict preserves value)', () => {
  // Verifies that PostgreSQL upsert only updates columns sent in payload
  assert.ok(
    apiSource.includes(".upsert(payload as never, { onConflict: 'user_id' })"),
    'upsertCandidateProfile uses onConflict: user_id which preserves omitted column values'
  );

  // In dummy mode, profile_complete merges existing value when omitted in profile
  assert.ok(
    apiSource.includes('profile_complete: (profile as any).profile_complete !== undefined') &&
    apiSource.includes('(existingDummy as any).profile_complete'),
    'Dummy mode must preserve existingDummy.profile_complete when updating Step 1'
  );
});

test('Profile Complete 3: Step 2 successful validated persistence sets profile_complete=true', () => {
  const step2SubmitMatch = step2Source.match(/const handleSubmit = async \([\s\S]*?const { data: savedProfile, error: saveErr } = await upsertCandidateProfile\(payload as any\);/);
  assert.ok(step2SubmitMatch, 'handleSubmit must construct payload and call upsertCandidateProfile');
  const step2SubmitBody = step2SubmitMatch[0];

  // Assert Step 2 sets profile_complete: true in payload
  assert.ok(
    step2SubmitBody.includes('profile_complete: true'),
    'Step 2 payload must explicitly set profile_complete: true'
  );

  // Assert Step 2 only reaches payload construction after validation passes
  assert.ok(
    step2SubmitBody.includes('if (Object.keys(newErrors).length > 0)'),
    'Step 2 must validate all fields and exit if invalid before building payload'
  );

  // Assert Step 2 checks Aadhaar duplicate before building payload
  assert.ok(
    step2SubmitBody.includes('checkAadhaarDuplicateServer'),
    'Step 2 must perform Aadhaar duplicate check before persistence'
  );
});

test('Profile Complete 4: Step 2 failed persistence never sets completion or proceeds to success', () => {
  // If save fails, Step2MasterProfile sets error and aborts without calling onNext()
  const errorHandlingMatch = step2Source.match(/if \(saveErr \|\| !savedProfile\) {([\s\S]*?)setSaving\(false\);\s*return;\s*}/);
  assert.ok(errorHandlingMatch, 'Step 2 must return early on save error');
  const errorHandlingBody = errorHandlingMatch[0];

  assert.ok(
    errorHandlingBody.includes('setFormError'),
    'Step 2 must set formError when save fails'
  );
  assert.ok(
    !errorHandlingBody.includes('onNext()'),
    'Step 2 must NEVER call onNext() on save failure'
  );
});

test('Profile Complete 5: Dashboard and CRM correctly classify incomplete profiles', () => {
  // CandidateDashboard displays reminder when profile_complete is false
  assert.ok(
    dashboardSource.includes('!profile?.profile_complete') &&
    dashboardSource.includes('Complete Your Profile'),
    'CandidateDashboard must prompt incomplete profiles with Complete Your Profile banner'
  );

  // CRM api correctly classifies journey stage as Profile Incomplete when profile_complete is not true
  assert.ok(
    crmApiSource.includes("lead.candidate_profile?.profile_complete === true") &&
    crmApiSource.includes("lead.profile_status = 'Profile Complete'") &&
    crmApiSource.includes("lead.profile_status = 'Profile Incomplete'"),
    'CRM API must classify lead as Profile Incomplete if profile_complete is not true'
  );
});

test('Profile Complete 6: Legacy Apply.tsx does not skip required fields when profile is incomplete', () => {
  // In Apply.tsx, isMasterProfileComplete is derived from profile_complete
  assert.ok(
    applySource.includes('const isMasterProfileComplete = Boolean(candidate?.profile_complete)'),
    'Apply.tsx checks Boolean(candidate?.profile_complete)'
  );

  // When profile_complete is false, Apply.tsx directs to personal step
  assert.ok(
    applySource.includes("setStep(data.profile_complete ? 'preference' : 'personal')"),
    'Apply.tsx directs incomplete profiles to personal step'
  );
});

test('Profile Complete 7: Atomic application submission behavior remains unchanged', () => {
  assert.ok(
    atomicSubmissionSource.includes('profile_complete = true'),
    'rms_submit_application_atomic RPC sets profile_complete = true on successful application submission'
  );
});

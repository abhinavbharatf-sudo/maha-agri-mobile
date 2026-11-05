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

test('Step 1 Boundary 1: Step 1 payload contains no permanent_* fields', () => {
  // Extract executeSaveProfile method from Step1CreateProfile
  const executeSaveMatch = step1Source.match(/const executeSaveProfile = async \(\) => {([\s\S]*?)const handleFormSubmit/);
  assert.ok(executeSaveMatch, 'executeSaveProfile must be defined in Step1CreateProfile');
  const executeSaveBody = executeSaveMatch[1];

  // Assert that permanent_* fields are NOT added to the payload
  assert.ok(!executeSaveBody.includes('payload.permanent_same_as_current'), 'Step 1 payload must NOT contain permanent_same_as_current');
  assert.ok(!executeSaveBody.includes('payload.permanent_address_line1'), 'Step 1 payload must NOT contain permanent_address_line1');
  assert.ok(!executeSaveBody.includes('payload.permanent_district'), 'Step 1 payload must NOT contain permanent_district');
  assert.ok(!executeSaveBody.includes('payload.permanent_taluka'), 'Step 1 payload must NOT contain permanent_taluka');
  assert.ok(!executeSaveBody.includes('payload.permanent_pincode'), 'Step 1 payload must NOT contain permanent_pincode');
});

test('Step 1 Boundary 2: Step 1 saves only its own valid core fields against live schema', () => {
  const executeSaveMatch = step1Source.match(/const executeSaveProfile = async \(\) => {([\s\S]*?)const { data: savedProfile/);
  assert.ok(executeSaveMatch, 'payload setup must precede upsertCandidateProfile call');
  const payloadSetup = executeSaveMatch[1];

  // Core fields verified
  assert.ok(payloadSetup.includes('user_id: userId'), 'Step 1 must pass user_id');
  assert.ok(payloadSetup.includes('mobile: cleanMobile'), 'Step 1 must pass cleanMobile');
  assert.ok(payloadSetup.includes('full_name: data.fullName.trim()'), 'Step 1 must pass full_name');
  assert.ok(payloadSetup.includes('date_of_birth: data.dateOfBirth'), 'Step 1 must pass date_of_birth');
  assert.ok(payloadSetup.includes('gender: dbGender'), 'Step 1 must pass gender');
  assert.ok(payloadSetup.includes('emergency_mobile: cleanAlt'), 'Step 1 must pass emergency_mobile');
  assert.ok(payloadSetup.includes('alternate_mobile: cleanAlt'), 'Step 1 must pass alternate_mobile');
  assert.ok(payloadSetup.includes('email: data.email?.trim() || null'), 'Step 1 must pass email');
  assert.ok(!payloadSetup.includes('profile_complete'), 'Step 1 must omit profile_complete so it is not prematurely marked complete');

  // Address and caste fields omitted from Step 1
  assert.ok(!payloadSetup.includes('payload.caste_category'), 'Step 1 must not touch caste_category');
  assert.ok(!payloadSetup.includes('payload.district'), 'Step 1 must not touch district');
  assert.ok(!payloadSetup.includes('payload.taluka'), 'Step 1 must not touch taluka');
  assert.ok(!payloadSetup.includes('payload.address_line1'), 'Step 1 must not touch address_line1');
  assert.ok(!payloadSetup.includes('payload.pincode'), 'Step 1 must not touch pincode');
});

test('Step 1 Boundary 3: onConflict user_id preserves existing Step 2 data during Step 1 updates', () => {
  // PostgreSQL upsert uses onConflict: 'user_id'
  assert.ok(
    apiSource.includes(".upsert(payload as never, { onConflict: 'user_id' })"),
    "api.ts upsert must specify onConflict: 'user_id'"
  );

  // In dummy mode, partial updates merge with existingDummy
  assert.ok(
    apiSource.includes('existingDummy.district') && apiSource.includes('address_line1'),
    'api.ts dummy mode must merge with existing stored dummy profile fields'
  );
  assert.ok(
    apiSource.includes('permanent_address_line1'),
    'api.ts dummy mode must preserve existing permanent address fields'
  );
});

test('Step 1 Boundary 4: Step 2 remains responsible for Identity, Current & Permanent Address persistence', () => {
  assert.ok(step2Source.includes('district: currentDistrictVal'), 'Step 2 must persist district');
  assert.ok(step2Source.includes('taluka: currentTalukaVal'), 'Step 2 must persist taluka');
  assert.ok(step2Source.includes('payload.address_line1 = currentAddressLine1Val'), 'Step 2 must persist address_line1');
  assert.ok(step2Source.includes('payload.pincode = currentPincodeVal'), 'Step 2 must persist pincode');
  assert.ok(step2Source.includes('payload.permanent_same_as_current = isSameAddress'), 'Step 2 must persist permanent_same_as_current');
  assert.ok(step2Source.includes('payload.permanent_address_line1 = permanentAddressLine1Val'), 'Step 2 must persist permanent_address_line1');
  assert.ok(step2Source.includes('payload.permanent_district = permanentDistrictVal'), 'Step 2 must persist permanent_district');
  assert.ok(step2Source.includes('payload.permanent_taluka = permanentTalukaVal'), 'Step 2 must persist permanent_taluka');
  assert.ok(step2Source.includes('payload.permanent_pincode = permanentPincodeVal'), 'Step 2 must persist permanent_pincode');
});

test('Step 1 Boundary 5: Step 2 continues to surface genuine database schema errors without false success', () => {
  assert.ok(
    step2Source.includes('(saveErr as any)?.message'),
    'Step 2 must surface genuine database error messages to formError'
  );
  assert.ok(
    apiSource.includes('Database schema update pending: one or more required profile columns'),
    'api.ts must accurately report schema mismatches (e.g. unapplied migrations)'
  );
});

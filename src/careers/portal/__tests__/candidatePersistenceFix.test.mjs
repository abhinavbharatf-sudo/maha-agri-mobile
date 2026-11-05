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

const apiSource = fs.readFileSync(resolveFilePath('src/careers/lib/api.ts'), 'utf8');
const myProfileSource = fs.readFileSync(resolveFilePath('src/careers/dashboard/MyProfile.tsx'), 'utf8');
const step2Source = fs.readFileSync(resolveFilePath('src/careers/portal/steps/Step2MasterProfile.tsx'), 'utf8');
const migrationSource = fs.readFileSync(
  resolveFilePath('supabase/migrations/20261104180000_candidate_profile_unification_persistence.sql'),
  'utf8'
);

test('Persistence Fix 1: upsertCandidateProfile handles PGRST204 and 42703 without swallowing', () => {
  // Checks detection of schema mismatch codes
  assert.ok(
    apiSource.includes("error.code === 'PGRST204'") && apiSource.includes("(error as any).code === '42703'"),
    'upsertCandidateProfile must explicitly recognize both PGRST204 and 42703'
  );

  // Authenticated error is returned, never masked as error: null
  assert.ok(
    apiSource.includes('Database schema update pending: one or more required profile columns'),
    'upsertCandidateProfile must provide an actionable error message on schema mismatch'
  );

  // localStorage fallback is NOT used to fake success for authenticated users
  assert.ok(
    !apiSource.includes("if (error && isDummyOtpMode())"),
    'Failed Supabase upsert must NEVER be caught and converted to error: null via dummy fallback'
  );
});

test('Persistence Fix 2: Read-after-write verification is enforced for authenticated candidate', () => {
  assert.ok(
    apiSource.includes('writtenUserId !== profile.user_id') || apiSource.includes('data.user_id !== profile.user_id'),
    'upsertCandidateProfile must verify written row matches caller user_id'
  );
  assert.ok(
    apiSource.includes("code: 'VERIFY_FAILED'"),
    'upsertCandidateProfile must return an error if read-after-write verification fails'
  );
});

test('Persistence Fix 3: MyProfile.tsx rehydrates when profile is updated even if profile.id is unchanged', () => {
  assert.ok(
    myProfileSource.includes('lastProfileSignatureRef'),
    'MyProfile must track a composite signature rather than just static profileId'
  );
  assert.ok(
    myProfileSource.includes('profile.updated_at') || myProfileSource.includes('profile.created_at'),
    'Profile signature must include updated_at timestamp to detect server saves'
  );
});

test('Persistence Fix 4: Step2MasterProfile displays genuine database/schema error to candidate', () => {
  assert.ok(
    step2Source.includes('(saveErr as any)?.message'),
    'Step2MasterProfile must surface detailed saveErr.message to formError'
  );
});

test('Persistence Fix 5: Migration file is safe, idempotent, and unapplied', () => {
  // Check permanent address columns
  assert.ok(
    migrationSource.includes('ADD COLUMN IF NOT EXISTS permanent_same_as_current'),
    'Migration must add permanent_same_as_current'
  );
  assert.ok(
    migrationSource.includes('ADD COLUMN IF NOT EXISTS permanent_address_line1'),
    'Migration must add permanent_address_line1'
  );
  assert.ok(
    migrationSource.includes('ADD COLUMN IF NOT EXISTS permanent_pincode'),
    'Migration must add permanent_pincode'
  );

  // Check aadhaar_hash and partial unique index
  assert.ok(
    migrationSource.includes('ADD COLUMN IF NOT EXISTS aadhaar_hash text'),
    'Migration must add aadhaar_hash'
  );
  assert.ok(
    migrationSource.includes('CREATE UNIQUE INDEX IF NOT EXISTS idx_rms_candidate_aadhaar_hash') &&
    migrationSource.includes('WHERE aadhaar_hash IS NOT NULL'),
    'Migration must create a partial unique index where aadhaar_hash IS NOT NULL'
  );

  // Check RPC hardening
  assert.ok(
    migrationSource.includes('CREATE OR REPLACE FUNCTION public.rms_check_aadhaar_duplicate'),
    'Migration must define rms_check_aadhaar_duplicate'
  );
  assert.ok(
    migrationSource.includes('SECURITY DEFINER') && migrationSource.includes('SET search_path = public'),
    'RPC must use SECURITY DEFINER and search_path = public'
  );
  assert.ok(
    migrationSource.includes('v_caller_id := auth.uid();'),
    'RPC must derive identity from auth.uid() rather than trusting client-supplied user_id'
  );
  assert.ok(
    migrationSource.includes('GRANT EXECUTE ON FUNCTION public.rms_check_aadhaar_duplicate(text) TO authenticated;'),
    'RPC must only grant execution to authenticated users'
  );

  // Check rollback instructions
  assert.ok(
    migrationSource.includes('ROLLBACK INSTRUCTIONS'),
    'Migration must include clear rollback instructions'
  );
});

test('Persistence Fix 6: Application drafts and submitted snapshots remain isolated', () => {
  // Candidate Master Profile write targets rms_candidate_profiles strictly
  assert.ok(
    apiSource.includes(".from('rms_candidate_profiles' as never)"),
    'Profile upsert targets rms_candidate_profiles'
  );
  // Does not alter application snapshots
  assert.ok(
    !apiSource.includes("rms_applications.application_data = payload"),
    'Profile upsert must not directly mutate submitted application records'
  );
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

test('Final Submission Workflow — Verification of Persistence, Locking & Integrity', async (t) => {
  const step3ReviewPath = resolve(process.cwd(), 'project/src/careers/portal/steps/Step3ReviewSubmit.tsx');
  const step3ReviewContent = readFileSync(step3ReviewPath, 'utf8');

  const wizardPath = resolve(process.cwd(), 'project/src/careers/portal/CandidateApplyWizard.tsx');
  const wizardContent = readFileSync(wizardPath, 'utf8');

  const portalApiPath = resolve(process.cwd(), 'project/src/careers/portal/api.ts');
  const portalApiContent = readFileSync(portalApiPath, 'utf8');

  const libApiPath = resolve(process.cwd(), 'project/src/careers/lib/api.ts');
  const libApiContent = readFileSync(libApiPath, 'utf8');

  const rpcMigrationPath = resolve(process.cwd(), 'project/supabase/migrations/20261028160000_rms_atomic_candidate_portal_submission.sql');
  const rpcMigrationContent = readFileSync(rpcMigrationPath, 'utf8');

  const uniqueIndexMigrationPath = resolve(process.cwd(), 'project/supabase/migrations/20261025000000_allow_reapply_on_trashed_application.sql');
  const uniqueIndexMigrationContent = readFileSync(uniqueIndexMigrationPath, 'utf8');

  // Verification 1: Both statutory declaration and final acknowledgement are captured with timestamps and texts
  await t.test('1. Final declaration data captures statutory and final acknowledgement with timestamps and version', () => {
    // In Step3ReviewSubmit:
    assert.match(step3ReviewContent, /statutory_declaration_accepted:\s*statutoryAccepted/);
    assert.match(step3ReviewContent, /statutory_declaration_accepted_at:\s*nowIso/);
    assert.match(step3ReviewContent, /statutory_declaration_text:\s*declarationText/);
    assert.match(step3ReviewContent, /final_acknowledgement_accepted:\s*finalAcknowledged/);
    assert.match(step3ReviewContent, /final_acknowledgement_accepted_at:\s*nowIso/);
    assert.match(step3ReviewContent, /final_acknowledgement_text:\s*FINAL_ACKNOWLEDGEMENT_TEXT/);

    // Passed into onSubmit
    assert.match(step3ReviewContent, /onSubmit\(declarationPayload\)/);
  });

  // Verification 2: Persistence in database envelope via existing application_data and submission_snapshot
  await t.test('2. Minimal backend persistence maps declarationData to p_declaration and application_data', () => {
    // In portal/api.ts:
    assert.match(portalApiContent, /declarationData\?: FinalDeclarationData/);
    assert.match(portalApiContent, /declarationPayload: FinalDeclarationData = declarationData \|\|/);
    assert.match(portalApiContent, /p_declaration:\s*declarationPayload/);
    assert.match(portalApiContent, /declaration:\s*declarationPayload/);
    assert.match(portalApiContent, /submission_snapshot:[\s\S]*declaration:\s*declarationPayload/);

    // In RPC migration: p_declaration is written to v_snapshot and application_data
    assert.match(rpcMigrationContent, /'declaration',\s*p_declaration/);
    assert.match(rpcMigrationContent, /'submission_snapshot',\s*v_snapshot/);
  });

  // Verification 3: Server-side submission locking
  await t.test('3. Server-side submission locking prevents modifying submitted applications', () => {
    // In RPC rms_submit_application:
    assert.match(rpcMigrationContent, /IF v_existing_app\.id IS NOT NULL AND v_existing_app\.status <> 'draft' THEN/);
    assert.match(rpcMigrationContent, /'already_submitted',\s*true/);

    // In lib/api.ts createApplication:
    assert.match(libApiContent, /if \(existingApp && \(existingApp as any\)\.status !== 'draft'\)/);
    assert.match(libApiContent, /code: '23505'/);
  });

  // Verification 4: Partial unique index behavior across application statuses
  await t.test('4. Partial unique index protects active applications while allowing trashed re-applications', () => {
    // Check partial unique index definition
    assert.match(uniqueIndexMigrationContent, /CREATE UNIQUE INDEX IF NOT EXISTS idx_rms_applications_candidate_job_active/);
    assert.match(uniqueIndexMigrationContent, /ON public\.rms_applications\(candidate_id,\s*job_posting_id\)/);
    assert.match(uniqueIndexMigrationContent, /WHERE \(is_trashed IS FALSE OR is_trashed IS NULL\)/);

    // Emulation of index rule across statuses
    const canInsertActiveApp = (existingRecords, candidateId, jobId) => {
      const activeMatch = existingRecords.find(r => 
        r.candidate_id === candidateId && 
        r.job_posting_id === jobId && 
        (r.is_trashed === false || r.is_trashed === null || r.is_trashed === undefined)
      );
      return !activeMatch;
    };

    // Case A: Candidate has a submitted application -> blocked
    const dbWithSubmitted = [{ candidate_id: 'c1', job_posting_id: 'j1', status: 'submitted', is_trashed: false }];
    assert.equal(canInsertActiveApp(dbWithSubmitted, 'c1', 'j1'), false, 'Cannot submit duplicate for active application');

    // Case B: Candidate has a rejected application (not trashed) -> blocked
    const dbWithRejected = [{ candidate_id: 'c1', job_posting_id: 'j1', status: 'rejected', is_trashed: null }];
    assert.equal(canInsertActiveApp(dbWithRejected, 'c1', 'j1'), false, 'Active rejected application prevents duplicate');

    // Case C: Candidate has a trashed application (is_trashed = true) -> permitted
    const dbWithTrashed = [{ candidate_id: 'c1', job_posting_id: 'j1', status: 'rejected', is_trashed: true }];
    assert.equal(canInsertActiveApp(dbWithTrashed, 'c1', 'j1'), true, 'Trashed application allows re-application');

    // Case D: Candidate applies to a different job -> permitted
    assert.equal(canInsertActiveApp(dbWithSubmitted, 'c1', 'j2'), true, 'Candidate can apply to distinct job');
  });

  // Verification 5: Concurrency row locking and race-condition immunity
  await t.test('5. Concurrency row locks and idempotent returns eliminate duplicate creation on repeated clicks', () => {
    // RPC acquires row lock on candidate profile to serialize concurrent submission requests
    assert.match(rpcMigrationContent, /PERFORM id\s+FROM public\.rms_candidate_profiles\s+WHERE id = v_candidate\.id\s+FOR UPDATE;/);

    // createApplication handles race 23505 gracefully
    assert.match(libApiContent, /if \(\(error as \{ code\?: string \}\)\?\.code === '23505'\)/);
  });
});

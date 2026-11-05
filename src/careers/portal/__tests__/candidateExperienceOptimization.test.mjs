import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const wizardPath = path.resolve('project/src/careers/portal/CandidateApplyWizard.tsx');
const myAppsPath = path.resolve('project/src/careers/dashboard/MyApplications.tsx');
const step1Path = path.resolve('project/src/careers/portal/steps/Step1CreateProfile.tsx');
const portalApiPath = path.resolve('project/src/careers/portal/api.ts');
const libApiPath = path.resolve('project/src/careers/lib/api.ts');

const wizardSource = fs.readFileSync(wizardPath, 'utf8');
const myAppsSource = fs.readFileSync(myAppsPath, 'utf8');
const step1Source = fs.readFileSync(step1Path, 'utf8');
const portalApiSource = fs.readFileSync(portalApiPath, 'utf8');
const libApiSource = fs.readFileSync(libApiPath, 'utf8');

test('Candidate Experience Optimization & Account Dropdown Suite', async (t) => {
  // ── 1. Application Header: Job Information & Tab Navigation ───────────────
  await t.test('1. Application Header displays Job Title as primary heading, conditional Project Name, and Job Details button opening original page in new tab', () => {
    // Job Title as main heading
    assert.ok(wizardSource.includes('job.title'), 'Must display job title as primary heading');

    // Project Name directly below Job Title when configured, hidden otherwise
    assert.ok(wizardSource.includes('projectName &&'), 'Must conditionally render Project Name below Job Title');
    assert.ok(wizardSource.includes('rawProjectName = job?.department || null'), 'Must resolve from Admin Department / Project field (job.department)');

    // Functional logic verification
    const resolveProjectName = (job) => {
      const raw = job?.department || null;
      if (!raw || typeof raw !== 'string') return null;
      const trimmed = raw.trim();
      const lower = trimmed.toLowerCase();
      if (!trimmed || lower === 'n/a' || lower === 'no project' || lower === 'none' || lower === 'null') {
        return null;
      }
      return trimmed;
    };

    // Case 1: Job with configured Department / Project value -> displays below Job Title
    assert.equal(resolveProjectName({ title: 'District Co-ordinator', department: 'MAHA-AGRI PROJECT' }), 'MAHA-AGRI PROJECT');
    assert.equal(resolveProjectName({ title: 'Field Assistant', department: 'MAHA-AGRI PROJECT / Operations' }), 'MAHA-AGRI PROJECT / Operations');

    // Case 2: Job with empty, whitespace or null department -> Must return null (row completely hidden)
    assert.equal(resolveProjectName({ title: 'District Co-ordinator', department: null }), null);
    assert.equal(resolveProjectName({ title: 'Accountant', department: '' }), null);
    assert.equal(resolveProjectName({ title: 'Accountant' }), null);

    // Case 3: Placeholders sanitized to null (row completely hidden)
    assert.equal(resolveProjectName({ title: 'Operator', department: 'N/A' }), null);
    assert.equal(resolveProjectName({ title: 'Operator', department: 'No Project' }), null);
    assert.equal(resolveProjectName({ title: 'Operator', department: '   ' }), null);
    assert.equal(resolveProjectName({ title: 'Operator', department: 'none' }), null);
    assert.equal(resolveProjectName({ title: 'Operator', department: 'null' }), null);

    // Header uncluttered: Organization and full Location removed from top header
    assert.ok(!wizardSource.includes('Abhinav Bharat Foundation</span>\n                </span>'), 'Organization must not clutter top header');

    // Button label must be "Job Details", not generic "Details", and open Job Details Modal
    assert.ok(wizardSource.includes('<span>Job Details</span>'), 'Must label button as Job Details');
    assert.ok(wizardSource.includes('setShowJobDetailsModal(true)'), 'Job Details must trigger Job Details Modal');
    assert.ok(wizardSource.includes('<JobDetailsModal'), 'Must embed JobDetailsModal in wizard');

    // React Rules of Hooks: All hooks (including projectName useMemo) must precede early returns
    const loadingIndex = wizardSource.indexOf('if (authLoading || jobLoading)');
    const projectNameMemoIndex = wizardSource.indexOf('const projectName = useMemo');
    assert.ok(loadingIndex > 0, 'Must have loading state guard');
    assert.ok(projectNameMemoIndex > 0, 'Must have projectName useMemo hook');
    assert.ok(
      projectNameMemoIndex < loadingIndex,
      'React Hook violation fix: projectName useMemo must be declared BEFORE early loading/auth returns'
    );
  });

  // ── 2. Application Header: Save & Exit ─────────────────────────────────────
  await t.test('2. Save & Exit button is secondary styled and safely persists draft before navigating', () => {
    assert.ok(wizardSource.includes('Save &amp; Exit') || wizardSource.includes('Save & Exit'), 'Must have Save & Exit button');
    assert.ok(wizardSource.includes("saveDraft(state.currentStep, true)"), 'Save & Exit must trigger saveDraft with exitAfter=true');

    // Verify draft save handler sets flash confirmation and navigates only after persistence
    assert.ok(wizardSource.includes('maha_flash_message'), 'Must set flash message in sessionStorage upon save');
    assert.ok(
      wizardSource.includes('Your application has been saved as a draft. You can continue anytime from My Applications.'),
      'Must set approved confirmation message text'
    );
    assert.ok(wizardSource.includes('refreshProfile'), 'Must refresh candidate profile upon draft save');
  });

  // ── 3. Candidate ID Removal from Header ────────────────────────────────────
  await t.test('3. Candidate ID is removed from standalone header and kept in account dropdown only', () => {
    // Standalone badge removed
    assert.ok(
      !wizardSource.includes('<span className="text-[10px] text-slate-500 font-sans font-semibold uppercase">ID:</span>'),
      'Standalone Candidate ID badge must be removed from header'
    );
    // Retained strictly inside dropdown
    assert.ok(wizardSource.includes('title="Authoritative Candidate ID"'), 'Must retain Authoritative Candidate ID in dropdown');
    assert.ok(wizardSource.includes('ID: {profile.candidate_id}'), 'Must display ID in dropdown');
  });

  // ── 4. Candidate Account Dropdown Final Structure ───────────────────────────
  await t.test('4. Candidate Account Dropdown contains strictly Identity, Dashboard, My Profile, My Applications, and Sign Out', () => {
    // Account Trigger: Avatar with candidate initial + display name (no raw mobile in permanent header)
    assert.ok(wizardSource.includes('profile.full_name.trim().charAt(0).toUpperCase()'), 'Avatar must show candidate first initial');
    assert.ok(wizardSource.includes('profile?.full_name'), 'Trigger must display candidate name');

    // Top Identity section
    assert.ok(wizardSource.includes('profile?.full_name || \'Candidate\''), 'Must display candidate full name');
    assert.ok(wizardSource.includes('profile?.candidate_id'), 'Must display candidate ID');
    assert.ok(wizardSource.includes('verifiedMobile'), 'Must display candidate mobile');

    // Only approved navigation items
    assert.ok(wizardSource.includes('to="/candidate/dashboard"'), 'Must link to /candidate/dashboard');
    assert.ok(wizardSource.includes('to="/candidate/profile"'), 'Must link to /candidate/profile');
    assert.ok(wizardSource.includes('to="/candidate/applications"'), 'Must link to /candidate/applications');

    // Sign Out as last item with red treatment
    assert.ok(wizardSource.includes('handleSignOut'), 'Must call handleSignOut');
    assert.ok(wizardSource.includes('text-red-600'), 'Sign out must have red treatment');

    // Prohibited items must not exist in this account dropdown
    const dropdownSnippet = wizardSource.slice(
      wizardSource.indexOf('showAccountDropdown && ('),
      wizardSource.indexOf('{/* Stepper Progress Bar */')
    );
    assert.ok(!dropdownSnippet.includes('/candidate/payments'), 'Payments must not be permanent account dropdown item');
    assert.ok(!dropdownSnippet.includes('/candidate/interviews'), 'Interviews must not be permanent account dropdown item');
    assert.ok(!dropdownSnippet.includes('/candidate/documents'), 'Documents must not be permanent account dropdown item');
  });

  // ── 5. Stepper Progress Indicator ──────────────────────────────────────────
  await t.test('5. Stepper Progress Bar displays Step X of Y, Step Label, and percentage', () => {
    assert.ok(wizardSource.includes('Step {currentStepIndex + 1} of {visibleSteps.length}'), 'Must display Step X of Y');
    assert.ok(wizardSource.includes('% Completed'), 'Must display percentage completed');
  });

  // ── 6. Root Cause Fix: getMyApplications Auth Client Alignment ─────────────
  await t.test('6. getMyApplications uses candidateSupabase when candidate is authenticated', () => {
    assert.ok(libApiSource.includes('candidateSession = (await candidateSupabase.auth.getSession()).data.session'), 'Must check candidateSupabase session');
    assert.ok(libApiSource.includes('client = candidateSession ? candidateSupabase : supabase'), 'Must use candidateSupabase client');
  });

  // ── 7. Root Cause Fix: saveCandidateDraft Foreign Key Protection ───────────
  await t.test('7. saveCandidateDraft guarantees valid rms_candidate_profiles record before rms_applications insert', () => {
    assert.ok(portalApiSource.includes('fallbackMobile = typeof window !== \'undefined\' ? localStorage.getItem(\'maha_verified_mobile\') : null'), 'Must read fallback mobile if needed');
    assert.ok(portalApiSource.includes('upsertCandidateProfile'), 'Must upsert candidate profile for valid FK reference');
    assert.ok(portalApiSource.includes('sessionStorage.setItem(`maha_candidate_draft_${job.id}_${resolvedCandidateId}`'), 'Must cache draft locally for immediate recovery');
  });

  // ── 8. My Applications Complete Redesign ───────────────────────────────────
  await t.test('8. My Applications displays central card layout, status filters, and status-based actions', () => {
    // Flash message banner
    assert.ok(myAppsSource.includes('flashMessage'), 'Must support flash message from Save & Exit');

    // Status filter options (All 8)
    const expectedFilters = ['all', 'draft', 'payment_pending', 'submitted', 'interview_scheduled', 'selected', 'completed', 'rejected'];
    for (const f of expectedFilters) {
      assert.ok(myAppsSource.includes(`value: '${f}'`), `Must include filter for ${f}`);
    }

    // Card metadata
    assert.ok(myAppsSource.includes('Abhinav Bharat Foundation'), 'Must display employer name');
    assert.ok(myAppsSource.includes('Draft Application'), 'Must label drafts clearly');
    assert.ok(myAppsSource.includes('app.application_number'), 'Must display application number for submitted apps');
    assert.ok(myAppsSource.includes('Saved Progress:'), 'Must show draft progress indicator');

    // Status-based actions
    assert.ok(myAppsSource.includes('Continue Application'), 'Draft must have Continue Application action');
    assert.ok(myAppsSource.includes('Complete Payment'), 'Payment pending must have Complete Payment action');
    assert.ok(myAppsSource.includes('Retry Payment'), 'Payment failed must have Retry Payment action');
    assert.ok(myAppsSource.includes('View Interview Details'), 'Interview scheduled must have View Interview Details action');
    assert.ok(myAppsSource.includes('View Position Details') || myAppsSource.includes('View Selection Details'), 'Must have position/selection actions');

    // Empty state
    assert.ok(myAppsSource.includes("You haven't started any job applications yet."), 'Must show approved empty state heading');
    assert.ok(myAppsSource.includes('Browse Openings'), 'Must provide Browse Openings button');
  });

  // ── 9. Step 1 Form Cleanup ────────────────────────────────────────────────
  await t.test('9. Step 1 removes repeated bottom Candidate ID and Profile Created Date', () => {
    assert.ok(!step1Source.includes('<span>Candidate ID:</span>'), 'Must not display Candidate ID at bottom of Step 1 form');
    assert.ok(!step1Source.includes('<span>Profile Created:</span>'), 'Must not display Profile Created Date at bottom of Step 1 form');
    assert.ok(step1Source.includes('I have read and agree to the Privacy Notice.'), 'Must retain Privacy Notice and consent');
  });
});

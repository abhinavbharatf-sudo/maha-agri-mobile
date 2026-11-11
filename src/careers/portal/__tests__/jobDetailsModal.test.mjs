import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const modalPath = path.resolve(__dirname, '../JobDetailsModal.tsx');
const wizardPath = path.resolve(__dirname, '../CandidateApplyWizard.tsx');
const jobDetailPath = path.resolve(__dirname, '../../pages/JobDetail.tsx');
const sharedContentPath = path.resolve(__dirname, '../../components/JobDetailContent.tsx');

const modalSource = fs.readFileSync(modalPath, 'utf8');
const wizardSource = fs.readFileSync(wizardPath, 'utf8');
const jobDetailSource = fs.readFileSync(jobDetailPath, 'utf8');
const sharedContentSource = fs.readFileSync(sharedContentPath, 'utf8');

test('MAHA-AGRI Careers – Single Source of Truth & Job Details Modal Suite', async (t) => {

  // ── 1. Modal Trigger Integration & State Preservation ────────────────────────
  await t.test('1. Candidate Application Wizard integrates Job Details Modal without resetting state', () => {
    // Button exists and triggers modal
    assert.ok(wizardSource.includes('<span>Job Details</span>'), 'Must have Job Details button label');
    assert.ok(wizardSource.includes('setShowJobDetailsModal(true)'), 'Clicking Job Details must open modal');

    // JobDetailsModal is imported and rendered with job prop
    assert.ok(wizardSource.includes('import JobDetailsModal from \'./JobDetailsModal\';'), 'Must import JobDetailsModal');
    assert.ok(wizardSource.includes('<JobDetailsModal'), 'Must render JobDetailsModal');
    assert.ok(wizardSource.includes('isOpen={showJobDetailsModal}'), 'Must bind isOpen to modal state');
    assert.ok(wizardSource.includes('onClose={() => setShowJobDetailsModal(false)}'), 'Must bind onClose to close modal');

    // Modal state does not touch application state, draft IDs, or submission logic
    assert.ok(wizardSource.includes('const [showJobDetailsModal, setShowJobDetailsModal] = useState(false);'), 'Modal state is isolated boolean');
  });

  // ── 2. Single Source of Truth Architecture ───────────────────────────────────
  await t.test('2. Single Source of Truth: JobDetail.tsx and JobDetailsModal.tsx share JobDetailContent', () => {
    // Both files must import JobDetailContent
    assert.ok(jobDetailSource.includes('import JobDetailContent from \'../components/JobDetailContent\';'), 'JobDetail must import JobDetailContent');
    assert.ok(modalSource.includes('import JobDetailContent from \'../components/JobDetailContent\';'), 'JobDetailsModal must import JobDetailContent');

    // JobDetail uses mode="page"
    assert.ok(jobDetailSource.includes('<JobDetailContent'), 'JobDetail must render JobDetailContent');
    assert.ok(jobDetailSource.includes('mode="page"'), 'JobDetail must pass mode="page"');

    // JobDetailsModal uses mode="modal"
    assert.ok(modalSource.includes('<JobDetailContent'), 'JobDetailsModal must render JobDetailContent');
    assert.ok(modalSource.includes('mode="modal"'), 'JobDetailsModal must pass mode="modal"');
  });

  // ── 3. Accordions Default Collapse All & Global Control ─────────────────────
  await t.test('3. Position Specifications accordions are all collapsed by default with Expand All / Collapse All toggle', () => {
    // Initial state must have all 6 sections false (collapsed)
    assert.ok(
      sharedContentSource.includes('overview: false') &&
      sharedContentSource.includes('responsibilities: false') &&
      sharedContentSource.includes('eligibility: false') &&
      sharedContentSource.includes('experience: false') &&
      sharedContentSource.includes('documents: false') &&
      sharedContentSource.includes('process: false'),
      'All 6 specification sections must be collapsed by default'
    );

    // Global toggle label dynamically switches between Expand All and Collapse All
    assert.ok(
      sharedContentSource.includes("{allExpanded ? 'Collapse All' : 'Expand All'}"),
      'Control label must be Expand All when collapsed and Collapse All when expanded'
    );

    // expandAll and collapseAll functions exist
    assert.ok(sharedContentSource.includes('expandAll'), 'Must provide expandAll function');
    assert.ok(sharedContentSource.includes('collapseAll'), 'Must provide collapseAll function');
    assert.ok(sharedContentSource.includes('toggleSection'), 'Must provide individual toggleSection function');
  });

  // ── 4. Quota Scope Display & Mutual Exclusivity (Per District vs Per Taluka) ─
  await t.test('4. Application Summary isolates Quota Scope: Taluka-Level vs District-Level mutual exclusivity', () => {
    // isDistrictLevel calculation checks both vacancy_level and posting_level
    assert.ok(
      sharedContentSource.includes('isDistrictLevel') &&
      sharedContentSource.includes("job.vacancy_level === 'district'") &&
      sharedContentSource.includes("job.vacancy_allocations?.vacancy_level === 'district'"),
      'Must resolve isDistrictLevel from authoritative job and vacancy_allocations config'
    );

    // Quota Scope row label
    assert.ok(
      sharedContentSource.includes("value={isDistrictLevel ? 'District-Level Quota' : 'Taluka-Level Quota'}"),
      'Must display District-Level Quota or Taluka-Level Quota based on configured scope'
    );

    // Per District must be conditioned on isDistrictLevel
    assert.ok(
      sharedContentSource.includes('{isDistrictLevel && job.vacancies_per_district != null && job.vacancies_per_district > 0 && ('),
      'Per District row must ONLY appear when isDistrictLevel is true'
    );

    // Per Taluka must be conditioned on !isDistrictLevel
    assert.ok(
      sharedContentSource.includes('{!isDistrictLevel && job.vacancies_per_taluka != null && job.vacancies_per_taluka > 0 && ('),
      'Per Taluka row must ONLY appear when isDistrictLevel is false'
    );
  });

  // ── 5. End-to-End Application Summary Data Audit (15 Core Fields) ───────────
  await t.test('5. Application Summary renders all 15 authoritative saved fields from Admin Job Posting', () => {
    // 1. Application Fee
    assert.ok(sharedContentSource.includes('label="Application Fee"'), '1. Application Fee');
    // 2. Employment Type
    assert.ok(sharedContentSource.includes('label="Employment Type"'), '2. Employment Type');
    // 3. Experience Required
    assert.ok(sharedContentSource.includes('label="Experience Required"'), '3. Experience Required');
    // 4. Qualification
    assert.ok(sharedContentSource.includes('label="Qualification"'), '4. Qualification');
    // 5. Age Criteria
    assert.ok(sharedContentSource.includes('label="Age Criteria"'), '5. Age Criteria');
    // 6. Total Vacancies
    assert.ok(sharedContentSource.includes('label="Total Vacancies"'), '6. Total Vacancies');
    // 7. Quota Scope
    assert.ok(sharedContentSource.includes('label="Quota Scope"'), '7. Quota Scope');
    // 8. Per District Vacancies
    assert.ok(sharedContentSource.includes('label="Per District"'), '8. Per District');
    // 9. Per Taluka Vacancies
    assert.ok(sharedContentSource.includes('label="Per Taluka"'), '9. Per Taluka');
    // 10. Salary / Remuneration
    assert.ok(sharedContentSource.includes('label="Salary / Remuneration"'), '10. Salary / Remuneration');
    // 11. Salary Package
    assert.ok(sharedContentSource.includes('label="Salary Package"'), '11. Salary Package');
    // 12. Recruitment Mode
    assert.ok(sharedContentSource.includes('label="Recruitment Mode"'), '12. Recruitment Mode');
    // 13. Selection Mode
    assert.ok(sharedContentSource.includes('label="Selection Mode"'), '13. Selection Mode');
    // 14. Application Deadline
    assert.ok(sharedContentSource.includes('Last Date:'), '14. Application Deadline');
    // 15. Application Availability Status
    assert.ok(sharedContentSource.includes('cStatus.label'), '15. Application Availability Status');
  });

  // ── 6. Sticky Footer Buttons & Form State Preservation ───────────────────────
  await t.test('6. Modal has sticky footer with Close and Continue Application preserving form state', () => {
    assert.ok(modalSource.includes('sticky bottom-0'), 'Footer must be sticky at bottom');
    assert.ok(/>\s*Close\s*<\/button>/.test(modalSource), 'Must have Close button');
    assert.ok(/>\s*Continue Application\s*<\/button>/.test(modalSource), 'Must have Continue Application button');

    // Both buttons cleanly dismiss the modal without resetting form data
    assert.ok(modalSource.includes('handleContinue'), 'Must have handleContinue method');
    assert.ok(!modalSource.includes('submitCandidateApplication'), 'Modal must never trigger application submission');
    assert.ok(!modalSource.includes('INITIAL_WIZARD_STATE'), 'Modal must never reset wizard state');
  });

  // ── 7. UI/UX Responsiveness & Accessibility ──────────────────────────────────
  await t.test('7. Modal is responsive (large viewport desktop, full mobile) and accessible', () => {
    // Viewport sizing
    assert.ok(modalSource.includes('max-w-6xl'), 'Must use large container max-w-6xl on desktop');
    assert.ok(modalSource.includes('max-h-[90vh]'), 'Must restrict max height to 90vh');
    assert.ok(modalSource.includes('overflow-y-auto'), 'Body must scroll independently');

    // Accessibility
    assert.ok(modalSource.includes('role="dialog"'), 'Must have role=dialog');
    assert.ok(modalSource.includes('aria-modal="true"'), 'Must have aria-modal=true');
    assert.ok(modalSource.includes('aria-labelledby'), 'Must have aria-labelledby');
    assert.ok(modalSource.includes('Escape'), 'Must support Escape key to close');
    assert.ok(modalSource.includes('document.body.style.overflow'), 'Must lock background scrolling when open');
  });

});

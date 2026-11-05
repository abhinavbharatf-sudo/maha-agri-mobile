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

const modalSource = fs.readFileSync(modalPath, 'utf8');
const wizardSource = fs.readFileSync(wizardPath, 'utf8');
const jobDetailSource = fs.readFileSync(jobDetailPath, 'utf8');

test('MAHA-AGRI Careers – Job Details Modal Suite', async (t) => {

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

    // No target="_blank" on the application header Job Details button
    assert.ok(
      !wizardSource.includes('href={job.slug ? `/careers/jobs/${job.slug}` : `/careers/jobs/${job.id}`}\n                target="_blank"'),
      'Must not open new browser tab'
    );

    // Modal state does not touch application state, draft IDs, or submission logic
    assert.ok(wizardSource.includes('const [showJobDetailsModal, setShowJobDetailsModal] = useState(false);'), 'Modal state is isolated boolean');
  });

  // ── 2. Modal Structure: Section A (Job Information) ──────────────────────────
  await t.test('2. Section A displays complete relevant job information reusing Career Job Details logic', () => {
    // Header information
    assert.ok(modalSource.includes('job.title'), 'Must display Job Title');
    assert.ok(modalSource.includes('job.department'), 'Must display Department / Project');
    assert.ok(modalSource.includes('cStatus.label'), 'Must display Application / Position Status');

    // Section 1: Overview & Districts
    assert.ok(modalSource.includes('1. Job Overview &amp; District Allocations') || modalSource.includes('1. Job Overview & District Allocations'), 'Must have Section 1 Overview');
    assert.ok(modalSource.includes('job.project_overview'), 'Must display Project Overview');
    assert.ok(modalSource.includes('job.location_districts'), 'Must display Eligible Posting Locations');
    assert.ok(modalSource.includes('job.project_pdf_url'), 'Must support Project Blueprint PDF');
    assert.ok(modalSource.includes('job.project_video_url'), 'Must support Project Video');

    // Section 2: Roles & Responsibilities
    assert.ok(modalSource.includes('2. Roles &amp; Responsibilities') || modalSource.includes('2. Roles & Responsibilities'), 'Must have Section 2 Roles & Responsibilities');
    assert.ok(modalSource.includes('job.description'), 'Must display Job Description');
    assert.ok(modalSource.includes('job.jd_pdf_url'), 'Must support Official JD PDF');

    // Section 3: Eligibility & Qualifications
    assert.ok(modalSource.includes('3. Eligibility &amp; Qualifications') || modalSource.includes('3. Eligibility & Qualifications'), 'Must have Section 3 Eligibility');
    assert.ok(modalSource.includes('job.eligibility_criteria'), 'Must display Eligibility Criteria');
    assert.ok(modalSource.includes('job.skills_required'), 'Must display Recommended Skills');

    // Section 4: Experience & Work Profile
    assert.ok(modalSource.includes('4. Experience &amp; Work Profile') || modalSource.includes('4. Experience & Work Profile'), 'Must have Section 4 Experience');
    assert.ok(modalSource.includes('job.experience_required'), 'Must display Required Experience');
    assert.ok(modalSource.includes('ageCriteria'), 'Must display Age Range');

    // Section 5: Documents Required
    assert.ok(modalSource.includes('5. Documents Required'), 'Must have Section 5 Documents Required');
    assert.ok(modalSource.includes('job.required_documents'), 'Must display Documents Required');

    // Section 6: Recruitment Process & FAQs
    assert.ok(modalSource.includes('6. Recruitment Process &amp; FAQs') || modalSource.includes('6. Recruitment Process & FAQs'), 'Must have Section 6 Recruitment Process & FAQs');
    assert.ok(modalSource.includes('activeSteps'), 'Must display Recruitment Roadmap');
    assert.ok(modalSource.includes('activeFaqs'), 'Must display FAQs accordion');

    // Highlights strip removed to avoid duplicate information
    assert.ok(
      !modalSource.includes('grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3'),
      'Top highlights strip must be removed to prevent duplicate display of salary, vacancies, and fee'
    );
  });

  // ── 3. Modal Structure: Section B (Application Summary) ──────────────────────
  await t.test('3. Section B reuses exact concept, fields, and presentation of Career Job Details Application Summary', () => {
    assert.ok(modalSource.includes('Section B: Application Summary'), 'Must identify Section B Application Summary');
    assert.ok(modalSource.includes('SidebarRow'), 'Must reuse SidebarRow component structure');

    // Right column must be sticky inside scrollable modal body
    assert.ok(
      modalSource.includes('lg:sticky lg:top-0'),
      'Application Summary card must be sticky within modal content area'
    );

    // Application availability status logic (Open for Applications vs administrative status)
    assert.ok(modalSource.includes('candidateStatus'), 'Must compute candidate application availability status');
    assert.ok(modalSource.includes('Open for Applications'), 'Must display Open for Applications when accepting applications');

    // Candidate instructions card fills empty visual area
    assert.ok(
      modalSource.includes('Candidate Instructions &amp; Security') || modalSource.includes('Candidate Instructions & Security'),
      'Must render security and guidance card to balance visual height of right column'
    );

    // Required fields in Application Summary
    assert.ok(modalSource.includes('Application Fee'), 'Must display Application Fee');
    assert.ok(modalSource.includes('Employment Type'), 'Must display Employment Type');
    assert.ok(modalSource.includes('Experience Required'), 'Must display Experience Required');
    assert.ok(modalSource.includes('Qualification'), 'Must display Qualification');
    assert.ok(modalSource.includes('Age Criteria'), 'Must display Age Criteria');
    assert.ok(modalSource.includes('Total Vacancies'), 'Must display Total Vacancies');
    assert.ok(modalSource.includes('Quota Scope'), 'Must display Quota Scope');
    assert.ok(modalSource.includes('Per District'), 'Must display Per District Vacancies');
    assert.ok(modalSource.includes('Per Taluka'), 'Must display Per Taluka Vacancies');
    assert.ok(modalSource.includes('Salary / Remuneration'), 'Must display Salary / Remuneration');
    assert.ok(modalSource.includes('Salary Package'), 'Must display Salary Package');
    assert.ok(modalSource.includes('Selection Mode'), 'Must display Selection Mode');
    assert.ok(modalSource.includes('Last Date:'), 'Must display Deadline Notice');

    // Must NOT have Apply Now inside modal
    assert.ok(!modalSource.includes('>Apply Now<'), 'Must not display Apply Now button inside modal');
    assert.ok(!modalSource.includes('handleApply'), 'Must not include apply action handler inside modal');
  });

  // ── 4. Sticky Footer Buttons ─────────────────────────────────────────────────
  await t.test('4. Modal has sticky footer with Close and Continue Application buttons', () => {
    assert.ok(modalSource.includes('sticky bottom-0'), 'Footer must be sticky at bottom');
    assert.ok(/>\s*Close\s*<\/button>/.test(modalSource), 'Must have Close button');
    assert.ok(/>\s*Continue Application\s*<\/button>/.test(modalSource), 'Must have Continue Application button');

    // Both buttons cleanly dismiss the modal without resetting form data
    const closeMatches = modalSource.match(/onClick=\{onClose\}/g);
    assert.ok(closeMatches && closeMatches.length >= 2, 'Footer buttons must wire to onClose');
  });

  // ── 5. UI/UX Responsiveness & Accessibility ──────────────────────────────────
  await t.test('5. Modal is responsive (85-90% viewport desktop, full mobile) and accessible', () => {
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

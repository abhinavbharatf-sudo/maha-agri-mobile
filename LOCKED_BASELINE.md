# MAHA-AGRI Candidate Portal — Locked Baseline & Frozen Specifications

**Status:** APPROVED, LOCKED & FROZEN  
**Baseline Date:** 04 November 2026  
**System:** MAHA-AGRI Government Digital Operations Platform  

---

## 1. Locked Modules & Business Requirements

### A. Educational Qualifications
1. **Automatic Highest Qualification:**
   * Manual "Set as Primary" button is **permanently removed**.
   * The candidate's highest credential is automatically computed based on the qualification master hierarchy: `Post Graduate (60) > Graduate (50) > Diploma (40) > ITI (30) > HSC (20) > SSC (10)`.
   * Ties within the same level are automatically resolved by the latest passing year.
   * Recalculated dynamically upon adding, editing, or deleting any qualification entry.
2. **Full Visibility across HR Dashboard & PDF:**
   * HR Administrators must view **ALL** education qualifications submitted by the candidate (Level, Degree/Stream, Passing Year, Percentage / CGPA).
   * Highest qualification is clearly badged/highlighted with an emerald tag. Other qualifications are never hidden.
   * Application Review ([`Step3ReviewSubmit.tsx`](file:///e:/project-bolt-sb1-qsboyjjv/project/src/careers/portal/steps/Step3ReviewSubmit.tsx)) and Confirmation ([`Step4Confirmation.tsx`](file:///e:/project-bolt-sb1-qsboyjjv/project/src/careers/portal/steps/Step4Confirmation.tsx)) retain all submitted qualifications.

---

### B. Aadhaar Number Formatting & Security
1. **Masked & Formatted Display:**
   * Formatted automatically into `NNNN-NNNN-NNNN` (hyphen after every 4 digits) as candidate types or pastes.
   * `maxLength={14}` on inputs to accommodate 12 digits and 2 hyphens.
2. **State & Backend Data Integrity:**
   * Form state (`data.aadhaarNumber`) and all backend submissions store **only clean 12 digits without hyphens**.
   * Duplicate check and Verhoeff checksum algorithms validate against clean digits.
3. **Candidate-Friendly UI:**
   * Technical implementation jargon (`Verhoeff verified`, `keyed-HMAC`, `Verhoeff checksum validation failed`) is permanently removed from user-facing screens.
   * Validation error message: `"Please enter a valid 12-digit Indian Aadhaar number."`.
   * Hint text: `"Enter your 12-digit Indian Aadhaar number."`.
   * Show/hide password eye icon toggle preserved.

---

### C. Experience Details & Alignment
1. **Horizontal Alignment & Consistent Layout:**
   * Four-column layout in Step 2: `Start Date`, `End Date`, `Calculated Duration`, and `Experience Certificate Available`.
   * Standardized header label row (`h-7 flex items-end mb-1`) and input height (`h-[38px]`).
   * "Currently Working" checkbox is positioned directly below the End Date input (`mt-1.5 flex items-center`) without skewing the vertical alignment of sibling fields.
2. **Future End Date Prevention:**
   * Date pickers use `max={getLocalTodayIso()}`.
   * Both inline typing/selection and final form submission enforce:
     * Future End Date: `"End Date cannot be in the future."`.
     * End Date earlier than Start Date: `"End Date cannot be earlier than Start Date."`.
     * Today's date and past dates in IST are valid and accepted.
3. **Currently Working Behavior:**
   * When checked: End Date input is disabled and displays a read-only "Present" field with an "Ongoing" badge and pulsating green dot. Experience duration calculates automatically from `startDate` up to today.
   * When unchecked: End Date input is enabled. If End Date is empty, duration displays `--` instead of `0Y 0M 0D`. Duration calculates only when both valid Start Date and End Date exist.
4. **Experience Certificate Default:**
   * Every new experience card defaults to `"No - Not Available"` (`hasCertificate: 'no'`).
   * Dropdown lists `"No - Not Available"` first.
   * When editing existing applications, previously saved selections are strictly preserved.
5. **Multiple Records & Non-Overlapping Merging:**
   * "Add Another Experience" activates only when the newest card is valid.
   * Total Experience Banner calculates merged non-overlapping intervals and displays in `X Years Y Months Z Days`.
   * HR Dashboard and Application Review/PDF display all declared experiences.

---

### D. India Local Date Handling (IST / UTC+5:30)
1. **Prevention of Timezone Skew:**
   * All date validation and `max` constraints use `getLocalTodayIso()` derived from local system components (`getFullYear()`, `getMonth() + 1`, `getDate()`).
   * `new Date().toISOString().split('T')[0]` is **prohibited** for UI date limits and validation because it causes a 1-day mismatch during early morning and late night IST hours.
2. **Local String Parsing in Calculations:**
   * `calculateDuration` and `calculateMergedTotalExperience` in [`verhoeff.ts`](file:///e:/project-bolt-sb1-qsboyjjv/project/src/careers/portal/utils/verhoeff.ts) parse `YYYY-MM-DD` strings as `new Date(year, month - 1, day)` to anchor comparisons strictly at local midnight.

---

### E. Candidate Master Profile Unification
1. **Single Source of Truth:**
   * Legacy `MyProfile.tsx` is completely unified with the Application Wizard profile experience.
   * Candidate Dashboard > My Profile reuses [`Step1CreateProfile.tsx`](file:///e:/project-bolt-sb1-qsboyjjv/project/src/careers/portal/steps/Step1CreateProfile.tsx) and [`Step2MasterProfile.tsx`](file:///e:/project-bolt-sb1-qsboyjjv/project/src/careers/portal/steps/Step2MasterProfile.tsx) in standalone mode without requiring an active job or application.
   * Reads and writes to master `rms_candidate_profiles` table.
2. **Dual Address Architecture:**
   * Current Residential Address (`address_line1`, `district`, `taluka`, `pincode`) and Permanent Residential Address (`permanent_address_line1`, `permanent_district`, `permanent_taluka`, `permanent_pincode`) are explicitly managed and persisted.
   * "Permanent Address Same as Current Address" toggle synchronizes addresses in real time when checked, and allows independent editing when unchecked.
3. **Demographic & Mobile Harmonization:**
   * `caste_category` persisted into master profile.
   * `alternate_mobile` and `emergency_mobile` harmonized.
   * Existing submitted application snapshots remain immutable.

---

### F. Job-Specific Posting Preferences & Navigation
1. **Explicit Posting Location Selection:**
   * Candidate native residential district/taluka is **not** automatically pre-selected as preferred posting location.
   * District-wise jobs present only the District dropdown with initial placeholder `-- Select Preferred District --`.
   * Taluka-wise jobs present dependent Taluka dropdown with initial placeholder `-- Select District First --`, resetting Taluka selection on District changes.
2. **Dynamic Step Navigation:**
   * Navigation button dynamically switches based on job assessment questionnaire configuration:
     * With published questionnaire: `"Continue to Job-Specific Questions →"`
     * Without published questionnaire: `"Continue to Review & Declaration →"`

---

### G. Strict PIN Code Security & Validation
1. **English Numerals Only (0–9) & 6-Digit Limit:**
   * Keystrokes for non-digits blocked on desktop; DOM-level sanitization forcibly strips invalid characters on mobile and IME.
   * Maximum 6 digits strictly enforced via `maxLength={6}` and input bounds.
2. **Marathi Digits (`०-९`) Rejection:**
   * Explicit bilingual error: `"फक्त इंग्रजी अंक (0–9) ग्राह्य आहेत. मराठी अंक स्वीकारले जाणार नाहीत. (Only English digits 0–9 allowed)"`.
   * Marathi digits stripped and never committed to state or database.
3. **Mixed-Content Paste Protection:**
   * Pasting mixed content (e.g. `12ABC345`, `४११०२८`, `411 001`, `4110019`) is completely rejected via `e.preventDefault()`.
   * Does **not** silently accept partial digits; completely preserves previous input value.
4. **Indian Postal Code Conformance:**
   * Validated against regex `/^[1-9][0-9]{5}$/` (first digit cannot be 0). Required on final form submission.

---

## 2. Frozen Source Files

The following files contain the approved baseline implementation and must NOT be altered without explicit authorization:

| Module / Scope | File Path |
|---|---|
| **Portal Data Types & Initial State** | [`project/src/careers/portal/types.ts`](file:///e:/project-bolt-sb1-qsboyjjv/project/src/careers/portal/types.ts) |
| **Aadhaar, Date & Duration Utilities** | [`project/src/careers/portal/utils/verhoeff.ts`](file:///e:/project-bolt-sb1-qsboyjjv/project/src/careers/portal/utils/verhoeff.ts) |
| **Step 1: Create Profile (Identity & Contact)** | [`project/src/careers/portal/steps/Step1CreateProfile.tsx`](file:///e:/project-bolt-sb1-qsboyjjv/project/src/careers/portal/steps/Step1CreateProfile.tsx) |
| **Step 2: Basic Information (Master Profile)** | [`project/src/careers/portal/steps/Step2MasterProfile.tsx`](file:///e:/project-bolt-sb1-qsboyjjv/project/src/careers/portal/steps/Step2MasterProfile.tsx) |
| **Dashboard Master Profile Manager** | [`project/src/careers/dashboard/MyProfile.tsx`](file:///e:/project-bolt-sb1-qsboyjjv/project/src/careers/dashboard/MyProfile.tsx) |
| **Step 3: Position Details (Preferences, Edu & Exp)** | [`project/src/careers/portal/steps/Step2JobSpecific.tsx`](file:///e:/project-bolt-sb1-qsboyjjv/project/src/careers/portal/steps/Step2JobSpecific.tsx) |
| **Step 4: Dynamic Job Questionnaire** | [`project/src/careers/portal/steps/Step4Questionnaire.tsx`](file:///e:/project-bolt-sb1-qsboyjjv/project/src/careers/portal/steps/Step4Questionnaire.tsx) |
| **Candidate Portal Review & Submit** | [`project/src/careers/portal/steps/Step3ReviewSubmit.tsx`](file:///e:/project-bolt-sb1-qsboyjjv/project/src/careers/portal/steps/Step3ReviewSubmit.tsx) |
| **Candidate Portal Confirmation & PDF** | [`project/src/careers/portal/steps/Step4Confirmation.tsx`](file:///e:/project-bolt-sb1-qsboyjjv/project/src/careers/portal/steps/Step4Confirmation.tsx) |
| **HR Dashboard Application Review** | [`project/src/careers/admin/HRApplications.tsx`](file:///e:/project-bolt-sb1-qsboyjjv/project/src/careers/admin/HRApplications.tsx) |
| **HR Candidate Profile Modal** | [`project/src/careers/admin/HRCandidateProfile.tsx`](file:///e:/project-bolt-sb1-qsboyjjv/project/src/careers/admin/HRCandidateProfile.tsx) |
| **Single-Page Application Form** | [`project/src/careers/pages/Apply.tsx`](file:///e:/project-bolt-sb1-qsboyjjv/project/src/careers/pages/Apply.tsx) |

---

## 3. Automated Test Suite Baseline

The automated test suites in `project/src/careers/portal/__tests__/` enforce this baseline:

* **Suite 1:** `repeatableStep2.test.mjs` (30 tests: Highest qualification hierarchy, Course/Stream options, Percentage/CGPA validation, Experience duration, UI alignment, IST date handling).
* **Suite 2:** `candidateMasterProfileStep.test.mjs` (27 tests: Profile creation, DOB/Age validation, duplicate prevention, Aadhaar Verhoeff checksum).
* **Suite 3:** `profileEnhancements.test.mjs` (15 tests: Aadhaar auto-hyphen formatter, age calculation, address/PIN validation, non-overlapping work experience summing).
* **Suite 4:** `pincodeStrictValidation.test.mjs` (14 tests: 6-digit English restriction, Marathi digit rejection, mixed-content paste protection, 0-start rejection).
* **Suite 5:** `candidateProfileUnification.test.mjs` (6 tests: Unified master profile mapping, dual address sync, caste category, immutable snapshots).
* **Suite 6:** `postImplementationVerification.test.mjs` (11 tests: Complete elimination of legacy MyProfile handlers, Step 1 & 2 reuse).
* **All Suites:** 41 test suites total across candidate portal, draft lifecycle, questionnaire, and vacancy eligibility.
* **Total Passing Tests:** **230 / 230 PASS** (0 failures, 100% pass rate).

---

## 4. Engineering Restrictions for Future Tasks

1. **No Redesign or Removal:** Do not redesign, rename, refactor, or delete the locked components, utilities, or form fields.
2. **No Data Overwrites:** Under no circumstances should existing candidate applications, education entries, or experience records be overwritten with default values.
3. **No Unrelated Schema/API Changes:** Do not modify the database schema, Prisma definitions, Supabase triggers, authentication mechanisms, or payment integrations.
4. **Mandatory Backward Compatibility:** Any future portal step or HR enhancement must maintain 100% compatibility with this locked baseline.

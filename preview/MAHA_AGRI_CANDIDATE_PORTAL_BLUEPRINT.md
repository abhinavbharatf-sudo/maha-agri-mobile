# MAHA-AGRI Candidate Portal — Architectural Blueprint & UI Alignment Report
## Authoritative Design Reference, Admin Data Consistency & Complete Journey Specification

> **Document Classification:** Engineering Architecture Blueprint & UI/UX Consistency Specification  
> **Status:** Finalized Architectural Specification (Documentation & Isolated Preview Only — Zero Production Code or Live SQL Executed)  
> **Authoritative UI/UX Design Reference:** Existing MAHA-AGRI Careers Website (`src/careers/*`, `src/components/layout/Header.tsx`, `tailwind.config.js`)  
> **Corresponding Visual Prototype:** [`project/preview/candidate-portal-preview.html`](file:///e:/project-bolt-sb1-qsboyjjv/project/preview/candidate-portal-preview.html)  
> **Dev Server Replica:** [`project/public/candidate-portal-preview.html`](file:///e:/project-bolt-sb1-qsboyjjv/project/public/candidate-portal-preview.html)  
> **Root Workspace Replica:** [`preview/candidate-portal-preview.html`](file:///e:/project-bolt-sb1-qsboyjjv/preview/candidate-portal-preview.html)  
> **Date:** 28 October 2026  
> **Governing Standards:** SOLID, DRY, KISS, Strict Type Safety, PostGIS Spatial Precision, PostgreSQL Immutability.

---

## 1. Design Reference & UI/UX Harmonization

### 1.1 Alignment with the Existing MAHA-AGRI Careers Website
A core mandate of this revision is removing the visually foreign green/gold government theme and establishing the **existing MAHA-AGRI Careers website as the authoritative UI/UX reference**:

* **Brand Identity:** Abhinav Bharat Foundation / MAHA-AGRI Digital Operations Platform (`Header.tsx`).
* **Color Palette:**
  * **Primary Navy:** `#102a43` (`primary-900` / `#0a1929` `primary-950`) used for the top utility bar, hero headers, primary cards, and dark buttons.
  * **Background Neutral:** `#f0f4f8` (`primary-50` / `bg-slate-50`) providing high readability and clean contrast.
  * **Accent Emerald:** `#16a34a` (`accent-green-600` / `#15803d` `accent-green-700`) used for primary action CTAs ("Apply Now", "Confirm & Submit", "Verify OTP"), active progress badges, and verified checkmarks.
  * **Accent Saffron / Amber:** `#ff9933` / `bg-amber-50` for urgent alerts, warnings, and deadline highlights.
  * **Slate / Neutral Borders:** `border-slate-200` / `border-primary-100` for crisp card separation.
* **Typography:** `Inter, system-ui, -apple-system, sans-serif` (`fontFamily.sans`), preserving standard line heights, letter-spacings, and font weights.
* **Component Styling:** Border-radii (`rounded-xl`, `rounded-2xl`), shadow tiers (`shadow-xs`, `shadow-sm`), and form controls (`focus:ring-2 focus:ring-primary-400`) directly mirror `JobDetail.tsx` and `CandidateDashboardLayout.tsx`.

---

## 2. Job Posting Data Consistency — Admin Source of Truth

The Admin Job Posting Editor (`src/careers/admin/HRJobPostingEditor.tsx`) is the **authoritative source of truth** for all recruitment information. The candidate-facing Job Details screen renders the exact data configured by HR administrators:

### 2.1 Complete Field-by-Field Mapping Matrix

| Category | Admin Form Field (`HRJobPostingEditor.tsx`) | Real Database Column (`rms_job_postings`) | Data Type | Candidate Display Location | Empty State Handling |
|---|---|---|---|---|---|
| **Identity** | `title` | `title` | `text` | Main Hero Header | Required field; never empty. |
| **Identity** | `slug` | `slug` | `text` | URL Route (`/careers/jobs/:slug`) | Required field; generates unique public URL. |
| **Department** | `department` | `department` | `text` | Header Pill & Breadcrumbs | If null, falls back to "MAHA-AGRI Digital Operations". |
| **Contract** | `employment_type` | `employment_type` | `text` | Header Pill & Position Summary | Transformed via `EMPLOYMENT_TYPE_LABELS` (e.g. "Full-time (Contract)"). |
| **Recruitment** | `recruitment_mode` | `recruitment_mode` | `text` | Position Summary Card | Defaults to "Online & Panel Interview". |
| **Status** | `status` | `status` | `text` | Badges & Router Guard | `published` allows applications. Inactive states (`coming_soon`, `applications_closed`, `filled`) disable the Apply CTA. |
| **Salary** | `salary_amount` | `salary_amount` | `numeric(12,2)` | Header Meta Row & Snapshot | Formatted as INR: `₹{salary_amount.toLocaleString('en-IN')}`. |
| **Salary** | `salary_type` | `salary_type` | `text` | Header Meta Row & Snapshot | Suffix unit (e.g. `/ Month`, `/ Day`). If amount is null, displays type label (e.g. "Negotiable"). |
| **Salary** | `salary_package_type` | `salary_package_type` | `text` | Position Summary Grid | Inclusion terms (e.g. "Salary Includes Incentive, T.A. & D.A."). If null, hidden. |
| **Vacancies** | `total_vacancies` | `total_vacancies` | `integer` | Sidebar Snapshot & Summary | Displayed as `{total_vacancies} Posts`. |
| **Locations** | `location_districts` | `location_districts` | `jsonb` | District Allocation Grid | Array of eligible district names. Empty state: "State-wide Open Allocation". |
| **Allocations** | `vacancy_allocations` | `vacancy_allocations` | `jsonb` | District & Taluka Quota Pills | Renders individual post counts per district/taluka cluster. Empty state: uniform district allocation. |
| **Experience** | `experience_required` | `experience_required` | `text` | Hero Meta Row & Summary | Text string (e.g. "1-2 Years"). If empty: "Freshers Eligible". |
| **Work Profile** | `experience_details` | `experience_details` | `text` | Section 2 (Body) | Detailed work profile narrative. If empty, section hides cleanly. |
| **Role Summary** | `description` | `description` | `text` | Section 1 (Body) | Primary description of duties, responsibilities, and operational scope. |
| **Project** | `project_overview` | `project_overview` | `text` | Section 1 Callout Card | Highlighted in blue/emerald box. If empty, callout is omitted. |
| **Duration** | `project_duration` | `project_duration` | `text` | Section 1 Callout & Snapshot | Displays tenure (e.g. "11 Months Renewable"). |
| **Eligibility** | `eligibility_criteria` | `eligibility_criteria` | `jsonb` | Section 3 (Checklist) | Array of `{ label: string, required: boolean }`. Formatted as bulleted criteria list. |
| **Documents** | `required_documents` | `required_documents` | `jsonb` | Section 3 (Grid) | Array of `{ key, label, description }`. Displays documents needed for post-selection scrutiny. |
| **Steps** | `rms_recruitment_steps` | Child Table (`job_id`) | `table` | Section 4 (Stages Grid) | Custom steps from database, falling back to standard 6-stage candidate recruitment journey. |
| **Resources** | `jd_pdf_url`, `project_pdf_url`, `project_video_url` | `jd_pdf_url`, etc. | `text` | Section 5 (Resources Grid) | Download and video watch buttons. Action cards hide if URLs are null or empty. |
| **FAQs** | `rms_job_faqs` | Child Table (`job_id`) | `table` | Section 6 (Accordion) | Dynamic Q&A list. If empty, standard FAQ defaults are rendered. |
| **Terms** | `terms_conditions` | `terms_conditions` | `text` | Sidebar / Summary | Service conduct rules and contractual undertakings. |
| **Fee** | `application_fee_amount` | `application_fee_amount` | `numeric` | Sidebar Snapshot | If `0`: "₹0 (Free / Waived)". If `> 0`: formatted as INR `₹{fee}`. |
| **Deadline** | `closing_date` | `closing_date` | `timestamptz` | Sidebar Snapshot | Stored in UTC; displayed in IST (`DD Mon YYYY, 23:59 IST`). |
| **Declaration**| `acknowledgement_text` | `acknowledgement_text` | `text` | Sidebar Checkbox Card | Legal undertaking text. If empty, uses standard candidate declaration. |

---

## 3. Preserved Job Details Page Structure (Screen 1)

In strict accordance with `project/src/careers/pages/JobDetail.tsx`, the layout is structured into:

1. **Breadcrumb & Quick Access Bar:**
   * Clean white bar (`bg-white border-b border-slate-200`) with breadcrumb trail and candidate account login trigger.
2. **Dark Navy Hero Section (`bg-[#102a43]` / `primary-900`):**
   * "← All Openings" back link.
   * Department tag in tracking-widest uppercase.
   * Prominent Job Title heading (`text-2xl sm:text-3xl font-extrabold text-white`).
   * Location, employment type, and experience meta row.
   * Dynamic status badges ("Open", "Urgent Requirement").
   * Primary "Apply Now" button with right arrow icon.
3. **Two-Column Main Content Grid:**
   * **Left Column (2 cols on lg):**
     * **Position Summary & Role Overview:** Structured grid for location, type, experience, qualifications, age limits, recruitment mode, structured salary, and salary package terms.
     * **Project Overview Callout:** Highlighted box with project objectives and tenure.
     * **Eligible Posting Districts & Vacancies:** Smart vacancy allocation grid with individual vacancy counts per district.
     * **Project Resources:** Official JD PDF download card and Project Walkthrough Video card.
     * **Qualifications & Eligibility:** Bulleted criteria checklist and list of documents required for verification.
     * **Selection & Recruitment Stages:** 6-stage candidate progression grid.
     * **Job FAQs:** Clean accordion addressing fees, interview formats, and multi-job applications.
   * **Right Column (1 col on lg):**
     * **Sticky Application Details Panel:** Snapshot card with total vacancies, fee, salary, closing deadline (IST), post code, age bracket, and tenure.
     * **Candidate Undertaking:** Checkbox with `acknowledgement_text`.
     * **"Proceed to Apply" CTA Button:** Direct route to authentication/application workflow.

---

## 4. Complete Candidate Portal Journey (All 11 Screens Aligned)

All 11 prototype screens utilize the unified website design language:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│ SCREEN 1: JOB DETAILS & APPLY (Authentic Careers Layout)                                        │
│   • Dark navy hero, summary grid, project overview, district quotas, resources, FAQs, snapshot.  │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│ SCREEN 2: WHATSAPP OTP VERIFICATION (Clean White Modal)                                         │
│   • WhatsApp green badge, +91 mobile display, 6-digit OTP input, resend timer, 429 simulator.    │
│   • Strictly WhatsApp OTP; no SMS. Anchors identity to permanent crm_lead_master.               │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│ SCREEN 3: CANDIDATE MASTER PROFILE (Tier 1: 6 Essential Demographics Only)                      │
│   • Stepper (1 of 3). Strictly 6 fields: Name, DOB, Gender, Mobile, Home District, Home Taluka.  │
│   • 100% Essential Complete badge. Decoupled from position-specific academic qualifications.    │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│ SCREEN 4: JOB-SPECIFIC APPLICATION (Tier 2: Role Qualifications & Preferences)                  │
│   • Stepper (2 of 3). On-demand degree, university, passing year, marks, driving licence (2W/4W),│
│   • Work experience, posting district and taluka cluster selection, Marathi language declaration.│
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│ SCREEN 5: REVIEW & SUBMIT (Pre-Submission Verification Summary)                                  │
│   • Stepper (3 of 3). Full review of Tier 1 & Tier 2 data.                                       │
│   • Explicit statutory notice: Frozen JSONB candidate_snapshot; candidate editing locked.        │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│ SCREEN 6: SUBMISSION SUCCESS & NEXT STEPS                                                       │
│   • Emerald checkmark, authoritative application number (ABF-APP-2026-000042), timestamp (IST). │
│   • Next step guidance (Eligibility screening -> WhatsApp interview invitation).                │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│ SCREEN 7: CANDIDATE DASHBOARD (All 10 Preserved Capabilities)                                   │
│   • Profile completion badge, urgent action alert for interview slot rescheduling (#CR-2026-018).│
│   • 6-Tab Navigation: Applications & Drafts, Interview Schedule, Payments, Training,            │
│     Appointment Letters, Account Settings & Notification Alerts.                                │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│ SCREEN 8: CANDIDATE CORRECTION REQUEST FORM                                                     │
│   • Self-service ticket form: eligible field selector, current vs new values, mandatory reason,  │
│     supporting proof upload placeholder, status tracker.                                        │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│ SCREEN 9: ADMIN CORRECTION APPROVAL & AUDIT TRAIL                                               │
│   • Four-Eyes Maker-Checker segregation (Maker ≠ Checker). Field diff table, SHA-256 HMAC hash, │
│     automated slot invalidation and cluster capacity release.                                   │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│ SCREEN 10: TIER 3 POST-SELECTION DOCUMENT UPLOAD WORKFLOW                                       │
│   • Deferred statutory scrutiny for selected candidates (Aadhaar, Degree, Domicile, Caste/NCL). │
│   • Verification status badges: verified, under review, action required.                         │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│ SCREEN 11: ERROR STATES & EDGE CASES SHOWCASE                                                   │
│   • Fault tolerance specs: OTP 429 cooldown, file size limits (2MB), slot race conditions,       │
│     rural offline connectivity failure with localStorage draft persistence.                     │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Candidate Dashboard Capabilities: Feature-Preservation Matrix

To ensure that the visual redesign does not silently drop any existing candidate functionality, all 10 modules in `src/careers/dashboard/` are mapped:

| # | Existing Capability | Existing Code Path | Target Architectural Status | Visual Representation in Prototype |
|---|---|---|---|---|
| **1** | **Dashboard Overview** | `CandidateDashboard.tsx` | **Redesigned** | Header summary, urgent action alerts, and application cards. |
| **2** | **My Profile** | `MyProfile.tsx` | **Redesigned (Decoupled)** | Screen 3 (Tier 1: 6 essential demographics) + Edit Profile modal. |
| **3** | **My Applications** | `MyApplications.tsx` | **Retained & Enhanced** | Tab 1 on Screen 7: Active submitted, active drafts, and expired locked drafts. |
| **4** | **Interview Schedule** | `InterviewSchedule.tsx` | **Retained & Redesigned** | Tab 2 on Screen 7: Booked slot details, panel mode, and reschedule trigger. |
| **5** | **Payments** | `Payments.tsx` | **Retained** | Tab 3 on Screen 7: Application/onboarding fee records, status, and receipts. |
| **6** | **Documents** | `Documents.tsx` | **Redesigned (Tier 3)** | Screen 10: Post-selection statutory document uploads and verification. |
| **7** | **Notifications** | `CandidateNotifications.tsx` | **Retained (Multi-Channel)** | Tab 6 on Screen 7: WhatsApp delivery status and in-app system alerts. |
| **8** | **Training & Induction** | `Training.tsx` | **Retained (Post-Selection)** | Tab 4 on Screen 7: Assigned induction batch, venue, and reporting schedule. |
| **9** | **Appointment Letters** | `AppointmentLetters.tsx` | **Retained (Post-Selection)** | Tab 5 on Screen 7: Provisional/final appointment orders and digital acceptance. |
| **10**| **Settings & Security** | `CandidateSettings.tsx` | **Retained** | Tab 6 on Screen 7: Notification channels, mobile display, and session logout. |

---

## 6. Categorization: Existing System Support vs. Proposed Implementation Work vs. Static Demo Data

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [EXISTING PRODUCTION CAPABILITIES (VERIFIED IN CODEBASE & DATABASE)]                            │
│    • PostgreSQL Tables: rms_job_postings, rms_candidate_profiles, rms_applications.             │
│    • Dynamic Job Child Tables: rms_job_badges, rms_recruitment_steps, rms_job_faqs.             │
│    • WhatsApp Edge Function: supabase/functions/whatsapp/index.ts (OTP verification).           │
│    • Master Lead Architecture: crm_lead_master identity deduplication per mobile.               │
│    • Razorpay Payment Gateway: Project fee transactions in Payments.tsx.                        │
│    • Existing Trigger Safeguard: BEFORE INSERT trigger blocking applications to closed jobs.     │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│ [PROPOSED IMPLEMENTATION SAFEGUARDS - PLANNING ONLY (REQUIRES USER APPROVAL)]                    │
│    • Immutable Application Snapshot: Freezing JSONB candidate_snapshot on submission.           │
│    • BEFORE UPDATE Trigger: Database trigger blocking draft -> submitted after closing deadline. │
│    • Strategy B Virtual Computed Status: Treating (closing_date < now && draft) as expired.     │
│    • Maker-Checker Audit Envelope Table: public.rms_application_corrections with SHA-256 hash.  │
│    • Automated Slot Release: Cascading slot capacity release upon cluster amendment.            │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│ [STATIC PROTOTYPE / DEMO DATA (ILLUSTRATIVE ONLY - ZERO LIVE CONNECTION)]                       │
│    • Candidate Name: "ANURAG KUMAR SINGH" • Candidate ID: "ABF-CAND-000016".                    │
│    • Application Number: "ABF-APP-2026-000042" • Correction Ticket: "#CR-2026-018".            │
│    • Mock Audit Hash: "AUD-CORR-2026-8812" • Attached Documents: "Residential_Proof_Ambad.pdf". │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Summary of Files Changed (Documentation & Preview Only)

* **[`project/preview/MAHA_AGRI_CANDIDATE_PORTAL_BLUEPRINT.md`](file:///e:/project-bolt-sb1-qsboyjjv/project/preview/MAHA_AGRI_CANDIDATE_PORTAL_BLUEPRINT.md):** Fully updated to establish the existing Careers website as the authoritative UI reference, document complete Admin Job Posting data consistency, define the Job Details layout, preserve all 10 candidate dashboard modules, and delineate existing vs. proposed vs. demo data.
* **[`project/preview/candidate-portal-preview.html`](file:///e:/project-bolt-sb1-qsboyjjv/project/preview/candidate-portal-preview.html):** Visual prototype updated to match the existing website design language (navy `#102a43`, clean white header, Inter typography, emerald action buttons); green/gold theme eliminated; Screen 1 Job Details page structure aligned with `JobDetail.tsx`; Screen 7 Dashboard tabs aligned with all 10 dashboard capabilities.
* **`preview/candidate-portal-preview.html`:** Workspace root replica synchronized (116,486 bytes).
* **`project/public/candidate-portal-preview.html`:** Vite dev server replica synchronized (116,486 bytes).

---
*End of Authoritative Architectural Blueprint & UI Alignment Report. Zero production code, live database migrations, or live SQL queries were executed. Ready for final user review and explicit approval.*

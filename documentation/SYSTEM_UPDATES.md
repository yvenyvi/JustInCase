# JusticeLink — Previous System Updates

This document records every major update to the JusticeLink platform from the initial commit through the current release. Updates are organized chronologically into seven phases that reflect the natural progression of development — from scaffolding and UI design, through backend integration and authentication, to full-featured legal aid tools and administrative controls.

---

## Update 1 — Project Initialization & UI Foundation
**Date:** March 10–11, 2026 | **Commits:** `dbbe717`, `8fb0f73`, `51c9dea`

### Overview
The project was bootstrapped from scratch. The initial commit established the monorepo structure (a single repository containing both the React frontend and the FastAPI backend), and a first-pass modern UI was created for all primary user-facing pages.

### What Was Added
- **Repository structure** — `frontend/` (React + Vite + TypeScript) and `backend/` (FastAPI + Python) organized under a single root with shared `package.json` scripts.
- **Landing page** — A marketing homepage introducing JusticeLink's mission to connect Philippine citizens with free legal aid.
- **Authentication screens** — Login, Register, and Forgot Password pages wired to placeholder logic.
- **Portal shells** — Skeleton layouts for the Citizen, Attorney, and Admin portals with sidebar navigation, top bar, and content areas — no real data yet.
- **Design system** — A dark navy (`#1a1a2e`) and red-accent (`#e94560`) color palette, Inter typeface, and Lucide icon set established as the visual language for the entire platform.

### Significance
This update set the visual identity and code organization that all subsequent work would build on. Agreeing on the design language early prevented costly rework later.

---

## Update 2 — UI Refinement, Branding & Philippine Localization
**Date:** March 17–21, 2026 | **Commits:** `c75fc9f`, `aa86cbb`, `65c3245`, `515d6e6`, `c66731f`, `ae19796`, `f62b618`, `4af8262`, `abc4036`, `19510f9`, `e0fb13a`

### Overview
The early UI received substantial polish. Content was localized to the Philippine context, the brand was unified under "JusticeLink-PH," and several foundational UX features — pro-bono tracking, mobile responsiveness, and profile pages — were implemented.

### What Was Added

#### Philippine Content Localization
All placeholder text and example data was replaced with Philippine-specific content: local legislation references (Labor Code, Family Code, RA 9262), Philippine peso amounts, barangay and regional terminology, and PH-based legal scenario examples throughout the Rights Library and dashboard cards.

#### Authentication Page Redesign
The Login and Register pages received a premium split-screen layout. Typography was synchronized across authentication and landing pages to provide a cohesive brand experience.

#### User Profile Pages
Dedicated profile pages were added for both Citizens and Attorneys, allowing users to view and update personal details. Header navigation was updated to include profile links.

#### Landing Page CTA Unification
The landing page call-to-action buttons were updated ("Get Help" for citizens, "Volunteer" for attorneys) and the brand name standardized to "JusticeLink-PH" across all pages and metadata.

#### Light/Dark Mode (Experimental — Later Removed)
A `ThemeContext` and `ThemeToggle` component were introduced to support light and dark mode switching. After evaluation, the dark-mode branch was removed in the same sprint to keep the visual design consistent and reduce maintenance overhead. The platform settled on the dark navy theme exclusively.

#### Pro-Bono Progress Bar
A visual progress bar was added to the Attorney Portal to track hours logged toward the IBP-mandated 60-hour/3-year target. This was the first implementation of compliance tracking in the system.

#### Mobile Responsiveness
The Public Dashboard layout was rebuilt to be mobile-responsive, adjusting grid layouts and font sizes for small screens. Message panel heights were fixed to prevent overflow issues on all screen sizes.

### Significance
This update transformed the system from a developer scaffold into a product that could be shown to stakeholders. The Philippine localization was critical for user trust and legal accuracy.

---

## Update 3 — Supabase Integration, Chatbot UI & Super Admin Portal
**Date:** March 28–29, 2026 | **Commits:** `805ba54`, `840b978`, `13f671b`, `e9cd26a`, `24daab1`

### Overview
The backend database was connected for the first time via Supabase (PostgreSQL), the floating AI chatbot UI was integrated into the frontend, and the Super Administrator portal layout was established.

### What Was Added

#### Supabase Database Connection
The Supabase JavaScript client (`@supabase/supabase-js`) was integrated into the frontend. A `supabaseClient.ts` module was created as the single point of database access, configured via `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` environment variables.

The initial database schema was created covering:
- `users` table with role, verification status, and IBP fields
- `cases`, `message_threads`, `messages`, and `thread_participants` tables
- Row-Level Security (RLS) policies to ensure data isolation per user role

#### Floating AI Chatbot (Kampi) — UI Layer
The `KampiFloatingChat` component was added as a persistent floating button in the bottom-right corner of authenticated pages. At this stage the chat bubble and input were functional UI elements, but the AI backend was not yet connected — responses were mocked locally. The `aiChatService.ts` module was created to manage conversation state.

#### Super Admin Page Layout
The Admin Portal shell was created with sidebar navigation items for Dashboard, Accounts, Verifications, Logs, and Settings. The pages rendered placeholder cards — real data connections came in later updates.

#### File Structure Refactoring
The `frontend/src/` directory was reorganized to separate `views/`, `components/`, `services/`, `contexts/`, and `types/` into distinct folders, making the codebase easier to navigate as it grew.

### Significance
Connecting Supabase was the turning point from a static prototype to a real application. The database schema and RLS policies defined at this stage became the security foundation for all subsequent feature work.

---

## Update 4 — Authentication Backend & Didit ID Verification
**Date:** April 2–8, 2026 | **Commits:** `1787926`, `7f1b4ba`, `a48c8fd`, `9801fb5`, `6884707`, `59347f1`, `f566b1b`

### Overview
Full authentication was implemented end-to-end. Citizens authenticate via Supabase email/password combined with Didit government ID verification (OCR + face match). Attorneys go through a manual credential review process. This update introduced the FastAPI backend as an active component in the system.

### What Was Added

#### Public User Authentication with Didit
Citizens can now register with a verified Philippine government ID. The flow:
1. The user fills in personal details on the Register page and selects "Citizen."
2. The frontend calls the FastAPI backend (`POST /api/public-registration/start`), which creates a Didit verification session.
3. The user is redirected to Didit's hosted verification UI, where they photograph their government ID and take a selfie.
4. Didit's OCR engine extracts the ID data, and face-matching confirms the user is the ID holder.
5. Didit sends a webhook to the backend (`POST /api/didit/webhook`), updating the session status.
6. The frontend polls for status and, upon approval, calls `POST /api/public-registration/finalize` to create the Supabase user account with `is_didit_verified = true`.

Logout functionality was also added, clearing the Supabase JWT session and redirecting to the landing page.

#### Legal User Authentication with Manual Verification
Attorneys follow a separate registration path. Instead of Didit, they upload:
- A photo of their IBP (Integrated Bar of the Philippines) membership card
- A selfie for identity confirmation
- Their IBP number and bar roll number

These are stored in Supabase Storage and queued for Admin review. The attorney account is created but remains in `status_verification = 'unverified'` state until an admin approves it. This replaced an earlier AI-based verification concept that was found to be unreliable for credential documents.

#### Groq LLM Integration (Initial)
The Groq API key was connected to the backend, and initial wiring for the Kampi chatbot's AI responses was established. The `GROQ_MODEL` environment variable (`llama-3.3-70b-versatile`) was configured.

#### PostgreSQL Schema Stabilization
The database schema was revised to fix registration-related issues: the `users` table enum for `user_role` was corrected, foreign key constraints were tightened, and the RLS policies for user creation were adjusted to allow the service role (used by the backend) to insert new user records without bypassing security for other operations.

### Significance
This was the most complex update to date. Didit integration required coordinating three separate systems (frontend, FastAPI backend, and Didit's external API) with webhook callbacks and polling. Getting authentication right at this stage was essential — all subsequent features depend on knowing who the user is and what role they hold.

---

## Update 5 — AI Document Generator, Profile Data & Enhanced Registration
**Date:** April 25–28, 2026 | **Commits:** `5cce55f`, `6d22a47`, `403cb13`, `4e01f6d`, `a3c31c4`, `994ddee`, `bfcaf02`, `c1eee49`, `4104e58`, `15bf7e6`, `fd938ca`

### Overview
The AI-powered legal document generator was built and connected end-to-end. Real user profile data was integrated throughout the app. The registration experience was improved with OCR-assisted field population and a cascading Philippine address selector.

### What Was Added

#### AI-Assisted Legal Document Generator
The document generator allows citizens to produce ready-to-use legal draft letters by selecting a template and filling in a short form.

**Backend (`document_generator_service.py`):**
- 11 document templates were defined covering: Demand for Return of Security Deposit, Request for Property Repair, Wage Claim Letter, Notice of Illegal Dismissal, Child Support Demand Letter, VAWC Protection Order Request, Consumer Refund Demand, Cybercrime Complaint Draft, Barangay Sumbong, and two additional housing templates.
- Each template has required fields (names, dates, amounts, etc.).
- The `POST /api/documents/generate` endpoint sends the template and user-supplied data to Groq LLM, which produces a natural-language legal draft.
- A fallback was implemented: if the Groq API call fails, the backend interpolates the template string directly with the user's data.

**Frontend (`DocumentGeneratorView.tsx`):**
- A category browser (Housing, Labor, Family, Consumer, Cybercrime, Barangay) lets users narrow the template list.
- A dynamic form renders fields specific to the selected template.
- The generated document appears in a preview panel that supports copy-to-clipboard and download.
- Generated documents are saved to the `generated_documents` Supabase table.

#### Generated Documents in Public Home Page and Profile
The Public Dashboard was updated to show recently generated documents as quick-access cards. The Profile page received a "My Documents" section listing all previously generated drafts with download links. A "View All" modal was added to browse the full document history without leaving the profile page.

#### Real Profile Data Integration
All portal pages were updated to read from the `users` table via Supabase instead of showing placeholder names and details. The `AuthContext` was updated to fetch and expose the user's full profile on login, making `profile.first_name`, `profile.role`, `profile.is_didit_verified`, and other fields available globally.

#### 28-Day Profile Edit Restriction
To prevent abuse, a restriction was implemented: users can only update their personal details (name, address) once every 28 days. The last edit timestamp is stored on the user record, and the form displays a countdown to the next allowed edit date.

#### Enhanced Location Selector with OCR Normalization
The registration address fields were upgraded to a cascading dropdown system using the `select-philippines-address` package: Region → Province → City/Municipality → Barangay. When Didit's OCR extracts an address from a government ID, a normalization function maps the raw OCR text to the correct dropdown values, pre-filling the form and reducing user friction.

#### Test User Accounts
Three quick-login test accounts were added to the Login page for development convenience: `lance.admin@justice.link`, `lance.attorney@justice.link`, and `lance.citizen@justice.link`, all sharing a common dev password. These allow the team to switch between roles instantly during testing without going through registration.

### Significance
The document generator is one of JusticeLink's most impactful features — it gives citizens immediate, practical output even before an attorney is assigned. The 11 templates cover the most common legal situations encountered in the Philippines.

---

## Update 6 — Triage System, Real-Time Messaging & Case Management
**Date:** May 1–2, 2026 | **Commits:** `a44e78d`, `d058e13`, `c91c280`, `f08b454`, `09b9a7a`, `ec0d25b`, `5981130`

### Overview
Three of the platform's core collaborative features were implemented in this update: the AI-powered triage system for filing legal cases, real-time messaging between citizens and attorneys, and a complete case management workflow including case history, status updates, and document uploads.

### What Was Added

#### AI-Powered Legal Triage System
The triage flow is the primary way citizens seek attorney help on the platform.

**Phase 1 (implemented this update):**
1. The citizen navigates to "Get Legal Help" and completes a guided questionnaire: issue category (Labor, Housing, Family, Consumer, Cybercrime, Barangay), a free-text description of their situation, and an urgency level.
2. The answers are sent to the FastAPI backend, which forwards them to Groq LLM.
3. The AI returns a structured assessment: identified issue type, a plain-language summary, estimated match percentage with available attorneys, and suggested next steps.
4. The citizen reviews the AI-generated summary and clicks Submit to formally file the case.
5. The case is created in the `cases` table with status `'Pending Triage'` and the assessment stored in `triage_assessments`.

A display fix was applied after the initial implementation to correctly render the triage assessment data in the confirmation screen.

#### Real-Time Messaging
Citizens and their assigned attorneys can communicate directly through case-linked message threads.

- **`message_threads`** are created automatically when an attorney is assigned to a case.
- **`messages`** are stored with sender ID, content, timestamp, and read status.
- **`thread_participants`** links users to threads; RLS ensures only participants can read messages.
- Supabase Realtime is used to push new messages to the recipient's browser without polling.
- Both the Citizen Portal (`/public/messages`) and Attorney Portal (`/legal/messages`) use a shared `MessagesView` component that adapts its layout and data queries based on the user's role.

#### Case History, Close/Withdraw & Document Uploads
The Case History page was added to the Attorney Portal, showing all resolved cases with outcome (Closed - Won / Closed - Lost) and close date. Attorneys can now:
- **Update case status** from the My Cases page through the full lifecycle: Pending Triage → In Progress → Hearing Scheduled → Demand Sent → Closed.
- **Close or withdraw** a case with a final outcome recorded.
- **Upload documents** (demand letters, court filings, evidence) directly to a case record, stored in Supabase Storage and linked to the case in the database.

#### Attorney Profile Editing
Attorneys can now edit their professional information (areas of practice, contact details) directly from the Legal Portal profile page. The form saves updates to the `users` table in real time.

#### Kampi Chatbot Scope Restriction
A bug was fixed where Kampi (the AI chatbot) would answer general coding and non-legal questions. A system prompt constraint was added to the Groq API call in `kampi_service.py`, restricting Kampi to Philippine legal topics only. Out-of-scope questions now receive a polite redirect to legal topics.

### Significance
This update completed the core citizen-attorney interaction loop: a citizen files a case via triage → gets assigned an attorney → communicates via messages → the attorney manages the case to resolution. The platform became functionally usable for its intended purpose in this sprint.

---

## Update 7 — Admin Tools, System Settings, Audit Logs & Stability
**Date:** May 3–8, 2026 | **Commits:** `cd190db`, `e335db7`, `2d1366d`, `34bea50`

### Overview
The final major update before the current release added the full administrative toolset: system-wide settings with feature flags and maintenance mode, a database backup and restore function, a comprehensive audit log, and stability fixes for the Rights Library and pro-bono hour tracking.

### What Was Added

#### System Settings Page
Administrators can now control platform-wide behavior through a dedicated settings page (`/admin/settings`). Settings are stored as key-value pairs in the `system_settings` Supabase table and read by the frontend at route load time.

**Available settings:**
| Setting | Effect |
|---------|--------|
| Maintenance Mode | Takes the platform offline for all non-admin users |
| New Registrations | Enables or disables the Register page |
| Kampi Chatbot | Shows or hides the floating AI chat button |
| Document Generator | Enables or disables the document generation feature |
| Email Notifications | Configures which events trigger system emails |

Changes take effect immediately without a server restart, since the frontend reads `system_settings` on each page load.

#### Backup & Restore
The System Settings page includes a Backup & Restore panel:
- **Download Backup** triggers a full database export via Supabase's API and downloads it as a `.sql` file.
- **Upload Backup** accepts a previously exported backup file and initiates a restore operation.
- Restore operations are gated behind a confirmation dialog to prevent accidental overwrites.

#### Audit Logs
A new `audit_logs` table was added to the database schema with the following RLS rules:
- **INSERT**: any authenticated user can write their own action events
- **SELECT**: only Super Administrators can read
- **UPDATE / DELETE**: denied for all users — logs are immutable

The Admin Portal's Audit Logs page (`/admin/logs`) displays the log with filters for date range, action type, and user. Logged events include: user logins/logouts, account creation and deletion, case status changes, document generation, attorney verification decisions, and admin setting changes. Each entry captures the event type, user ID, detail text, and IP address.

The Export as CSV button allows admins to download filtered log data for offline compliance reporting.

#### Rights Library Fixes
The Rights Library component was refactored to fix display and search issues:
- Category filtering was not correctly showing articles after switching categories — this was caused by a state management bug where the filtered list was not being reset on category change.
- The article search function was updated to search both title and body content instead of title only.
- Article cards were restyled to consistently display category tags and truncated excerpts.

#### Pro-Bono Hours Tracking Fix
The Pro-Bono Hub's hour calculation was corrected. The previous implementation was double-counting service log entries that spanned multiple case status changes. The aggregation query was rewritten to sum unique service log entries by ID, ensuring each hour entry is counted exactly once regardless of how many status updates the linked case has received.

#### Full Testing Pass
A complete frontend and backend testing cycle was conducted (`test: frontend/backend testing passed`). Playwright end-to-end tests were run across all three portals (Citizen, Attorney, Admin), and pytest was run on the FastAPI backend. Issues identified during testing — including a profile save bug, a file upload content-type error, and an edge case in the triage submission flow — were resolved in the `fix: tested and validated recent commits` commit.

### Significance
This update completed the administrative layer of the platform. With audit logs, system settings, and backup/restore in place, JusticeLink now meets the operational requirements for a production deployment: administrators can monitor activity, control access, maintain compliance records, and recover from data issues without developer intervention.

---

## Update 8 — Admin Case Management & Attorney Assignment
**Date:** May 9, 2026 | **Branch:** `backend/auth-v2`

### Overview
A critical gap in the administrative workflow was identified and resolved: there was no admin-facing interface for managing cases across the platform or for assigning verified attorneys to citizens waiting in the "Pending Triage" queue. This update adds a dedicated **Case Management** page to the Admin Portal that gives Super Administrators a complete system-wide view of all cases and a streamlined assignment workflow.

### What Was Added

#### Admin Case Management Page (`/admin/cases`)
A new page was added to the Admin Portal under a new "Case Management" sidebar item. The page provides:

- **System-wide case table** — All cases across all citizens and attorneys are displayed in a sortable table with columns for Case Title, Issue Type (from triage assessment), Client, Assigned Attorney, Status, and Date Filed. The existing `cases_admin_all` RLS policy enables Super Administrators to query all case records.
- **Status overview KPIs** — Four summary cards at the top display Total Cases, Pending Triage, Active Cases (In Progress + Hearing Scheduled + Demand Sent), and Closed Cases at a glance.
- **Search and filter** — A free-text search matches against case titles and client names. A status dropdown filter narrows the table to any single case status.
- **Assign / Reassign Attorney** — Each row has an Assign or Reassign button that opens a modal. The modal shows the case's current status, client name, and issue type, then lists all verified `Volunteer Attorney` accounts for selection via a radio button list. Confirming the assignment writes `attorney_id` to the `cases` table and updates the status to `'In Progress'`.

#### Automated Message Thread Creation on Assignment
When an attorney is assigned to a case for the first time, the system automatically creates a `message_threads` record linked to the case and inserts both the citizen and the attorney as `thread_participants`. This ensures the messaging channel is ready for immediate use without any additional steps.

#### Client Assignment Notification
After a successful assignment, a notification is inserted into the `notifications` table for the citizen, informing them that their case has been assigned to an attorney and linking them directly to `/public/messages`.

#### Audit Trail Integration
Every attorney assignment action is recorded in the `audit_logs` table with action type `'case_assigned'`, including the case title, the shortened case UUID, and the attorney's full name. This ensures all assignment decisions are traceable and attributable to the administrator who performed them.

### Significance
Prior to this update, there was no UI path for an administrator to assign attorneys to pending cases — the `attorney_id` field on the `cases` table could only be set directly in the database. This update closes the last major gap in the citizen-to-attorney matching workflow, completing the full administrative lifecycle: a citizen files a case via triage → an admin reviews and assigns an attorney → the attorney and citizen are connected via messaging → the case is managed to resolution.

---

## Summary of All Updates

| Update | Period | Key Features |
|--------|--------|-------------|
| 1 | Mar 10–11 | Project init, monorepo, UI foundation, design system |
| 2 | Mar 17–21 | PH localization, branding, profile pages, pro-bono bar, mobile responsiveness |
| 3 | Mar 28–29 | Supabase integration, database schema, RLS, chatbot UI, admin portal shell |
| 4 | Apr 2–8 | Didit ID verification, Supabase Auth, attorney manual verification, Groq init |
| 5 | Apr 25–28 | AI document generator, real profile data, OCR address normalization, 28-day edit lock |
| 6 | May 1–2 | AI triage system, real-time messaging, case management, case history, document uploads |
| 7 | May 3–8 | System settings, feature flags, backup/restore, audit logs, Rights Library fix, testing |
| 8 | May 9 | Admin case management panel, attorney assignment UI, auto message thread creation, assignment notifications |

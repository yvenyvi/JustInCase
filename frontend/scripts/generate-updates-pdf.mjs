/**
 * Generates JusticeLink_System_Updates.pdf from SYSTEM_UPDATES.md
 * Usage: node scripts/generate-updates-pdf.mjs
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const DOCS_DIR   = path.resolve(__dirname, '../../documentation');
const SS_DIR     = path.join(DOCS_DIR, 'screenshots');
const OUTPUT_PDF = path.join(DOCS_DIR, 'JusticeLink_System_Updates.pdf');

function imgToBase64(filename) {
  const p = path.join(SS_DIR, filename);
  if (!fs.existsSync(p)) return null;
  return `data:image/png;base64,${fs.readFileSync(p).toString('base64')}`;
}

// ── Screenshot annotations per update ────────────────────────────────────────
// Each entry: { file, caption }
const UPDATE_SCREENSHOTS = {
  1: [],
  2: [
    { file: '00_landing.png',    caption: 'Landing page — Philippine-localized hero section and JusticeLink branding established in Update 2.' },
    { file: '01_login.png',      caption: 'Login page — split-screen premium authentication layout added during Update 2 UI refinement.' },
    { file: '02_register.png',   caption: 'Register page — account type selector and Philippine address cascading dropdowns.' },
  ],
  3: [],
  4: [
    { file: '03_forgot_password.png', caption: 'Forgot Password — part of the complete Supabase Auth email/password flow introduced in Update 4.' },
  ],
  5: [
    { file: '13_citizen_document_generator.png', caption: 'Document Generator — AI-assisted legal document drafting with 11+ Philippine legal templates.' },
    { file: '16_citizen_profile.png',            caption: 'Citizen Profile — real profile data integration and generated documents section added in Update 5.' },
  ],
  6: [
    { file: '11_citizen_triage.png',     caption: 'Legal Triage — AI-powered questionnaire that assesses the citizen\'s legal situation and files a case.' },
    { file: '14_citizen_messages.png',   caption: 'Citizen Messages — real-time messaging between citizens and assigned attorneys via Supabase Realtime.' },
    { file: '21_attorney_cases.png',     caption: 'Attorney My Cases — full case management with status updates, notes, and document uploads.' },
    { file: '23_attorney_case_history.png', caption: 'Attorney Case History — archive of all closed cases with outcome and close date.' },
    { file: '26_attorney_messages.png',  caption: 'Attorney Messages — unified inbox for all client conversations linked to assigned cases.' },
  ],
  7: [
    { file: '12_citizen_rights_library.png', caption: 'Rights Library — fixed category filtering and full-text search after Update 7 refactor.' },
    { file: '24_attorney_probono_hub.png',   caption: 'Pro-Bono Hub — corrected hour aggregation showing accurate progress toward 60-hour IBP target.' },
    { file: '30_admin_dashboard.png',        caption: 'Admin Dashboard — platform-wide KPI overview added as part of the admin toolset in Update 7.' },
    { file: '33_admin_audit_logs.png',       caption: 'Audit Logs — immutable event log with date, user, action type, and IP address filters.' },
    { file: '34_admin_system_settings.png',  caption: 'System Settings — feature flags, maintenance mode toggle, and backup/restore controls.' },
  ],
};

// ── Update data (mirrors SYSTEM_UPDATES.md) ───────────────────────────────────
const UPDATES = [
  {
    num: 1,
    title: 'Project Initialization & UI Foundation',
    period: 'March 10–11, 2026',
    commits: ['dbbe717', '8fb0f73', '51c9dea'],
    summary: 'The project was bootstrapped from scratch. A monorepo structure was established, and a first-pass modern UI was created for all primary user-facing pages.',
    sections: [
      {
        heading: 'What Was Added',
        items: [
          { label: 'Repository structure', detail: 'frontend/ (React + Vite + TypeScript) and backend/ (FastAPI + Python) organized under a shared root with concurrently-managed dev scripts.' },
          { label: 'Landing page', detail: 'A marketing homepage introducing JusticeLink\'s mission to connect Philippine citizens with free legal aid.' },
          { label: 'Authentication screens', detail: 'Login, Register, and Forgot Password pages wired to placeholder logic.' },
          { label: 'Portal shells', detail: 'Skeleton layouts for the Citizen, Attorney, and Admin portals with sidebar navigation, top bar, and content areas — no real data yet.' },
          { label: 'Design system', detail: 'Dark navy (#1a1a2e) and red-accent (#e94560) color palette, Inter typeface, and Lucide icon set established as the visual foundation.' },
        ],
      },
      {
        heading: 'Significance',
        body: 'This update set the visual identity and code organization that all subsequent work would build on. Agreeing on the design language early prevented costly rework later as the team scaled the feature set.',
      },
    ],
  },
  {
    num: 2,
    title: 'UI Refinement, Branding & Philippine Localization',
    period: 'March 17–21, 2026',
    commits: ['c75fc9f', 'aa86cbb', '65c3245', 'c66731f', 'f62b618', '4af8262', 'abc4036', '19510f9', 'e0fb13a'],
    summary: 'The early UI received substantial polish. Content was localized to the Philippine context, the brand was unified under "JusticeLink-PH," and several foundational UX features were implemented.',
    sections: [
      {
        heading: 'Philippine Content Localization',
        body: 'All placeholder text was replaced with Philippine-specific content: local legislation references (Labor Code, Family Code, RA 9262), peso amounts, barangay terminology, and PH-based legal scenarios throughout the Rights Library and dashboard cards.',
      },
      {
        heading: 'Authentication Page Redesign',
        body: 'The Login and Register pages received a premium split-screen layout, and typography was synchronized across authentication and landing pages to provide a cohesive brand experience.',
      },
      {
        heading: 'User Profile Pages',
        body: 'Dedicated profile pages were added for both Citizens and Attorneys, allowing users to view and update personal details. Header navigation was updated to include profile links.',
      },
      {
        heading: 'Landing Page CTA Unification',
        body: 'Call-to-action buttons were updated ("Get Help" for citizens, "Volunteer" for attorneys) and the brand name standardized to "JusticeLink-PH" across all pages and metadata.',
      },
      {
        heading: 'Light/Dark Mode (Experimental — Later Removed)',
        body: 'A ThemeContext and ThemeToggle component were introduced to support light/dark switching. After evaluation, the dark-mode branch was removed in the same sprint to keep the visual design consistent and reduce maintenance overhead. The platform settled on the dark navy theme exclusively.',
      },
      {
        heading: 'Pro-Bono Progress Bar',
        body: 'A visual progress bar was added to the Attorney Portal to track hours logged toward the IBP-mandated 60-hour/3-year target — the first compliance tracking feature in the system.',
      },
      {
        heading: 'Mobile Responsiveness',
        body: 'The Public Dashboard was rebuilt to be mobile-responsive. Message panel heights were fixed to prevent overflow issues on all screen sizes.',
      },
      {
        heading: 'Significance',
        body: 'This update transformed the system from a developer scaffold into a product that could be shown to stakeholders. The Philippine localization was critical for user trust and legal accuracy.',
      },
    ],
  },
  {
    num: 3,
    title: 'Supabase Integration, Chatbot UI & Super Admin Portal',
    period: 'March 28–29, 2026',
    commits: ['805ba54', '840b978', '13f671b', 'e9cd26a', '24daab1'],
    summary: 'The backend database was connected for the first time via Supabase, the floating AI chatbot UI was integrated, and the Super Administrator portal layout was established.',
    sections: [
      {
        heading: 'Supabase Database Connection',
        body: 'The Supabase JS client was integrated via a supabaseClient.ts module. The initial database schema was created covering users, cases, message_threads, messages, and thread_participants tables, along with Row-Level Security (RLS) policies to enforce data isolation per user role.',
      },
      {
        heading: 'Floating AI Chatbot (Kampi) — UI Layer',
        body: 'The KampiFloatingChat component was added as a persistent floating button in the bottom-right corner of authenticated pages. At this stage the UI was functional but AI responses were mocked — the Groq backend connection came in Update 4. The aiChatService.ts module was created to manage conversation state.',
      },
      {
        heading: 'Super Admin Page Layout',
        body: 'The Admin Portal shell was created with sidebar navigation for Dashboard, Accounts, Verifications, Logs, and Settings. Pages rendered placeholder cards — real data connections arrived in Update 7.',
      },
      {
        heading: 'File Structure Refactoring',
        body: 'The frontend/src/ directory was reorganized into views/, components/, services/, contexts/, and types/ folders, making the codebase navigable as it scaled.',
      },
      {
        heading: 'Significance',
        body: 'Connecting Supabase was the turning point from a static prototype to a real application. The database schema and RLS policies defined here became the security foundation for all subsequent feature work.',
      },
    ],
  },
  {
    num: 4,
    title: 'Authentication Backend & Didit ID Verification',
    period: 'April 2–8, 2026',
    commits: ['1787926', 'a48c8fd', '9801fb5', '6884707', '59347f1', 'f566b1b'],
    summary: 'Full end-to-end authentication was implemented. Citizens authenticate with Supabase email/password combined with Didit government ID verification. Attorneys go through a manual credential review process handled by an admin.',
    sections: [
      {
        heading: 'Public User Authentication with Didit',
        body: 'The citizen registration flow now triggers a Didit identity verification session. The user is redirected to Didit\'s hosted UI where they photograph their government ID and take a selfie. Didit\'s OCR extracts ID data and face-matching confirms identity. On approval, the backend creates the Supabase account with is_didit_verified = true. Three FastAPI endpoints support this flow: POST /api/public-registration/start, GET /api/public-registration/status/{id}, and POST /api/public-registration/finalize.',
      },
      {
        heading: 'Legal User Authentication with Manual Verification',
        body: 'Attorneys upload their IBP card photo, selfie, IBP number, and bar roll number during registration. These are stored in Supabase Storage and queued for admin review. The attorney account is created with status_verification = "unverified" until approved. This replaced an earlier AI-based verification concept that proved unreliable for credential documents.',
      },
      {
        heading: 'Didit Webhook Handler',
        body: 'A POST /api/didit/webhook endpoint was added to the FastAPI backend. It validates the HMAC signature from Didit, updates the session status in the database, and triggers any post-verification actions. This ensures verification state is authoritative even if the user closes the browser during the flow.',
      },
      {
        heading: 'PostgreSQL Schema Stabilization',
        body: 'The database schema was revised to fix registration edge cases: user_role enum values were corrected, foreign key constraints tightened, and RLS policies for user creation adjusted to allow the service role to insert new records without compromising security for read operations.',
      },
      {
        heading: 'Significance',
        body: 'This was the most complex update to date, coordinating three systems (React frontend, FastAPI backend, Didit external API) with webhooks and polling. Getting authentication right was essential — every subsequent feature depends on knowing who the user is and what role they hold.',
      },
    ],
  },
  {
    num: 5,
    title: 'AI Document Generator, Profile Data & Enhanced Registration',
    period: 'April 25–28, 2026',
    commits: ['5cce55f', '6d22a47', '403cb13', 'a3c31c4', '994ddee', 'bfcaf02', 'c1eee49', '15bf7e6', 'fd938ca'],
    summary: 'The AI-powered legal document generator was built end-to-end. Real user profile data was integrated throughout the app. Registration was improved with OCR-assisted field population and a cascading Philippine address selector.',
    sections: [
      {
        heading: 'AI-Assisted Legal Document Generator',
        body: 'Citizens can now generate ready-to-use legal draft letters from 11 templates covering Housing, Labor, Family, Consumer, Cybercrime, and Barangay categories. The POST /api/documents/generate endpoint forwards the template and user-supplied data to Groq LLM (llama-3.3-70b-versatile), which produces a natural-language legal draft. A fallback performs template string interpolation if the Groq API call fails. Generated documents are saved to the generated_documents table.',
      },
      {
        heading: 'Document Templates Available',
        items: [
          { label: 'Housing', detail: 'Demand for Return of Security Deposit, Request for Property Repair' },
          { label: 'Labor', detail: 'Wage Claim Letter, Notice of Illegal Dismissal' },
          { label: 'Family', detail: 'Child Support Demand Letter, VAWC Protection Order Request' },
          { label: 'Consumer', detail: 'Refund Demand Letter' },
          { label: 'Cybercrime', detail: 'Online Harassment Complaint Draft' },
          { label: 'Barangay', detail: 'Barangay Sumbong (formal complaint)' },
        ],
      },
      {
        heading: 'Documents in Dashboard & Profile',
        body: 'The Public Dashboard was updated to show recently generated documents as quick-access cards. The Profile page received a "My Documents" section with a "View All" modal for browsing the full document history without leaving the page.',
      },
      {
        heading: 'Real Profile Data Integration',
        body: 'All portal pages were updated to read from the users Supabase table instead of showing placeholder names. AuthContext was updated to fetch and expose the full user profile on login, making first_name, role, is_didit_verified, and all other fields available globally across the app.',
      },
      {
        heading: '28-Day Profile Edit Restriction',
        body: 'Users can only update personal details (name, address) once every 28 days to prevent abuse. The last edit timestamp is stored on the user record and the profile form displays a countdown to the next allowed edit window.',
      },
      {
        heading: 'Enhanced Location Selector with OCR Normalization',
        body: 'Registration address fields were upgraded to cascading dropdowns (Region → Province → City/Municipality → Barangay) using the select-philippines-address npm package. A normalization function maps raw OCR text from Didit to the correct dropdown values, pre-filling the form for citizens completing ID verification.',
      },
      {
        heading: 'Significance',
        body: 'The document generator is one of JusticeLink\'s most impactful citizen-facing features — it gives citizens immediate, practical legal documents even before an attorney is assigned. The 11 templates cover the most common legal situations encountered in the Philippines.',
      },
    ],
  },
  {
    num: 6,
    title: 'Triage System, Real-Time Messaging & Case Management',
    period: 'May 1–2, 2026',
    commits: ['a44e78d', 'd058e13', 'c91c280', 'f08b454', '09b9a7a', 'ec0d25b', '5981130'],
    summary: 'Three core collaborative features were implemented: the AI-powered triage system for filing legal cases, real-time messaging between citizens and attorneys, and a complete case management workflow.',
    sections: [
      {
        heading: 'AI-Powered Legal Triage System',
        body: 'The triage flow is the primary mechanism for citizens to seek attorney help. The citizen answers a guided questionnaire (issue category, description, urgency). Answers are sent to Groq LLM via the backend, which returns: identified issue type, a plain-language case summary, estimated attorney match percentage, and recommended next steps. Submitting creates a case record with status "Pending Triage" and stores the assessment in the triage_assessments table. A display fix was applied after initial implementation to correctly render the assessment data.',
      },
      {
        heading: 'Real-Time Messaging',
        body: 'Citizens and assigned attorneys communicate through case-linked message threads. The message_threads table groups conversations by case. The messages table stores content, sender, timestamp, and read status. RLS on thread_participants ensures only conversation participants can read messages. Supabase Realtime pushes new messages to the recipient\'s browser instantly — no polling required. Both portals share a single MessagesView component that adapts queries based on the authenticated role.',
      },
      {
        heading: 'Case History, Close/Withdraw & Document Uploads',
        body: 'The Case History page was added to the Attorney Portal, archiving all resolved cases with outcome and close date. Attorneys can now update case status through the full lifecycle (Pending Triage → In Progress → Hearing Scheduled → Demand Sent → Closed), close or withdraw a case with a recorded outcome, and upload case documents (filings, demand letters, evidence) to Supabase Storage linked to the case record.',
      },
      {
        heading: 'Attorney Profile Editing',
        body: 'Attorneys can now update professional details — areas of practice, contact information, and credentials — directly from the Legal Portal profile page. Changes are saved to the users table in real time.',
      },
      {
        heading: 'Kampi Chatbot Scope Restriction',
        body: 'A bug was fixed where Kampi answered non-legal questions including coding and general knowledge queries. A system prompt constraint was added to the Groq API call in kampi_service.py, restricting responses to Philippine legal topics. Out-of-scope questions receive a polite redirect.',
      },
      {
        heading: 'Significance',
        body: 'This update completed the core citizen-attorney interaction loop: citizen files a case via triage → attorney is assigned → they communicate via messages → attorney manages the case to resolution. The platform became functionally usable for its intended purpose in this sprint.',
      },
    ],
  },
  {
    num: 7,
    title: 'Admin Tools, System Settings, Audit Logs & Stability',
    period: 'May 3–8, 2026',
    commits: ['cd190db', 'e335db7', '2d1366d', '34bea50'],
    summary: 'The full administrative toolset was completed: system-wide feature flags, maintenance mode, database backup/restore, an immutable audit log, and stability fixes for the Rights Library and pro-bono hour tracking.',
    sections: [
      {
        heading: 'System Settings & Feature Flags',
        body: 'Administrators can now control platform behavior through /admin/settings. Settings are stored in the system_settings table as key-value pairs and read by the frontend at every route load. Available toggles: Maintenance Mode (takes the platform offline for non-admins), New Registrations, Kampi Chatbot, Document Generator, and Email Notification configuration. Changes take effect immediately without a server restart.',
      },
      {
        heading: 'Backup & Restore',
        body: 'The System Settings page includes a Backup & Restore panel. Download Backup triggers a full database export via Supabase\'s API as a downloadable .sql file. Upload Backup initiates a restore operation from a previously exported file, gated behind a confirmation dialog to prevent accidental overwrites.',
      },
      {
        heading: 'Audit Logs',
        body: 'A new audit_logs table was added with strict RLS: any authenticated user can INSERT their own events, only Super Administrators can SELECT, and DELETE/UPDATE is denied for all — making the log immutable. Logged events include: logins/logouts, account creation and deletion, case status changes, document generation, attorney verification decisions, and admin setting changes. Each entry captures event type, user ID, detail text, and IP address. The Admin Logs page provides date range, action type, and user filters, plus CSV export.',
      },
      {
        heading: 'Rights Library Fixes',
        body: 'The Rights Library was refactored to fix two bugs: (1) category filtering was not resetting the article list on category change due to a state management issue; (2) article search was previously title-only and was updated to search both title and body content. Article cards were also restyled for consistent category tag display.',
      },
      {
        heading: 'Pro-Bono Hours Tracking Fix',
        body: 'The Pro-Bono Hub\'s hour aggregation was corrected. The previous query double-counted entries linked to cases with multiple status changes. The fix rewrites the aggregation to sum unique service log entries by ID, ensuring each hour entry is counted exactly once.',
      },
      {
        heading: 'Full Testing Pass',
        body: 'A complete frontend and backend testing cycle was conducted. Playwright E2E tests were run across all three portals. pytest was run on the FastAPI backend. Issues identified — a profile save bug, a file upload content-type error, and an edge case in triage submission — were resolved in a follow-up commit.',
      },
      {
        heading: 'Significance',
        body: 'This update completed the administrative layer. With audit logs, feature flags, and backup/restore in place, JusticeLink meets the operational requirements for a production deployment: administrators can monitor activity, control access, maintain compliance records, and recover from data issues without developer intervention.',
      },
    ],
  },
];

// ── CSS ───────────────────────────────────────────────────────────────────────
const CSS = `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 11pt;
  color: #1a1a2e;
  background: #fff;
  line-height: 1.65;
}

/* Cover */
.cover {
  page-break-after: always;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  color: #fff;
  padding: 60px;
}
.cover-logo { font-size: 48pt; font-weight: 700; letter-spacing: -1px; margin-bottom: 12px; }
.cover-logo span { color: #e94560; }
.cover-subtitle { font-size: 14pt; color: rgba(255,255,255,0.7); margin-bottom: 48px; font-weight: 400; }
.cover-meta {
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 12px;
  padding: 28px 44px;
  text-align: left;
}
.cover-meta p { margin: 6px 0; color: rgba(255,255,255,0.8); font-size: 11pt; }
.cover-meta strong { color: #fff; }
.cover-badge {
  margin-top: 36px;
  background: #e94560;
  color: #fff;
  font-size: 9pt;
  font-weight: 600;
  padding: 6px 20px;
  border-radius: 999px;
  letter-spacing: 1px;
  text-transform: uppercase;
}

/* TOC page */
.toc-page { page-break-after: always; padding: 48px 56px; }
.page-title { font-size: 24pt; font-weight: 700; color: #1a1a2e; margin-bottom: 6px; }
.title-rule { height: 3px; background: linear-gradient(to right, #e94560, #0f3460); border-radius: 2px; margin-bottom: 28px; }
.toc-table { width: 100%; border-collapse: collapse; font-size: 10.5pt; }
.toc-table th { background: #1a1a2e; color: #fff; padding: 10px 14px; text-align: left; font-size: 9.5pt; }
.toc-table th:first-child { width: 60px; text-align: center; border-radius: 6px 0 0 0; }
.toc-table th:last-child { border-radius: 0 6px 0 0; }
.toc-table td { padding: 11px 14px; border-bottom: 1px solid #e8ecf4; vertical-align: top; }
.toc-table tr:nth-child(even) td { background: #f8f9fc; }
.toc-table td:first-child { text-align: center; font-weight: 700; color: #4361ee; font-size: 12pt; }
.toc-date { color: #888; font-size: 9.5pt; margin-top: 3px; }
.toc-summary { color: #555; font-size: 10pt; margin-top: 3px; }

/* Update section */
.update-section { page-break-before: always; padding: 40px 56px 48px; }
.update-label { font-size: 9pt; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #e94560; margin-bottom: 6px; }
.update-title { font-size: 22pt; font-weight: 700; color: #1a1a2e; line-height: 1.2; margin-bottom: 6px; }
.update-rule { height: 3px; background: linear-gradient(to right, #e94560, transparent); border-radius: 2px; margin: 14px 0 24px; }

/* Meta strip */
.meta-strip {
  display: flex; gap: 24px; align-items: center;
  background: #f4f6fb; border: 1px solid #e0e6f4; border-radius: 8px;
  padding: 14px 18px; margin-bottom: 28px; flex-wrap: wrap;
}
.meta-chip { display: flex; gap: 8px; align-items: center; }
.meta-chip-label { font-size: 8.5pt; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7eb8; }
.meta-chip-value { font-size: 10pt; color: #1a1a2e; font-weight: 500; }
.commit-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.commit-tag {
  display: inline-block; background: #eef0ff; color: #4361ee;
  font-family: 'Courier New', monospace; font-size: 8pt;
  padding: 2px 8px; border-radius: 4px; font-weight: 600;
}

/* summary callout */
.summary-callout {
  background: #f0f4ff; border-left: 4px solid #4361ee;
  border-radius: 0 8px 8px 0; padding: 14px 18px; margin-bottom: 28px;
  font-size: 11pt; color: #1a2a6c; font-style: italic; line-height: 1.6;
}

/* content block */
.block { margin-bottom: 22px; }
.block-heading {
  font-size: 12pt; font-weight: 700; color: #0f3460;
  border-bottom: 2px solid #e0e6f4; padding-bottom: 6px; margin-bottom: 10px;
}
.block p { font-size: 10.5pt; color: #333; line-height: 1.65; }
.block ul { padding-left: 0; list-style: none; }
.block li {
  display: flex; gap: 12px; font-size: 10.5pt; color: #333;
  padding: 7px 0; border-bottom: 1px solid #f0f2f8; line-height: 1.5;
}
.block li:last-child { border-bottom: none; }
.li-label { font-weight: 600; color: #1a1a2e; min-width: 180px; flex-shrink: 0; }
.li-detail { color: #555; }

/* significance block */
.significance {
  background: #fff9f0; border-left: 4px solid #f9a825;
  border-radius: 0 8px 8px 0; padding: 14px 18px; margin-top: 24px;
}
.significance .block-heading { color: #7a5800; border-color: #ffe082; }
.significance p { color: #5a4000; }

/* screenshots */
.screenshots-block { margin-top: 30px; }
.screenshots-label {
  font-size: 9pt; font-weight: 700; text-transform: uppercase;
  letter-spacing: 1px; color: #6b7eb8; margin-bottom: 14px;
  padding-bottom: 6px; border-bottom: 2px solid #e0e6f4;
}
.screenshot-item { margin-bottom: 28px; }
.screenshot-wrap {
  border: 1px solid #dde3f0; border-radius: 10px; overflow: hidden;
  box-shadow: 0 4px 16px rgba(0,0,0,0.08);
}
.screenshot-wrap img { display: block; width: 100%; }
.screenshot-caption {
  font-size: 9.5pt; color: #555; font-style: italic;
  margin-top: 8px; text-align: center; line-height: 1.4;
}

/* Summary table */
.summary-page { page-break-before: always; padding: 48px 56px; }
.summary-table { width: 100%; border-collapse: collapse; font-size: 10pt; margin-top: 24px; }
.summary-table th { background: #1a1a2e; color: #fff; padding: 10px 14px; text-align: left; font-size: 9.5pt; }
.summary-table th:first-child { border-radius: 6px 0 0 0; width: 70px; text-align: center; }
.summary-table th:last-child { border-radius: 0 6px 0 0; }
.summary-table td { padding: 11px 14px; border-bottom: 1px solid #e8ecf4; vertical-align: top; }
.summary-table tr:nth-child(even) td { background: #f8f9fc; }
.summary-table td:first-child { text-align: center; font-weight: 700; color: #4361ee; }

@media print {
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
`;

// ── HTML builder ──────────────────────────────────────────────────────────────
function buildHTML(updates, screenshotMap) {
  // TOC rows
  let tocRows = '';
  for (const u of updates) {
    tocRows += `<tr>
      <td>${u.num}</td>
      <td>
        <strong>${u.title}</strong>
        <div class="toc-date">${u.period}</div>
        <div class="toc-summary">${u.summary.slice(0, 120)}…</div>
      </td>
    </tr>`;
  }

  // Update sections
  let sections = '';
  for (const u of updates) {
    const commitTags = u.commits.map(c => `<span class="commit-tag">${c}</span>`).join('');
    const shots = screenshotMap[u.num] || [];

    // Content blocks
    let blocks = `<div class="summary-callout">${u.summary}</div>`;
    for (const sec of u.sections) {
      const isSignificance = sec.heading === 'Significance';
      const cls = isSignificance ? 'block significance' : 'block';
      let inner = '';
      if (sec.body) {
        inner = `<p>${sec.body}</p>`;
      } else if (sec.items) {
        inner = `<ul>${sec.items.map(item =>
          `<li><span class="li-label">${item.label}</span><span class="li-detail">${item.detail}</span></li>`
        ).join('')}</ul>`;
      }
      blocks += `<div class="${cls}"><div class="block-heading">${sec.heading}</div>${inner}</div>`;
    }

    // Screenshots
    let ssHTML = '';
    if (shots.length > 0) {
      ssHTML = `<div class="screenshots-block"><div class="screenshots-label">Screenshots — Current System State</div>`;
      for (const s of shots) {
        const b64 = imgToBase64(s.file);
        if (b64) {
          ssHTML += `<div class="screenshot-item">
            <div class="screenshot-wrap"><img src="${b64}" alt="${s.caption}" /></div>
            <div class="screenshot-caption">${s.caption}</div>
          </div>`;
        }
      }
      ssHTML += `</div>`;
    }

    sections += `
<div class="update-section">
  <div class="update-label">Update ${u.num}</div>
  <div class="update-title">${u.title}</div>
  <div class="update-rule"></div>

  <div class="meta-strip">
    <div class="meta-chip">
      <span class="meta-chip-label">Period</span>
      <span class="meta-chip-value">${u.period}</span>
    </div>
    <div class="meta-chip">
      <span class="meta-chip-label">Commits</span>
      <span class="commit-chips">${commitTags}</span>
    </div>
  </div>

  ${blocks}
  ${ssHTML}
</div>`;
  }

  // Summary table
  const summaryRows = [
    [1, 'Mar 10–11', 'Project init, monorepo, UI foundation, design system'],
    [2, 'Mar 17–21', 'PH localization, branding, profile pages, pro-bono bar, mobile responsiveness'],
    [3, 'Mar 28–29', 'Supabase integration, database schema, RLS policies, chatbot UI, admin portal shell'],
    [4, 'Apr 2–8',   'Didit ID verification, Supabase Auth, attorney manual verification, Groq initialization'],
    [5, 'Apr 25–28', 'AI document generator (11 templates), real profile data, OCR address normalization, 28-day edit lock'],
    [6, 'May 1–2',   'AI triage system, real-time messaging, case management, case history, document uploads'],
    [7, 'May 3–8',   'System settings, feature flags, backup/restore, audit logs, Rights Library fix, full test pass'],
  ].map(([n, period, features]) => `<tr>
    <td>${n}</td><td>${period}</td><td>${features}</td>
  </tr>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>JusticeLink System Updates</title>
<style>${CSS}</style>
</head>
<body>

<!-- Cover -->
<div class="cover">
  <div class="cover-logo">Justice<span>Link</span></div>
  <div class="cover-subtitle">Previous System Updates</div>
  <div class="cover-meta">
    <p><strong>Document:</strong> System Updates &amp; Feature History</p>
    <p><strong>Updates Covered:</strong> 7 major releases</p>
    <p><strong>Period:</strong> March 10 – May 8, 2026</p>
    <p><strong>Total Commits:</strong> 70+</p>
    <p><strong>Generated:</strong> ${new Date().toLocaleDateString('en-PH', { year:'numeric', month:'long', day:'numeric' })}</p>
  </div>
  <div class="cover-badge">JusticeLink — Legal Aid Platform — Philippines</div>
</div>

<!-- Table of Contents -->
<div class="toc-page">
  <div class="page-title">Table of Contents</div>
  <div class="title-rule"></div>
  <table class="toc-table">
    <thead><tr><th>#</th><th>Update</th></tr></thead>
    <tbody>${tocRows}</tbody>
  </table>
</div>

${sections}

<!-- Summary Table -->
<div class="summary-page">
  <div class="page-title">Summary of All Updates</div>
  <div class="title-rule"></div>
  <table class="summary-table">
    <thead>
      <tr><th>#</th><th>Period</th><th>Key Features &amp; Changes</th></tr>
    </thead>
    <tbody>${summaryRows}</tbody>
  </table>
</div>

</body>
</html>`;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('Building System Updates PDF...');
  const html = buildHTML(UPDATES, UPDATE_SCREENSHOTS);

  const browser = await chromium.launch({ headless: true });
  const page    = await browser.newPage();
  await page.setContent(html, { waitUntil: 'load' });

  fs.mkdirSync(DOCS_DIR, { recursive: true });
  await page.pdf({
    path: OUTPUT_PDF,
    format: 'A4',
    printBackground: true,
    margin: { top: '15mm', bottom: '15mm', left: '15mm', right: '15mm' },
  });

  await browser.close();
  console.log(`Done! PDF saved to:\n  ${OUTPUT_PDF}`);
}

main().catch(err => { console.error(err); process.exit(1); });

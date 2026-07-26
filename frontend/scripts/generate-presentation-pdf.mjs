/**
 * JusticeLink System Updates — Plain Presentation PDF
 * Usage: node scripts/generate-presentation-pdf.mjs
 * Output: documentation/JusticeLink_System_Updates.pdf
 */

import { chromium } from 'playwright';
import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const DOCS_DIR   = path.resolve(__dirname, '../../documentation');
const SS_DIR     = path.join(DOCS_DIR, 'screenshots');
const OUTPUT_PDF = path.join(DOCS_DIR, 'JusticeLink_System_Updates.pdf');

function img(filename) {
  const p = path.join(SS_DIR, filename);
  if (!fs.existsSync(p)) return null;
  return `data:image/png;base64,${fs.readFileSync(p).toString('base64')}`;
}

// ── CSS ───────────────────────────────────────────────────────────────────────

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Inter', Arial, sans-serif;
    font-size: 11pt;
    color: #111;
    background: #fff;
    line-height: 1.65;
    padding: 0 60px;
  }

  h1 { font-size: 26pt; font-weight: 700; margin-bottom: 8px; }
  h2 { font-size: 16pt; font-weight: 700; margin: 32px 0 8px; }
  h3 { font-size: 12pt; font-weight: 700; margin: 24px 0 6px; }
  h4 { font-size: 11pt; font-weight: 700; margin: 18px 0 4px; }

  p  { margin-bottom: 10px; font-size: 11pt; color: #222; }
  ul, ol { padding-left: 22px; margin-bottom: 10px; }
  li { margin-bottom: 5px; font-size: 11pt; color: #222; line-height: 1.6; }

  hr { border: none; border-top: 1px solid #ccc; margin: 32px 0; }

  .cover {
    page-break-after: always;
    padding: 80px 0 60px;
  }
  .cover-title { font-size: 30pt; font-weight: 700; margin-bottom: 6px; }
  .cover-sub   { font-size: 13pt; color: #555; margin-bottom: 32px; }
  .cover-meta  { font-size: 11pt; line-height: 2; color: #333; }
  .cover-meta strong { color: #111; }

  .section { page-break-before: always; padding-top: 48px; }

  .update-heading { font-size: 12pt; font-weight: 700; margin: 28px 0 6px; }
  .update-body    { font-size: 11pt; color: #222; margin-bottom: 4px; }

  .ss-title { font-size: 13pt; font-weight: 700; margin: 32px 0 10px; }
  .ss-img {
    width: 100%;
    border: 1px solid #ccc;
    border-radius: 6px;
    display: block;
    margin-bottom: 12px;
  }
  .ss-missing {
    border: 2px dashed #bbb;
    border-radius: 6px;
    padding: 32px;
    text-align: center;
    color: #888;
    font-size: 10pt;
    margin-bottom: 12px;
  }
  .discussion-label { font-weight: 700; }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
`;

// ── HTML ──────────────────────────────────────────────────────────────────────

function buildHTML() {
  const date = new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });

  // ── Section 3 screenshots ────────────────────────────────────────────────────
  const screenshots = [
    {
      letter: 'A',
      title: 'Admin Case Management Interface',
      file: '35_admin_case_management.png',
      fallback: '30_admin_dashboard.png',
      discussion: `This screenshot shows the newly added Admin Case Management page at <strong>/admin/cases</strong>. The page gives Super Administrators a system-wide view of all cases filed on the platform — not limited to any single user's caseload. At the top are four KPI summary cards: Total Cases, Pending Triage, Active Cases, and Closed Cases, allowing administrators to assess overall platform activity at a glance. The main table lists each case with its title, the AI-identified issue type from the triage assessment, the client's name, the assigned attorney (or "Unassigned" if none), a color-coded status badge, and the date the case was filed. Every row includes an Assign or Reassign button that opens the attorney selection modal. This page was missing from the Admin Portal prior to Update 8, meaning administrators had no UI path to assign attorneys — the only way to set the <code>attorney_id</code> field was directly in the database.`,
    },
    {
      letter: 'B',
      title: 'Attorney Assignment Modal',
      file: '36_admin_case_assign_modal.png',
      fallback: '32_admin_attorney_verifications.png',
      discussion: `This screenshot highlights the attorney assignment modal that opens when an administrator clicks Assign on a case row. The top section displays the case context — current status, client name, and issue type — so the administrator has the relevant information without navigating away. The body of the modal lists all Volunteer Attorney accounts whose credentials have been verified by an administrator, presented as a radio-button list with each attorney's full name, IBP number, and email address. Unverified attorneys are excluded, ensuring that only fully approved practitioners are assigned to citizen cases. Upon confirming the selection, the system writes the attorney's ID to the <code>cases</code> table, updates the case status to "In Progress," creates a <code>message_threads</code> record linking both the citizen and the attorney, and logs the action to the Audit Trail. The assignment is reflected immediately across all portals.`,
    },
    {
      letter: 'C',
      title: 'Citizen Dashboard — Post-Assignment Notification',
      file: '10_citizen_dashboard.png',
      discussion: `This screenshot demonstrates the citizen's perspective after an administrator assigns an attorney to their case. Upon assignment, the system inserts a notification into the <code>notifications</code> table for the citizen informing them that their case has been assigned to an attorney, with a direct link to the Messages section. The notification bell in the top navigation bar reflects the new unread alert, and the notification appears on the citizen's Notifications page. This step is important because it closes the communication gap — the citizen no longer needs to repeatedly check their case status to know whether an attorney has been matched. Instead, they are actively informed and can immediately begin communicating with their attorney via the message thread that was automatically created during the assignment.`,
    },
    {
      letter: 'D',
      title: 'Attorney Portal — Newly Assigned Case',
      file: '21_attorney_cases.png',
      discussion: `This screenshot shows the My Cases page of the Attorney Portal after the admin has completed the assignment. The case that was previously in "Pending Triage" status — invisible to the attorney under the existing Row-Level Security rules — now appears in their caseload with a status of "In Progress." From this point, the attorney can update the case status through the full lifecycle (In Progress → Hearing Scheduled → Demand Sent → Closed), upload supporting documents, log pro-bono service hours, and message the client directly. The attorney does not need to take any action to accept or acknowledge the assignment; the case simply becomes available in their portal as a result of the admin's action, reducing friction in the case intake process.`,
    },
    {
      letter: 'E',
      title: 'Audit Logs — Case Assignment Entry',
      file: '33_admin_audit_logs.png',
      discussion: `This screenshot shows the Audit Logs page confirming that the attorney assignment action is permanently recorded. The entry carries the action type <code>case_assigned</code>, the full name and email of the administrator who performed the action, a human-readable detail string that includes the case title and the shortened case UUID, and a precise timestamp. This record cannot be modified or deleted by any user, including Super Administrators — the existing Row-Level Security policy on the <code>audit_logs</code> table denies UPDATE and DELETE for all roles. This guarantees a tamper-proof chain of accountability: for every case assignment in the system, there is a permanent, attributable record of who made the decision and when it was made, meeting the platform's compliance requirements for a production legal aid environment.`,
    },
  ];

  const ssHTML = screenshots.map(s => {
    const b64 = img(s.file) ?? img(s.fallback ?? '');
    const imgTag = b64
      ? `<img class="ss-img" src="${b64}" alt="${s.title}" />`
      : `<div class="ss-missing">Screenshot not yet captured — run: <em>npm run docs:screenshots</em><br>Expected: <em>${s.file}</em></div>`;
    return `
      <h3>${s.letter}. ${s.title}</h3>
      ${imgTag}
      <p><span class="discussion-label">Discussion &amp; Explanation:</span><br>
      ${s.discussion}</p>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>JusticeLink Platform: System Updates</title>
<style>${CSS}</style>
</head>
<body>

<!-- ── COVER ── -->
<div class="cover">
  <div class="cover-title">JusticeLink Platform: System Updates</div>
  <div class="cover-sub">Legal Aid Platform — Republic of the Philippines</div>
  <div class="cover-meta">
    <strong>Submitted by:</strong> Uy, Lance Jefferson R.<br>
    <strong>Course &amp; Section:</strong> ITE-231<br>
    <strong>Date:</strong> ${date}
  </div>
</div>

<!-- ══════════════════════════════════════════════════════════ -->
<!-- SECTION 1: PREVIOUS SYSTEM UPDATES                        -->
<!-- ══════════════════════════════════════════════════════════ -->
<div class="section">
<h1>1. Previous System Updates</h1>

<h3>Project Initialization &amp; UI Foundation</h3>
<p><strong>Update:</strong> Bootstrapped the full-stack monorepo and established the application's visual design system.</p>
<p><strong>Documentation:</strong> The project was initialized as a single repository containing both the React 19 + Vite + TypeScript frontend and the FastAPI + Python backend, managed by shared root scripts using <code>concurrently</code>. A complete first-pass UI was built for all primary user-facing pages — the landing page, Login, Register, Forgot Password, and skeleton portal layouts for the Citizen, Attorney, and Admin roles. The dark navy (<code>#1a1a2e</code>) and red-accent (<code>#e94560</code>) color palette, Inter typeface, and Lucide icon set were established as the platform's visual language. Agreeing on the design system at this stage prevented costly rework as the feature set scaled.</p>

<h3>Philippine Localization, Branding &amp; Pro-Bono Tracking</h3>
<p><strong>Update:</strong> Localized all content to the Philippine legal context and introduced pro-bono hour tracking for attorney compliance.</p>
<p><strong>Documentation:</strong> All placeholder text was replaced with Philippine-specific content: references to local legislation (Labor Code, Family Code, RA 9262, RA 8792), Philippine peso amounts, and barangay terminology. The brand was unified under "JusticeLink-PH" across all pages and metadata. The Login and Register pages were redesigned with a premium split-screen layout. A dedicated profile page was added for both Citizens and Attorneys. A visual progress bar was introduced on the Attorney Portal to track hours logged toward the IBP-mandated 60-hour/3-year pro-bono requirement — the first implementation of compliance tracking in the system. The Public Dashboard was also rebuilt to be mobile-responsive.</p>

<h3>Supabase Integration, Database Schema &amp; Chatbot UI</h3>
<p><strong>Update:</strong> Connected the PostgreSQL database for the first time and introduced the floating AI chatbot component.</p>
<p><strong>Documentation:</strong> The Supabase JavaScript client was integrated into the frontend as a single <code>supabaseClient.ts</code> module. The initial database schema was created covering the <code>users</code>, <code>cases</code>, <code>message_threads</code>, <code>messages</code>, and <code>thread_participants</code> tables. Row-Level Security (RLS) policies were established at this stage to enforce data isolation — Citizens can only see their own cases, Attorneys can only see assigned cases, and Admins have full access. The <code>KampiFloatingChat</code> component was added as a persistent floating button in the bottom-right corner of authenticated pages, with mocked responses at this stage. Connecting Supabase was the turning point from a static prototype to a real application; the RLS policies defined here became the security foundation for all subsequent work.</p>

<h3>Authentication Backend &amp; Didit ID Verification</h3>
<p><strong>Update:</strong> Implemented full end-to-end authentication including government ID verification for citizens and manual credential review for attorneys.</p>
<p><strong>Documentation:</strong> Citizens register by completing Didit's hosted ID verification flow: they photograph their Philippine government ID and take a selfie, Didit's OCR engine extracts the data and performs a face match, and a webhook notifies the FastAPI backend to finalize account creation with <code>is_didit_verified = true</code>. Attorneys follow a separate path — they upload their IBP membership card and a selfie for admin review; the account is created in an <code>unverified</code> state until approved. The Groq API (<code>llama-3.3-70b-versatile</code>) was connected to the backend for the first time. This update required coordinating three separate systems (frontend, FastAPI backend, and Didit's external API) with webhook callbacks and polling, making it the most complex integration effort to date.</p>

<h3>AI Document Generator, Triage System &amp; Real-Time Messaging</h3>
<p><strong>Update:</strong> Built the three core citizen-facing features: AI-assisted legal document drafting, AI-powered case triage, and real-time messaging with assigned attorneys.</p>
<p><strong>Documentation:</strong> The document generator allows citizens to produce ready-to-use legal draft letters by selecting from 11+ templates (covering Housing, Labor, Family, Consumer, Cybercrime, and Barangay issues) and filling in a short form. Groq LLM generates a natural-language draft, with a fallback to template string interpolation if the API call fails. The triage flow guides citizens through a questionnaire (issue category, description, urgency), sends responses to Groq for assessment, and creates a <code>cases</code> record with status <code>'Pending Triage'</code>. Real-time messaging between citizens and assigned attorneys was implemented using Supabase Realtime; message threads are linked to cases and secured by RLS. Attorneys received a full case lifecycle workflow — status updates, document uploads, case closure, and case history. The Kampi chatbot was also scoped exclusively to Philippine legal topics by adding a system prompt constraint in <code>kampi_service.py</code>.</p>

<h3>Admin Tools, System Settings &amp; Audit Logs</h3>
<p><strong>Update:</strong> Completed the administrative toolset with system-wide settings, feature flags, database backup/restore, and an immutable audit log.</p>
<p><strong>Documentation:</strong> Administrators can now control platform-wide behavior through a dedicated Settings page. Available feature flags include Maintenance Mode, New Registrations, the Kampi Chatbot, and the Document Generator — all stored as key-value pairs in the <code>system_settings</code> table and read on each route load, taking effect without a server restart. A Backup &amp; Restore panel allows administrators to download a full database export or restore from a previously saved backup, gated behind a confirmation dialog. An immutable <code>audit_logs</code> table was added with RLS policies that allow any authenticated user to INSERT their own events but deny UPDATE and DELETE for all roles — only Super Administrators can SELECT. Logged events include logins, logouts, case status changes, document generation, attorney verification decisions, and setting changes. Stability fixes in this sprint addressed a Rights Library category filter bug and a pro-bono hour double-counting error. A full Playwright end-to-end and pytest backend testing pass was completed.</p>

</div>

<hr />

<!-- ══════════════════════════════════════════════════════════ -->
<!-- SECTION 2: LATEST SYSTEM UPDATE                           -->
<!-- ══════════════════════════════════════════════════════════ -->
<div class="section">
<h1>2. Latest System Update</h1>

<h3>Admin Case Management &amp; Attorney Assignment</h3>
<p><strong>Update:</strong> Added a dedicated Case Management page to the Admin Portal that gives Super Administrators a system-wide view of all cases and a complete workflow for assigning verified attorneys to citizens waiting in the "Pending Triage" queue.</p>

<p><strong>Detailed Explanation &amp; Documentation:</strong></p>

<ol>
  <li>
    <strong>Admin Case Management Page (<code>/admin/cases</code>):</strong> A new "Case Management" navigation item was added to the Admin Portal sidebar. The page displays all cases across all citizens and attorneys in a single table — a capability enabled by the existing <code>cases_admin_all</code> Row-Level Security policy that grants Super Administrators unrestricted read and write access to the <code>cases</code> table. Four KPI summary cards at the top show Total Cases, Pending Triage, Active Cases, and Closed Cases. A free-text search bar matches against case titles and client names, and a status dropdown filters the table to any single case status. Every row in the table includes an Assign or Reassign button that opens the attorney selection modal.
  </li>
  <li>
    <strong>Attorney Assignment Modal:</strong> When an administrator opens the assignment modal, it displays the case's current status, client name, and AI-identified issue type for context. The attorney list shows all <code>Volunteer Attorney</code> accounts with <code>status_verification = 'verified'</code>, displayed with each attorney's name, IBP number, and email as selectable radio-button options. Unverified attorneys are excluded. Confirming the selection writes the chosen attorney's ID to <code>cases.attorney_id</code> and updates the case status to <code>"In Progress"</code> in the same database call.
  </li>
  <li>
    <strong>Automatic Message Thread Creation:</strong> After a successful assignment, the system checks whether a <code>message_threads</code> record already exists for the case. If none is found, it creates one and inserts both the citizen and the attorney as <code>thread_participants</code>. This ensures the private messaging channel between the citizen and attorney is ready for immediate use without any additional steps from either party.
  </li>
  <li>
    <strong>Client Assignment Notification:</strong> A notification is inserted into the <code>notifications</code> table for the citizen informing them that their case has been assigned to an attorney, with a direct action link to <code>/public/messages</code>. This alert appears on the citizen's Notifications page and increments the notification bell badge, proactively informing them of the match rather than requiring them to check their case status manually.
  </li>
  <li>
    <strong>Audit Trail Integration:</strong> Every assignment action is permanently recorded in the <code>audit_logs</code> table with action type <code>case_assigned</code>, including the case title, the shortened case UUID, and the full name of the assigned attorney. This ensures that all assignment decisions are attributable to the administrator who performed them and cannot be altered or removed after the fact.
  </li>
</ol>

</div>

<hr />

<!-- ══════════════════════════════════════════════════════════ -->
<!-- SECTION 3: SCREENSHOTS AND DOCUMENTATION                  -->
<!-- ══════════════════════════════════════════════════════════ -->
<div class="section">
<h1>3. Screenshots and Documentation</h1>

${ssHTML}

</div>

</body>
</html>`;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Building HTML...');
  const html = buildHTML();

  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const page    = await browser.newPage();
  await page.setContent(html, { waitUntil: 'load' });

  fs.mkdirSync(DOCS_DIR, { recursive: true });

  console.log('Rendering PDF...');
  await page.pdf({
    path: OUTPUT_PDF,
    format: 'A4',
    printBackground: true,
    margin: { top: '20mm', bottom: '20mm', left: '20mm', right: '20mm' },
  });

  await browser.close();
  console.log(`\n✓ PDF saved to:\n  ${OUTPUT_PDF}\n`);
}

main().catch(err => { console.error(err); process.exit(1); });

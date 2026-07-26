/**
 * JusticeLink Page Documentation PDF Generator
 *
 * Navigates every portal page, dynamically extracts page structure
 * (headings, buttons, inputs), embeds existing screenshots, and exports
 * a single A4 PDF to documentation/JusticeLink_Page_Documentation.pdf
 *
 * Usage (dev server must be running on port 5173):
 *   node scripts/generate-pdf.mjs
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL   = 'http://localhost:5173';
const DOCS_DIR   = path.resolve(__dirname, '../../documentation');
const SS_DIR     = path.join(DOCS_DIR, 'screenshots');
const AUTH_DIR   = path.resolve(__dirname, '../tests/.auth');
const OUTPUT_PDF = path.join(DOCS_DIR, 'JusticeLink_Page_Documentation.pdf');

// ── Page definitions ──────────────────────────────────────────────────────────

const PAGES = [
  // ── Authentication ──────────────────────────────────────────────────────────
  {
    num: 1, section: 'Authentication & Public Pages',
    name: 'Landing Page',
    route: '/',
    auth: 'guest',
    access: 'Public — no authentication required. All visitors can access this page.',
    purpose: 'Marketing homepage that introduces JusticeLink\'s mission and directs visitors to register or sign in.',
    userFlow:
      'A first-time visitor reads the hero section, learns about the platform\'s three core features ' +
      '(AI-powered legal triage, Didit identity verification, and document generation), and clicks either ' +
      '"Get Help" to register as a Citizen or "Volunteer" to register as an attorney.',
    screenAreas: [
      'Hero section with mission statement and two primary CTAs: Get Help and Volunteer.',
      'Feature overview cards: AI-powered triage, Didit ID verification, legal document generator.',
      '"How It Works" section explaining the 3-step process for citizens.',
      'Navigation bar with Login and Register links.',
      'Footer with contact and legal information.',
    ],
    notes:
      'The landing page is fully public and does not redirect authenticated users. ' +
      'Authenticated users can still navigate to their portal via the Login or sidebar links.',
    screenshot: '00_landing.png',
  },
  {
    num: 2, section: 'Authentication & Public Pages',
    name: 'Login',
    route: '/login',
    auth: 'guest',
    access: 'Guest-only route. Authenticated users are automatically redirected to their role dashboard.',
    purpose: 'Email and password authentication entry point for Citizens, Attorneys, and Administrators.',
    userFlow:
      'A returning user enters their registered email and password and clicks Sign In. ' +
      'The system validates credentials via Supabase Auth and reads the user\'s role from the ' +
      'users table, then redirects to /public/dashboard, /legal/dashboard, or /admin/dashboard accordingly.',
    screenAreas: [
      'Email address input field.',
      'Password input field with show/hide toggle.',
      'Sign In submit button.',
      '"Forgot password?" link navigating to /forgot-password.',
      '"Don\'t have an account? Register" link navigating to /register.',
      'Inline error alert for invalid credentials.',
    ],
    notes:
      'Authentication is handled by Supabase Auth (email/password). On success, the JWT token is ' +
      'stored in browser localStorage. Failed login shows an inline error without redirecting.',
    screenshot: '01_login.png',
  },
  {
    num: 3, section: 'Authentication & Public Pages',
    name: 'Register',
    route: '/register',
    auth: 'guest',
    access: 'Guest-only route. Authenticated users are redirected to their role dashboard.',
    purpose: 'New account creation for Citizens (Didit ID verification) and Volunteer Attorneys (manual credential review).',
    userFlow:
      'A new user selects their account type — Citizen or Volunteer Attorney. Citizens fill in personal ' +
      'details and a Philippine address, then are redirected to Didit\'s hosted ID verification flow ' +
      '(OCR + face match). Attorneys fill in IBP number, bar roll number, and upload credential photos ' +
      'for admin review. After verification, the user receives an email confirmation.',
    screenAreas: [
      'Account type selector: Citizen vs. Volunteer Attorney.',
      'Personal details form: first name, last name, email, password.',
      'Philippine address selector: Region → Province → City/Municipality → Barangay (cascading dropdowns).',
      'Citizen-specific: Didit ID verification redirect flow.',
      'Attorney-specific: IBP number, bar roll number, IBP card photo upload, selfie upload.',
    ],
    notes:
      'Philippine regional address data uses the select-philippines-address npm package. ' +
      'Citizens cannot access the portal until Didit verification is approved. ' +
      'Attorneys need admin approval before accessing the legal portal.',
    screenshot: '02_register.png',
  },
  {
    num: 4, section: 'Authentication & Public Pages',
    name: 'Forgot Password',
    route: '/forgot-password',
    auth: 'guest',
    access: 'Public route accessible only to unauthenticated users.',
    purpose: 'Password recovery screen for users who cannot access their account.',
    userFlow:
      'The user enters their registered email address and clicks Send Reset Link. ' +
      'Supabase Auth sends a password reset email. The user follows the link in the email to ' +
      'set a new password and is redirected back to the login page.',
    screenAreas: [
      'Email address input field.',
      'Send Reset Link submit button.',
      '"Back to Login" navigation link.',
      'Success confirmation banner displayed after a valid submission.',
    ],
    notes:
      'Reset links expire after 1 hour (Supabase default). ' +
      'Users who registered via Didit may need to re-verify their identity after a password reset ' +
      'if their session has expired.',
    screenshot: '03_forgot_password.png',
  },

  // ── Citizen Portal ──────────────────────────────────────────────────────────
  {
    num: 5, section: 'Citizen Portal',
    name: 'Citizen Dashboard',
    route: '/public/dashboard',
    auth: 'public',
    access: 'Authenticated Citizen accounts only. Unauthenticated users are redirected to /login.',
    purpose: 'Central overview of a citizen\'s active cases, recent attorney communications, and quick-action shortcuts.',
    userFlow:
      'A logged-in citizen lands here after sign-in. They review active case statuses, read ' +
      'recent notifications from their attorney, and use quick-action cards to file a new case, ' +
      'generate a legal document, or open their message thread.',
    screenAreas: [
      'Active cases summary card showing case count and status badges.',
      'Recent notifications panel: latest attorney messages and case status updates.',
      'Quick action cards: Get Legal Help, Generate Document, View Messages.',
      'Sidebar navigation to all citizen portal sections.',
      'Top bar with user name, Didit verification badge, and notification bell.',
    ],
    notes:
      'Cases in "Pending Triage" status prompt the citizen to complete the triage questionnaire. ' +
      'The Didit verification badge confirms government ID verification.',
    screenshot: '10_citizen_dashboard.png',
  },
  {
    num: 6, section: 'Citizen Portal',
    name: 'Get Legal Help (Triage)',
    route: '/public/triage',
    auth: 'public',
    access: 'Authenticated Citizen accounts only.',
    purpose: 'AI-powered questionnaire that assesses a citizen\'s legal situation and formally files a case for attorney assignment.',
    userFlow:
      'The citizen answers a guided questionnaire about their legal issue — category (Labor, Housing, ' +
      'Family, Consumer, Cybercrime, etc.), detailed description, and urgency level. The AI engine ' +
      '(Groq llama-3.3-70b) analyzes responses and generates a case summary with attorney match ' +
      'percentage. Submitting formally files the case as "Pending Triage".',
    screenAreas: [
      'Legal issue category selector (tabbed or dropdown).',
      'Situation description text area.',
      'Urgency level selector (Low, Medium, High, Emergency).',
      'AI-generated case summary card with issue type and match percentage.',
      'Submit Case button to formally file.',
    ],
    notes:
      'Triage uses POST /api/documents/generate on the FastAPI backend. ' +
      'The assessment is stored in the triage_assessments table linked to the new case record. ' +
      'An attorney is assigned based on match percentage and availability.',
    screenshot: '11_citizen_triage.png',
  },
  {
    num: 7, section: 'Citizen Portal',
    name: 'Rights Library',
    route: '/public/rights',
    auth: 'public',
    access: 'Authenticated Citizen accounts only.',
    purpose: 'Searchable educational resource covering Philippine legal rights across multiple categories.',
    userFlow:
      'The citizen browses or searches for information about their legal rights. ' +
      'They filter by category and read plain-language explanations with references to relevant ' +
      'Philippine legislation (Labor Code, Family Code, RA 9262, RA 8792, etc.).',
    screenAreas: [
      'Keyword search bar.',
      'Category filter tabs: Labor, Housing, Family, Consumer, Civil Rights, Cybercrime.',
      'Article cards with title, category tag, and excerpt.',
      'Article detail view with full explanation, law references, and practical guidance.',
    ],
    notes:
      'Rights Library content is informational only and does not constitute legal advice. ' +
      'For case-specific guidance, citizens are directed to the triage flow.',
    screenshot: '12_citizen_rights_library.png',
  },
  {
    num: 8, section: 'Citizen Portal',
    name: 'Document Generator',
    route: '/public/documents',
    auth: 'public',
    access: 'Authenticated Citizen accounts only.',
    purpose: 'AI-assisted legal document drafting from predefined templates covering common Philippine legal situations.',
    userFlow:
      'The citizen selects a document template (e.g., Wage Claim Letter, Demand for Return of ' +
      'Security Deposit), fills in the required fields (names, dates, amounts), and clicks Generate. ' +
      'An AI-drafted document is produced within seconds and can be copied or downloaded.',
    screenAreas: [
      'Template category browser: Housing, Labor, Family, Consumer, Cybercrime, Barangay.',
      'Template card selector with 11+ available templates.',
      'Dynamic form with fields specific to the selected template.',
      'Generate Document button.',
      'Document preview panel with the drafted text.',
      'Copy to clipboard and Download buttons.',
    ],
    notes:
      'Generation uses Groq LLM via POST /api/documents/generate. ' +
      'If the AI request fails, the backend falls back to template string interpolation. ' +
      'Generated documents are saved to generated_documents and accessible from the Profile page.',
    screenshot: '13_citizen_document_generator.png',
  },
  {
    num: 9, section: 'Citizen Portal',
    name: 'Messages',
    route: '/public/messages',
    auth: 'public',
    access: 'Authenticated Citizen accounts only. Active only when a case with an assigned attorney exists.',
    purpose: 'Private messaging interface between the citizen and their assigned volunteer attorney.',
    userFlow:
      'The citizen selects a conversation thread from the left panel (each thread is linked to a case). ' +
      'They read the conversation history, type a new message, and click Send. ' +
      'The attorney receives the message in real time via Supabase Realtime.',
    screenAreas: [
      'Thread list panel on the left: all case-linked conversations with unread count badges.',
      'Active conversation panel on the right with full message history.',
      'Message composer: text input and Send button.',
      'Timestamp and read status per message bubble.',
    ],
    notes:
      'Messages are stored in the messages table. RLS restricts access to thread_participants only. ' +
      'Supabase Realtime delivers new messages without page refresh.',
    screenshot: '14_citizen_messages.png',
  },
  {
    num: 10, section: 'Citizen Portal',
    name: 'Notifications',
    route: '/public/notifications',
    auth: 'public',
    access: 'Authenticated Citizen accounts only.',
    purpose: 'Centralized alert feed for all activity on the citizen\'s account.',
    userFlow:
      'The citizen reviews all platform alerts in reverse chronological order: new attorney messages, ' +
      'case status changes, document generation completions, and system announcements. ' +
      'Clicking a notification navigates to the relevant page. "Mark all as read" clears the badge count.',
    screenAreas: [
      'Notification list in reverse chronological order.',
      'Notification type icons (message, case update, system alert).',
      'Mark All as Read button.',
      'Individual notification dismiss action.',
      'Empty state illustration when there are no unread notifications.',
    ],
    notes:
      'Notifications are stored in the notifications table and fetched on page load. ' +
      'The notification bell count in the top bar reflects the real-time unread count.',
    screenshot: '15_citizen_notifications.png',
  },
  {
    num: 11, section: 'Citizen Portal',
    name: 'Profile',
    route: '/public/profile',
    auth: 'public',
    access: 'Authenticated Citizen accounts only.',
    purpose: 'Personal account management: update personal information, view verification status, and access generated documents.',
    userFlow:
      'The citizen reviews their profile details and makes edits (name, address, phone). ' +
      'They can see their Didit verification badge status and change their account password. ' +
      'Previously generated documents are listed with download links.',
    screenAreas: [
      'Personal details form: first name, last name, email, address, phone number.',
      'Didit verification status badge (Verified / Unverified).',
      'Change password section with current and new password fields.',
      'Generated documents list with download links and creation dates.',
      'Save Changes button.',
    ],
    notes:
      'Profile edits write to the users table. Email cannot be changed from this page — ' +
      'it requires a Supabase Auth email-change flow initiated separately.',
    screenshot: '16_citizen_profile.png',
  },

  // ── Attorney Portal ─────────────────────────────────────────────────────────
  {
    num: 12, section: 'Attorney Portal',
    name: 'Attorney Dashboard',
    route: '/legal/dashboard',
    auth: 'legal',
    access: 'Authenticated Volunteer Attorney accounts only. Redirects to /login if unauthenticated.',
    purpose: 'Activity overview showing caseload statistics, pro-bono hour progress, and recent case updates.',
    userFlow:
      'A logged-in attorney reviews their caseload summary and pro-bono hour progress toward the ' +
      '60-hour IBP target. They scan the recent activity feed for case updates and client messages, ' +
      'then navigate to My Cases or Service Logs via quick links.',
    screenAreas: [
      'KPI cards: Open Cases, Pro-Bono Hours Logged, Hours Remaining, Clients Served.',
      'Case status breakdown (Pending Triage, In Progress, Hearing Scheduled, Closed).',
      'Recent activity feed: latest case updates and client messages.',
      'Quick links: My Cases and Service Logs.',
      'Sidebar navigation to all attorney portal sections.',
    ],
    notes:
      'Pro-bono hours are aggregated from the service_logs table for the current 3-year IBP cycle. ' +
      'The dashboard data is fetched on every page load.',
    screenshot: '20_attorney_dashboard.png',
  },
  {
    num: 13, section: 'Attorney Portal',
    name: 'My Cases',
    route: '/legal/cases',
    auth: 'legal',
    access: 'Authenticated Volunteer Attorney accounts only.',
    purpose: 'Case management table for all active cases assigned to the attorney.',
    userFlow:
      'The attorney browses their assigned cases, filters by status or date, and clicks a case ' +
      'to open the detail view. They update the status, add notes, attach documents, and message ' +
      'the client directly from the case detail panel.',
    screenAreas: [
      'Cases table: Case ID, Client Name, Issue Type, Status, Date Filed.',
      'Status filter dropdown (all active statuses).',
      'Search by client name or case ID.',
      'Case detail panel: status update dropdown, notes text area, document attachments.',
      '"Message Client" shortcut button per row.',
    ],
    notes:
      'RLS ensures attorneys only see cases where attorney_id matches their user ID. ' +
      'Status transitions are written to the cases table and logged in audit_logs.',
    screenshot: '21_attorney_cases.png',
  },
  {
    num: 14, section: 'Attorney Portal',
    name: 'Clients',
    route: '/legal/clients',
    auth: 'legal',
    access: 'Authenticated Volunteer Attorney accounts only.',
    purpose: 'Directory of all citizen clients currently assigned to the attorney.',
    userFlow:
      'The attorney searches for a client by name or email, clicks a card to view their full profile, ' +
      'and navigates to their active case or sends a direct message. ' +
      'Client cards show Didit verification status and active case count.',
    screenAreas: [
      'Client card grid or list view.',
      'Search input by name or email.',
      'Client card: name, email, Didit verification badge, active case count.',
      '"View Profile" and "Send Message" action buttons per card.',
    ],
    notes:
      'The client list is derived from cases where attorney_id matches the logged-in attorney. ' +
      'Clients with multiple cases appear once in the directory.',
    screenshot: '22_attorney_clients.png',
  },
  {
    num: 15, section: 'Attorney Portal',
    name: 'Case History',
    route: '/legal/history',
    auth: 'legal',
    access: 'Authenticated Volunteer Attorney accounts only.',
    purpose: 'Read-only archive of all closed and resolved cases handled by the attorney.',
    userFlow:
      'The attorney filters past cases by date range or outcome (Closed - Won / Closed - Lost) ' +
      'for record-keeping and IBP compliance documentation. Case detail links open a read-only view ' +
      'of the full case notes and service logs.',
    screenAreas: [
      'History table: Case ID, Client Name, Issue Type, Outcome, Close Date.',
      'Date range filter.',
      'Outcome filter: Closed - Won, Closed - Lost.',
      'Case detail link per row.',
    ],
    notes:
      'Only cases with status "Closed - Won" or "Closed - Lost" appear here. ' +
      'Service hours logged against closed cases contribute to the pro-bono hour total.',
    screenshot: '23_attorney_case_history.png',
  },
  {
    num: 16, section: 'Attorney Portal',
    name: 'Pro-Bono Hub',
    route: '/legal/probono',
    auth: 'legal',
    access: 'Authenticated Volunteer Attorney accounts only.',
    purpose: 'Progress tracker for the IBP-mandated 60-hour pro-bono service requirement per 3-year period.',
    userFlow:
      'The attorney checks cumulative pro-bono hours, sees remaining hours for the current 3-year cycle, ' +
      'and reviews a case-by-case hour breakdown. A button navigates directly to Service Logs to add new entries.',
    screenAreas: [
      'Progress bar: hours logged vs. 60-hour target.',
      'KPI display: Total Hours Logged, Hours Remaining, Cycle End Date.',
      'Case-by-case hour breakdown table.',
      '"Go to Service Logs" navigation button.',
    ],
    notes:
      'The 60-hour requirement is per 3-year IBP membership cycle per the Code of Professional ' +
      'Responsibility. Hours are summed from service_logs entries where attorney_id matches the logged-in user.',
    screenshot: '24_attorney_probono_hub.png',
  },
  {
    num: 17, section: 'Attorney Portal',
    name: 'Service Logs',
    route: '/legal/service-logs',
    auth: 'legal',
    access: 'Authenticated Volunteer Attorney accounts only.',
    purpose: 'Time-tracking log for pro-bono hours per case, used for IBP compliance reporting.',
    userFlow:
      'The attorney clicks "Add Log Entry", selects the case, enters the date, hours spent, and a ' +
      'description of services rendered. The entry is saved and immediately reflected in the Pro-Bono ' +
      'Hub total. Previous entries can be edited or deleted.',
    screenAreas: [
      'Service log table: Case Name, Date, Hours, Description of Service, Actions.',
      '"Add Log Entry" button opening a modal form.',
      'Log entry form: case selector, date picker, hours input, description text area.',
      'Edit and Delete action buttons per log row.',
      'Total hours summary in the table footer.',
    ],
    notes:
      'Service log entries must be linked to an existing case (active or closed). ' +
      'Hours in the log drive the Pro-Bono Hub progress bar.',
    screenshot: '25_attorney_service_logs.png',
  },
  {
    num: 18, section: 'Attorney Portal',
    name: 'Messages',
    route: '/legal/messages',
    auth: 'legal',
    access: 'Authenticated Volunteer Attorney accounts only.',
    purpose: 'Unified messaging inbox for communicating with all assigned clients.',
    userFlow:
      'The attorney selects a client conversation from the thread list, reads the message history, ' +
      'types a reply, and sends. The client receives the message via Supabase Realtime. ' +
      'Attorneys manage all client conversations from this single inbox.',
    screenAreas: [
      'Thread list panel: all client conversations with case name and unread count.',
      'Active conversation panel with full message history.',
      'Message composer: text input and Send button.',
      'Sender name, timestamp, and read indicators per message bubble.',
    ],
    notes:
      'Message threads are linked to cases via the message_threads table. ' +
      'RLS ensures attorneys only see threads where they are listed in thread_participants.',
    screenshot: '26_attorney_messages.png',
  },
  {
    num: 19, section: 'Attorney Portal',
    name: 'Attorney Profile',
    route: '/legal/profile',
    auth: 'legal',
    access: 'Authenticated Volunteer Attorney accounts only.',
    purpose: 'Professional profile management: credentials, areas of practice, verification status, and account settings.',
    userFlow:
      'The attorney reviews and updates professional details (IBP number, bar roll number, areas of ' +
      'practice). They see their admin verification status and can change their password. ' +
      'Profile edits are saved to the users table.',
    screenAreas: [
      'Personal details: name, email, phone, address.',
      'Professional credentials: IBP number, bar roll number, years of practice.',
      'Areas of practice selector (Labor, Family, Housing, Consumer, etc.).',
      'Verification status badge: Pending / Verified / Rejected.',
      'Change password section.',
    ],
    notes:
      'The verification status reflects the admin\'s credential review. ' +
      'A "Rejected" status displays the admin\'s rejection reason so the attorney can resubmit.',
    screenshot: '27_attorney_profile.png',
  },

  // ── Admin Portal ────────────────────────────────────────────────────────────
  {
    num: 20, section: 'Admin Portal',
    name: 'Admin Dashboard',
    route: '/admin/dashboard',
    auth: 'admin',
    access: 'Super Administrator accounts only. Non-admin users are redirected away from this route.',
    purpose: 'Platform-wide KPI overview: total users, active cases, pending verifications, and system health.',
    userFlow:
      'The administrator logs in and reviews key platform metrics at a glance. ' +
      'They check the pending attorney verifications alert, scan recent audit log entries, ' +
      'and navigate to Account Management or Attorney Verifications via quick links.',
    screenAreas: [
      'KPI cards: Total Users, Active Cases, Pending Verifications, Attorneys Verified.',
      'User role breakdown (Citizens vs. Attorneys vs. Admins).',
      'Recent audit log feed: latest system events.',
      'Pending verifications alert with navigate button.',
      'System status indicator (backend API health).',
    ],
    notes:
      'Admin dashboard data bypasses RLS using the Supabase service role key via FastAPI ' +
      'to aggregate cross-role statistics. Data is refreshed on page load.',
    screenshot: '30_admin_dashboard.png',
  },
  {
    num: 21, section: 'Admin Portal',
    name: 'Account Management',
    route: '/admin/accounts',
    auth: 'admin',
    access: 'Super Administrator accounts only.',
    purpose: 'Full CRUD interface for managing all user accounts across all roles.',
    userFlow:
      'The admin searches for a user by name or email, filters by role or status, and performs ' +
      'actions: edit role or verification status, deactivate an account, or permanently delete it. ' +
      'The admin can also manually create new admin or staff accounts.',
    screenAreas: [
      'User table: Name, Email, Role, Status, Registered Date, Actions.',
      'Role filter: Citizen, Volunteer Attorney, Super Administrator.',
      'Status filter: Active, Deactivated.',
      'Search input by name or email.',
      'Edit, Deactivate, Delete action buttons per user row.',
      '"Create Account" button for manual account creation.',
    ],
    notes:
      'Account deletion is irreversible and removes all associated records. ' +
      'Deactivation is preferred as it preserves case and message history. ' +
      'Role changes take effect on the user\'s next page load.',
    screenshot: '31_admin_accounts.png',
  },
  {
    num: 22, section: 'Admin Portal',
    name: 'Attorney Verifications',
    route: '/admin/attorney-verifications',
    auth: 'admin',
    access: 'Super Administrator accounts only.',
    purpose: 'Review queue for attorney credential verification requests pending admin approval.',
    userFlow:
      'The admin opens the pending verification list, clicks "Review" on an attorney entry, and inspects ' +
      'the uploaded IBP card photo, selfie, IBP number, and bar roll number. They click Approve to activate ' +
      'the account or Reject with a written reason. The attorney receives an email notification of the decision.',
    screenAreas: [
      'Verification queue table: Attorney Name, IBP Number, Submitted Date, Status.',
      'Status filter: Pending, Approved, Rejected.',
      'Detail modal: IBP card image, selfie photo, IBP number, bar roll, areas of practice.',
      'Approve button and Reject button with reason text area.',
      'Approved / Total count KPI.',
    ],
    notes:
      'Approved attorneys receive status_verification = "verified" in the users table and can ' +
      'immediately access the attorney portal. The rejection reason is stored and shown to the attorney ' +
      'on their profile page.',
    screenshot: '32_admin_attorney_verifications.png',
  },
  {
    num: 23, section: 'Admin Portal',
    name: 'Audit Logs',
    route: '/admin/logs',
    auth: 'admin',
    access: 'Super Administrator accounts only.',
    purpose: 'Immutable event log for all significant system actions, supporting compliance and security monitoring.',
    userFlow:
      'The admin filters the log by date range, event type, or user to investigate a specific incident. ' +
      'They export the filtered results as a CSV for offline compliance reporting. ' +
      'All log entries are read-only — they cannot be edited or deleted.',
    screenAreas: [
      'Log table: Timestamp, User, Action Type, Detail, IP Address.',
      'Date range filter.',
      'Action type filter (login, case_status_change, account_creation, document_generated, etc.).',
      'User search input.',
      'Export as CSV button.',
    ],
    notes:
      'Audit log entries are written by the application (RLS: INSERT allowed for all authenticated users, ' +
      'DELETE/UPDATE denied for everyone). Only admins can SELECT from audit_logs. ' +
      'IP addresses are captured from FastAPI request headers.',
    screenshot: '33_admin_audit_logs.png',
  },
  {
    num: 24, section: 'Admin Portal',
    name: 'System Settings',
    route: '/admin/settings',
    auth: 'admin',
    access: 'Super Administrator accounts only.',
    purpose: 'Platform configuration: maintenance mode, feature flags, email notifications, and database backup/restore.',
    userFlow:
      'The admin toggles feature flags (Maintenance Mode, registrations, Kampi chatbot, document generator). ' +
      'Changes take effect immediately. They can also trigger a full database backup download or restore ' +
      'the platform from a previously exported backup file.',
    screenAreas: [
      'Maintenance Mode toggle (takes the platform offline for non-admins).',
      'Feature flag toggles: New Registrations, Kampi Chatbot, Document Generator.',
      'Backup & Restore section: Download Backup and Upload Backup controls.',
      'Email notification configuration settings.',
      'Save Changes button.',
    ],
    notes:
      'Settings are stored in the system_settings table as key-value pairs. ' +
      'Maintenance mode is checked at each route load on the frontend. ' +
      'Backup exports are initiated via Supabase\'s management API.',
    screenshot: '34_admin_system_settings.png',
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function imgToBase64(filename) {
  const filepath = path.join(SS_DIR, filename);
  if (!fs.existsSync(filepath)) return null;
  const data = fs.readFileSync(filepath).toString('base64');
  return `data:image/png;base64,${data}`;
}

async function extractPageStructure(page) {
  return page.evaluate(() => {
    const text = el => (el.innerText || el.textContent || '').trim().replace(/\s+/g, ' ');

    const headings = [...document.querySelectorAll('h1,h2,h3')]
      .map(h => text(h)).filter(t => t.length > 0 && t.length < 120).slice(0, 6);

    const buttons = [...document.querySelectorAll('button,[role="button"],a[class*="btn"]')]
      .map(b => text(b)).filter(t => t.length > 0 && t.length < 60)
      .reduce((acc, t) => acc.includes(t) ? acc : [...acc, t], []).slice(0, 8);

    const inputs = [...document.querySelectorAll('input,select,textarea')]
      .map(i => i.placeholder || i.getAttribute('aria-label') || i.name || i.type)
      .filter(t => t && t.length > 0 && t !== 'hidden')
      .reduce((acc, t) => acc.includes(t) ? acc : [...acc, t], []).slice(0, 8);

    return { headings, buttons, inputs };
  });
}

// ── HTML builder ──────────────────────────────────────────────────────────────

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 11pt;
    color: #1a1a2e;
    background: #fff;
    line-height: 1.6;
  }

  /* ── Cover page ── */
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
  .cover-logo {
    font-size: 48pt;
    font-weight: 700;
    letter-spacing: -1px;
    margin-bottom: 12px;
  }
  .cover-logo span { color: #e94560; }
  .cover-subtitle {
    font-size: 16pt;
    color: rgba(255,255,255,0.75);
    margin-bottom: 48px;
    font-weight: 400;
  }
  .cover-meta {
    background: rgba(255,255,255,0.08);
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 12px;
    padding: 32px 48px;
    display: inline-block;
    text-align: left;
  }
  .cover-meta p { margin: 6px 0; color: rgba(255,255,255,0.8); font-size: 11pt; }
  .cover-meta strong { color: #fff; }
  .cover-badge {
    margin-top: 40px;
    background: #e94560;
    color: #fff;
    font-size: 9pt;
    font-weight: 600;
    padding: 6px 20px;
    border-radius: 999px;
    letter-spacing: 1px;
    text-transform: uppercase;
  }

  /* ── Index page ── */
  .index-page {
    page-break-after: always;
    padding: 48px 56px;
  }
  .index-title {
    font-size: 22pt;
    font-weight: 700;
    color: #1a1a2e;
    margin-bottom: 8px;
  }
  .index-rule {
    height: 3px;
    background: linear-gradient(to right, #e94560, #0f3460);
    border-radius: 2px;
    margin-bottom: 28px;
  }
  .callout {
    background: #f0f4ff;
    border-left: 4px solid #4361ee;
    border-radius: 0 8px 8px 0;
    padding: 12px 16px;
    margin-bottom: 28px;
    font-size: 10pt;
    color: #2d3a8c;
  }
  .index-table { width: 100%; border-collapse: collapse; font-size: 10pt; }
  .index-table th {
    background: #1a1a2e;
    color: #fff;
    text-align: left;
    padding: 10px 14px;
    font-weight: 600;
    font-size: 9.5pt;
  }
  .index-table th:first-child { border-radius: 6px 0 0 0; width: 36px; text-align: center; }
  .index-table th:last-child  { border-radius: 0 6px 0 0; }
  .index-table td {
    padding: 10px 14px;
    border-bottom: 1px solid #e8ecf4;
    vertical-align: top;
  }
  .index-table tr:last-child td { border-bottom: none; }
  .index-table tr:nth-child(even) td { background: #f8f9fc; }
  .index-table td:first-child { text-align: center; font-weight: 700; color: #4361ee; }
  .route-tag {
    display: inline-block;
    background: #eef0ff;
    color: #4361ee;
    font-family: 'Courier New', monospace;
    font-size: 9pt;
    padding: 2px 8px;
    border-radius: 4px;
    font-weight: 600;
  }
  .section-header-row td {
    background: #e94560 !important;
    color: #fff !important;
    font-weight: 700;
    font-size: 9pt;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 7px 14px;
  }
  .section-header-row td:first-child { color: #fff !important; }
  .purpose-text { color: #6b7eb8; }

  /* ── Page section ── */
  .page-section {
    page-break-before: always;
    padding: 40px 56px;
  }
  .section-label {
    font-size: 9pt;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #e94560;
    margin-bottom: 6px;
  }
  .page-title {
    font-size: 26pt;
    font-weight: 700;
    color: #1a1a2e;
    margin-bottom: 4px;
    line-height: 1.2;
  }
  .page-rule {
    height: 3px;
    background: linear-gradient(to right, #e94560, transparent);
    border-radius: 2px;
    margin: 16px 0 24px;
  }

  /* metadata grid */
  .meta-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0;
    border: 1px solid #e0e6f4;
    border-radius: 8px;
    overflow: hidden;
    margin-bottom: 28px;
  }
  .meta-row {
    display: contents;
  }
  .meta-label {
    background: #f4f6fb;
    padding: 10px 16px;
    font-size: 9pt;
    font-weight: 600;
    color: #6b7eb8;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: 1px solid #e0e6f4;
  }
  .meta-value {
    background: #fff;
    padding: 10px 16px;
    font-size: 10pt;
    color: #1a1a2e;
    border-bottom: 1px solid #e0e6f4;
  }
  .meta-label:last-of-type, .meta-value:last-of-type { border-bottom: none; }
  .meta-value .route-tag { font-size: 10pt; }

  /* content blocks */
  .block { margin-bottom: 24px; }
  .block-title {
    font-size: 12pt;
    font-weight: 700;
    color: #1a1a2e;
    margin-bottom: 8px;
    padding-bottom: 6px;
    border-bottom: 2px solid #e0e6f4;
  }
  .block p { font-size: 10.5pt; color: #333; line-height: 1.65; }
  .block ul { padding-left: 20px; }
  .block li {
    font-size: 10.5pt;
    color: #333;
    margin-bottom: 5px;
    line-height: 1.5;
  }

  /* detected structure table */
  .struct-table { width: 100%; border-collapse: collapse; font-size: 10pt; }
  .struct-table td {
    padding: 9px 14px;
    border-bottom: 1px solid #e8ecf4;
    vertical-align: top;
  }
  .struct-table tr:last-child td { border-bottom: none; }
  .struct-table td:first-child {
    width: 200px;
    font-weight: 600;
    color: #6b7eb8;
    font-size: 9.5pt;
    background: #f4f6fb;
  }
  .struct-table td:last-child { color: #333; }
  .tag {
    display: inline-block;
    background: #eef9f0;
    color: #2d7a4f;
    border: 1px solid #b8e5c9;
    font-size: 8.5pt;
    padding: 2px 8px;
    border-radius: 4px;
    margin: 2px 3px 2px 0;
  }
  .tag.btn-tag {
    background: #fff4e6;
    color: #b05a00;
    border-color: #ffd099;
  }
  .tag.input-tag {
    background: #eef0ff;
    color: #4361ee;
    border-color: #c5cbff;
  }

  /* screenshot */
  .screenshot-block { margin-top: 28px; }
  .screenshot-label {
    font-size: 9pt;
    font-weight: 600;
    color: #6b7eb8;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 8px;
  }
  .screenshot-wrap {
    border: 1px solid #dde3f0;
    border-radius: 10px;
    overflow: hidden;
    box-shadow: 0 4px 20px rgba(0,0,0,0.08);
  }
  .screenshot-wrap img { display: block; width: 100%; }
  .screenshot-missing {
    background: #f4f6fb;
    border: 2px dashed #c5cbdd;
    border-radius: 10px;
    padding: 40px;
    text-align: center;
    color: #888;
    font-size: 10pt;
  }

  /* notes block */
  .notes-block {
    background: #fffbf0;
    border-left: 4px solid #f9a825;
    border-radius: 0 8px 8px 0;
    padding: 14px 18px;
    margin-top: 24px;
  }
  .notes-block .block-title { border-color: #ffe082; color: #7a5800; }
  .notes-block p { color: #5a4000; font-size: 10.5pt; }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
`;

function buildHTML(pages) {
  // Group pages by section for the index
  const sections = {};
  for (const p of pages) {
    if (!sections[p.section]) sections[p.section] = [];
    sections[p.section].push(p);
  }

  // Index rows
  let indexRows = '';
  for (const [section, sPages] of Object.entries(sections)) {
    indexRows += `<tr class="section-header-row">
      <td colspan="4">${section}</td>
    </tr>`;
    for (const p of sPages) {
      indexRows += `<tr>
        <td>${p.num}</td>
        <td>${p.name}</td>
        <td><span class="route-tag">${p.route}</span></td>
        <td class="purpose-text">${p.purpose}</td>
      </tr>`;
    }
  }

  // Per-page sections
  let pageSections = '';
  for (const p of pages) {
    const b64 = imgToBase64(p.screenshot);
    const screenshotHTML = b64
      ? `<div class="screenshot-wrap"><img src="${b64}" alt="${p.name} screenshot" /></div>`
      : `<div class="screenshot-missing">Screenshot not available — run the screenshot capture script first.</div>`;

    // Detected structure tags
    const s = p._structure || { headings: [], buttons: [], inputs: [] };
    const hTags  = s.headings.length ? s.headings.map(h => `<span class="tag">${h}</span>`).join('') : '<em style="color:#aaa">None detected</em>';
    const bTags  = s.buttons.length  ? s.buttons.map(b  => `<span class="tag btn-tag">${b}</span>`).join('') : '<em style="color:#aaa">None detected</em>';
    const iTags  = s.inputs.length   ? s.inputs.map(i   => `<span class="tag input-tag">${i}</span>`).join('') : '<em style="color:#aaa">None detected</em>';

    pageSections += `
<div class="page-section">
  <div class="section-label">${p.section}</div>
  <div class="page-title">${p.num}. ${p.name}</div>
  <div class="page-rule"></div>

  <div class="meta-grid">
    <div class="meta-label">Route</div>
    <div class="meta-value"><span class="route-tag">${p.route}</span></div>
    <div class="meta-label">Screenshot File</div>
    <div class="meta-value">${p.screenshot}</div>
    <div class="meta-label">Access / Routing</div>
    <div class="meta-value">${p.access}</div>
    <div class="meta-label">Purpose</div>
    <div class="meta-value">${p.purpose}</div>
  </div>

  <div class="block">
    <div class="block-title">User Flow</div>
    <p>${p.userFlow}</p>
  </div>

  <div class="block">
    <div class="block-title">Main Screen Areas</div>
    <ul>${p.screenAreas.map(a => `<li>${a}</li>`).join('')}</ul>
  </div>

  <div class="block">
    <div class="block-title">Detected Page Structure</div>
    <table class="struct-table">
      <tr><td>Key headings</td><td>${hTags}</td></tr>
      <tr><td>Visible buttons / actions</td><td>${bTags}</td></tr>
      <tr><td>Inputs / selects</td><td>${iTags}</td></tr>
    </table>
  </div>

  <div class="notes-block">
    <div class="block-title">Documentation Notes</div>
    <p>${p.notes}</p>
  </div>

  <div class="screenshot-block">
    <div class="screenshot-label">Page Screenshot</div>
    ${screenshotHTML}
  </div>
</div>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>JusticeLink Page Documentation</title>
<style>${CSS}</style>
</head>
<body>

<!-- Cover -->
<div class="cover">
  <div class="cover-logo">Justice<span>Link</span></div>
  <div class="cover-subtitle">Legal Aid Platform — Philippines</div>
  <div class="cover-meta">
    <p><strong>Document:</strong> Page Screenshot Documentation</p>
    <p><strong>Version:</strong> 1.0</p>
    <p><strong>Total Pages:</strong> ${pages.length} portal screens</p>
    <p><strong>Portals:</strong> Citizen · Attorney · Admin</p>
    <p><strong>Generated:</strong> ${new Date().toLocaleDateString('en-PH', { year:'numeric', month:'long', day:'numeric' })}</p>
  </div>
  <div class="cover-badge">Confidential — Internal Use Only</div>
</div>

<!-- Index -->
<div class="index-page">
  <div class="index-title">Page Index</div>
  <div class="index-rule"></div>
  <div class="callout">
    Protected routes redirect unauthenticated visitors to <span style="font-family:monospace;font-weight:600">/login</span>.
    Each section below documents the concrete routed screen captured during testing.
  </div>
  <table class="index-table">
    <thead>
      <tr>
        <th>#</th>
        <th>Page</th>
        <th>Route</th>
        <th>Purpose</th>
      </tr>
    </thead>
    <tbody>${indexRows}</tbody>
  </table>
</div>

${pageSections}

</body>
</html>`;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });

  const contexts = {
    guest:  await browser.newContext(),
    admin:  await browser.newContext({ storageState: path.join(AUTH_DIR, 'admin.json')  }),
    legal:  await browser.newContext({ storageState: path.join(AUTH_DIR, 'legal.json')  }),
    public: await browser.newContext({ storageState: path.join(AUTH_DIR, 'public.json') }),
  };

  console.log(`Extracting page structure from ${PAGES.length} pages...`);
  for (const pageDef of PAGES) {
    const ctx  = contexts[pageDef.auth];
    const page = await ctx.newPage();
    try {
      await page.goto(`${BASE_URL}${pageDef.route}`, { waitUntil: 'networkidle', timeout: 20000 });
      pageDef._structure = await extractPageStructure(page);
      process.stdout.write(`  ✓ ${pageDef.num.toString().padStart(2)}. ${pageDef.name}\n`);
    } catch (err) {
      process.stdout.write(`  ✗ ${pageDef.num.toString().padStart(2)}. ${pageDef.name} — ${err.message}\n`);
      pageDef._structure = { headings: [], buttons: [], inputs: [] };
    } finally {
      await page.close();
    }
  }

  for (const ctx of Object.values(contexts)) await ctx.close();

  console.log('\nBuilding HTML document...');
  const html = buildHTML(PAGES);

  console.log('Rendering PDF...');
  const pdfPage = await browser.newPage();
  await pdfPage.setContent(html, { waitUntil: 'load' });

  fs.mkdirSync(DOCS_DIR, { recursive: true });
  await pdfPage.pdf({
    path: OUTPUT_PDF,
    format: 'A4',
    printBackground: true,
    margin: { top: '15mm', bottom: '15mm', left: '15mm', right: '15mm' },
  });

  await browser.close();
  console.log(`\nDone! PDF saved to:\n  ${OUTPUT_PDF}\n`);
}

main().catch(err => { console.error(err); process.exit(1); });

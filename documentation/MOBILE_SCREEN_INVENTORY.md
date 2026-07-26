# JusticeLink Mobile Screen Inventory

## Purpose
Map the current web application into mobile-friendly screens so the migration can be executed in order without losing role coverage.

## Mobile Priority Legend
- P0: Needed for the first mobile release.
- P1: Important after the core app is usable.
- P2: Can wait until the first role flows are stable.

## Public User Screens

| Screen | Web Route | Priority | Mobile Shape | Reuse Notes |
| --- | --- | --- | --- | --- |
| Landing | `/` | P1 | Full-screen marketing entry | Can reuse copy and branding, but rebuild layout natively. |
| Login | `/login` | P0 | Auth form screen | Reuse auth session logic and Supabase sign-in. |
| Register | `/register` | P0 | Multi-step auth form | Reuse registration validation and profile creation flow. |
| Forgot Password | `/forgot-password` | P0 | Single-purpose recovery screen | Reuse auth reset flow and email handling. |
| Public Dashboard | `/public/dashboard` | P0 | Tab/home screen | Reuse counts, summaries, and case status data. |
| Triage | `/public/triage` | P0 | Step-based questionnaire | Reuse triage logic, scoring, and backend payloads. |
| Messages | `/public/messages` | P0 | Thread list + conversation view | Reuse message thread models and unread counts. |
| Notifications | `/public/notifications` | P0 | List screen | Reuse notification fetching and badge sync. |
| Profile | `/public/profile` | P0 | Editable profile form | Reuse profile model, update flow, and avatar upload. |
| My Cases | `/public/cases` | P1 | List/detail screen | Reuse case status data and thread linkage. |
| Rights Library | `/public/rights` | P1 | Searchable content list | Reuse content source and filters. |
| Document Maker | `/public/documents` | P1 | Form + preview + export flow | Reuse document template/data generation logic. |
| Terms | `/public/terms` | P1 | Read-only content screen | Reuse terms content. |

## Legal User Screens

| Screen | Web Route | Priority | Mobile Shape | Reuse Notes |
| --- | --- | --- | --- | --- |
| Login entry | `/login` | P0 | Shared auth screen | Same flow as public users, role decides landing target. |
| Legal Dashboard | `/legal/dashboard` | P0 | Home screen | Reuse case summary, activity, and notification counts. |
| Cases | `/legal/cases` | P0 | List/detail screen | Reuse case data and case thread helpers. |
| Messages | `/legal/messages` | P0 | Thread list + conversation view | Reuse messaging models and unread counts. |
| Notifications | `/legal/notifications` | P0 | List screen | Reuse notification feed. |
| Profile | `/legal/profile` | P0 | Editable profile screen | Reuse legal profile data and upload flows. |
| Pro Bono Hub | `/legal/probono` | P1 | Workflow screen | Reuse pro bono period logic and case tools. |
| Service Logs | `/legal/service-logs` | P1 | Log list / entry screen | Reuse service log data model. |
| Clients | `/legal/clients` | P1 | Contact list/detail screen | Reuse case-client relationships. |
| Terms | `/legal/terms` | P1 | Read-only content screen | Reuse terms content. |

## Admin Screens

| Screen | Web Route | Priority | Mobile Shape | Reuse Notes |
| --- | --- | --- | --- | --- |
| Admin Dashboard | `/admin/dashboard` | P1 | Summary screen | Reuse key metrics and counts. |
| Accounts | `/admin/accounts` | P2 | Management table/list | Likely needs a mobile-optimized list instead of a dense table. |
| Attorney Verifications | `/admin/attorney-verifications` | P1 | Review queue | Reuse verification status and approval actions. |
| Case Management | `/admin/cases` | P1 | Oversight list/detail | Reuse case data and moderation tools. |
| Audit Logs | `/admin/logs` | P2 | Log stream/filter screen | Reuse audit event data. |
| Feedback Analytics | `/admin/feedback` | P2 | Chart/summary screen | Rebuild charts for mobile layout. |
| System Settings | `/admin/settings` | P2 | Settings form | Reuse config values, but simplify controls. |
| Terms | `/admin/terms` | P2 | Read-only content screen | Reuse terms content. |

## Shared Systems To Reuse
- Auth session and role resolution.
- Supabase client configuration.
- Profile read/update flow.
- Unread count subscriptions or polling.
- Message thread and case-thread helpers.
- Triage scoring and pro bono period helpers.
- Rights and document generation data sources.
- Terms and maintenance gate logic.

## Web-Only Pieces To Replace
- Browser router routes and nested layouts.
- Desktop sidebars and hover-driven navigation.
- DOM-specific upload and modal behavior.
- Table-heavy admin layouts that need mobile list equivalents.
- Web-specific animation/layout assumptions that do not translate to small screens.

## Step 1 Result
- P0 mobile MVP screens are login, register, forgot password, public dashboard, triage, messages, notifications, profile, legal dashboard, legal cases, legal messages, legal notifications, legal profile, and attorney verification flow for admin review.
- P1 screens follow after the core flows are stable.
- P2 screens can wait until the first release is usable.

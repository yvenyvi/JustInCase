# JusticeLink Project Context

## Product Purpose
JusticeLink is a legal-aid platform that connects people needing legal help with volunteer lawyers and provides self-advocacy resources.

## System Model
1. Users
- Public mobile/app users seeking help.
- Lawyer dashboard users (volunteer attorneys).

2. Security Checkpoint
- Auth and access control gate before core features.

3. Core Features
- Matchmaking system pairs user needs with suitable lawyers.
- Volunteer tracker monitors pro-bono contribution.

4. Storage and Connections
- Main database stores accounts and case basics.
- External integrations include lawyer-license verification and notifications.

## Public User Flow (From Diagram)
- Start -> onboarding -> choose help type.
- Branch A (connect with lawyer): triage questionnaire -> submit case details -> search for lawyer -> acceptance decision.
- Branch B (self advocacy): rights library -> read material or create document -> browse guidance -> guided prompts -> download template.

## Implemented Frontend Areas
- Public views: dashboard, triage, rights library, document generator, profile.
- Legal views: dashboard, cases, clients, Pro Bono Hub, profile.
- Admin views: dashboard, account management, audit logs, security settings, system settings.
- Shared: auth screens, messaging, layout/header/sidebar, reusable components.

## Data and Integration Status
- Supabase setup is present.
- AI chat service and conversation/message models are implemented.
- Several role views still rely on mock data and are natural integration candidates.

## Practical Delivery Guidance
- Treat role flow continuity as the first constraint.
- Prefer incremental integration: keep UX complete while replacing mock data gradually.
- Preserve existing component/style patterns for consistency.

## Priority Guidance
- Core tracks are equal in baseline importance.
- Active implementation context decides immediate priority.
- If no context is given, default to Lawyer Pro Bono Hub and case matching as system-priority focus.
- Current workstream note: authentication for both user sides is an active implementation area.

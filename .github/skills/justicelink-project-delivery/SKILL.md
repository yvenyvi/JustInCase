---
name: justicelink-project-delivery
description: 'Plan and implement JusticeLink features safely. Use for role-based changes (public, legal, admin), triage or matching updates, Supabase integration, and architecture-aware UI delivery with completion checks.'
argument-hint: 'Feature or change request to implement in JusticeLink'
---

# JusticeLink Project Delivery

Use this skill when implementing or reviewing features in JusticeLink so changes stay aligned with system architecture, user-role flows, and the current frontend structure.

## Project Mode
- Personal project with school-submission quality expectations.
- Prefer implementation decisions that are practical to ship and easy to explain in project defense/presentation.

## When To Use
- Add or modify functionality for public users, lawyers, or admins.
- Update triage, matching, messaging, rights library, document generation, or AI chat.
- Move a feature from mock-only UI toward Supabase-backed behavior.
- Review if a proposed change fits JusticeLink architecture and user journey.

## Inputs
- Requested feature, bug, or improvement.
- Target role: public, legal, admin, or cross-role.
- Expected output: quick UI patch, full implementation, or architecture review.
- Optional priority context: active workstream for this session.

## Workflow
1. Read project context first.
- Review [project context](./references/project-context.md).
- Confirm which user role and flow segment are affected.
- Identify whether change touches UI only, data flow, or both.

2. Map the request to system flow.
- Public flow branch:
  - Onboarding -> triage -> case details -> lawyer matching, or
  - Rights library -> read content or generate document.
- Legal flow branch:
  - Dashboard -> cases/clients -> Pro Bono Hub -> messaging/profile.
- Admin flow branch:
  - Dashboard -> accounts/logs/security/settings.
- Cross-role branch:
  - Shared components, auth/routing, and messaging or AI chat behavior.

3. Inspect existing implementation points before coding.
- Locate the target view and layout.
- Locate related types, mocks, and service boundaries.
- Reuse established patterns in nearby files before introducing new abstractions.

4. Choose data strategy.
- If backend contract exists: wire to Supabase service layer.
- If backend is not ready: keep mock-driven UI but define clear integration seams.
- Never block role flow UX while backend details are pending.

5. Implement minimal complete change.
- Keep edits focused and preserve existing visual language.
- Update types first, then view logic, then styling.
- Avoid broad refactors unless required by the request.

6. Verify behavior and quality gates.
- Flow correctness: role journey still works end to end.
- State correctness: loading, empty, success, and error states are handled.
- Safety: role boundaries and auth expectations are preserved.
- Regression check: related navigation and shared components still behave correctly.

7. Report completion in delivery format.
- What changed.
- Why this fits JusticeLink architecture.
- What remains mocked vs integrated.
- Residual risks and next integration step.

## Decision Rules
- If request conflicts with documented user flow, propose the smallest flow-safe alternative.
- If requirement is ambiguous, ask one focused question before large edits.
- If feature spans multiple roles, implement core shared behavior first, then role-specific UI.
- If no reliable backend schema is available, ship UI + typed contract + TODO integration point.

## Priority Model
- Treat all major tracks as equally important by default:
  - Public triage and rights/document flow
  - Lawyer Pro Bono Hub and case matching
  - Admin governance and security
  - Supabase integration migration from mocks
- For day-to-day execution, prioritize the track currently being implemented.
- If no active track is specified, default system-priority focus to Lawyer Pro Bono Hub and case matching.
- Current known focus: authentication for both user sides; preserve this flow when making cross-role changes.

## Quick Checklist
1. Identify affected role and active track.
2. Confirm impacted flow step in project context.
3. Reuse existing view/type/service patterns.
4. Implement smallest complete change.
5. Validate loading, empty, success, and error states.
6. Report mocked vs integrated status.

## Done Criteria
- Affected role flow remains coherent with system diagram intent.
- Code uses existing module boundaries (views, types, mocks, services).
- No orphan UI state (all key states represented).
- Change summary states implementation status (mocked vs live data).

## References
- [project context](./references/project-context.md)

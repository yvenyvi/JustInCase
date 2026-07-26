# JusticeLink Mobile Migration Checklist

## Goal
Build a mobile app version of JusticeLink that preserves the current web app's public, legal, and admin workflows while reusing the existing backend, Supabase auth, data models, and business logic wherever practical.

## Migration Approach
- Use Expo + React Native for the new mobile client.
- Keep the backend API and Supabase project as the source of truth.
- Reuse shared logic for auth, types, validation, and data access.
- Rebuild UI screens natively instead of trying to wrap the current web DOM.
- Migrate in slices so the app stays usable at each step.

## Current Web Surface To Port
- Public user flow: landing, login, register, forgot password, dashboard, triage, messages, rights library, document generator, cases, notifications, profile, terms.
- Legal user flow: dashboard, cases, pro bono hub, service logs, clients, notifications, profile, messages, terms.
- Admin flow: dashboard, accounts, attorney verifications, case management, audit logs, feedback analytics, system settings, terms.
- Shared systems: auth, unread counts, Supabase client, terms gate, maintenance mode, messaging, notification badge counts.

## Detailed Checklist

### Phase 1. Discovery and Scope Lock
- [ ] Step 1: Create a screen inventory for all current web routes and group them by mobile priority.
- [ ] Step 2: Identify which screens are MVP, phase 2, and phase 3.
- [ ] Step 3: List reusable modules that can move into a shared package or shared folder.
- [ ] Step 4: Identify web-only components that must be replaced in mobile.
- [ ] Step 5: Confirm role behavior for public, legal, and admin users on mobile.

### Phase 2. Project Setup
- [ ] Step 6: Create the Expo app structure for the mobile client.
- [ ] Step 7: Set up navigation with stack, tabs, and role-aware entry points.
- [ ] Step 8: Configure environment variables for Supabase and any backend URLs.
- [ ] Step 9: Add base linting, TypeScript, and test tooling for mobile.
- [ ] Step 10: Establish a shared code boundary for logic reused by web and mobile.

### Phase 3. Shared Foundation
- [ ] Step 11: Port Supabase client setup to a shared location usable by mobile.
- [ ] Step 12: Port auth/session handling and profile lookup logic.
- [ ] Step 13: Port types used across auth, messages, cases, documents, and navigation.
- [ ] Step 14: Port core service helpers such as triage, rights, document generation, and messaging.
- [ ] Step 15: Define a mobile-safe approach for unread badge counts and real-time updates.

### Phase 4. Auth and Access Control
- [ ] Step 16: Implement login on mobile.
- [ ] Step 17: Implement registration on mobile.
- [ ] Step 18: Implement forgot password and password reset flow on mobile.
- [ ] Step 19: Restore session on app launch.
- [ ] Step 20: Enforce role-based routing for public, legal, and admin users.
- [ ] Step 21: Keep the terms gate and maintenance gate behavior consistent.

### Phase 5. Public User MVP
- [ ] Step 22: Build the public home/dashboard screen.
- [ ] Step 23: Build triage flow for legal help intake.
- [ ] Step 24: Build messages for public users.
- [ ] Step 25: Build notifications for public users.
- [ ] Step 26: Build profile screen for public users.
- [ ] Step 27: Build cases screen for public users.
- [ ] Step 28: Build rights library for reading content on mobile.
- [ ] Step 29: Build document generator for mobile-friendly drafting and downloads.

### Phase 6. Legal User MVP
- [ ] Step 30: Build the legal dashboard.
- [ ] Step 31: Build cases and case detail flows.
- [ ] Step 32: Build pro bono hub.
- [ ] Step 33: Build service logs.
- [ ] Step 34: Build client list and detail flows.
- [ ] Step 35: Build legal notifications and messages.
- [ ] Step 36: Build legal profile and terms screens.

### Phase 7. Admin MVP
- [ ] Step 37: Build admin dashboard.
- [ ] Step 38: Build account management.
- [ ] Step 39: Build attorney verifications.
- [ ] Step 40: Build case management.
- [ ] Step 41: Build audit logs.
- [ ] Step 42: Build feedback analytics.
- [ ] Step 43: Build system settings.

### Phase 8. Mobile UX Polish
- [ ] Step 44: Replace desktop navigation with mobile tabs/drawers.
- [ ] Step 45: Add safe-area handling, responsive spacing, and adaptive typography.
- [ ] Step 46: Add loading, empty, error, and offline-friendly states.
- [ ] Step 47: Add mobile-friendly upload flows for avatar, IDs, and documents.
- [ ] Step 48: Add push notification and deep link support where needed.

### Phase 9. Testing and Cutover
- [ ] Step 49: Add mobile unit tests for shared logic.
- [ ] Step 50: Add mobile integration tests for auth and main flows.
- [ ] Step 51: Validate role access and route guards.
- [ ] Step 52: Compare mobile feature parity against the current web app.
- [ ] Step 53: Prepare launch notes and a rollback plan.

## Execution Order
1. Lock the screen inventory and MVP scope.
2. Set up the Expo app and navigation shell.
3. Port auth and shared data access.
4. Deliver public user MVP screens.
5. Deliver legal user MVP screens.
6. Deliver admin MVP screens.
7. Polish mobile UX and test parity.

## Step 1 Output Template
- Screen name
- Current web route
- Role
- Mobile priority
- Shared logic reused
- Web-only pieces to replace
- Dependencies on backend or Supabase

## Status
- Current step: Step 1, screen inventory and MVP scope lock.
- Next step after inventory: create the Expo project shell.
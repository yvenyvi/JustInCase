# JusticeLink Mobile Migration Scope

## Purpose
Define which screens and behaviors belong in the first mobile release and which can follow after the core app is stable.

## MVP Scope
The first mobile release should support the minimum journey needed for each role to log in, see their main dashboard, and complete the most important interactions.

### Public MVP
- Login
- Register
- Forgot password
- Public dashboard
- Triage
- Messages
- Notifications
- Profile

### Legal MVP
- Login
- Legal dashboard
- Cases
- Messages
- Notifications
- Profile

### Admin MVP
- Login
- Attorney verifications
- Admin dashboard
- Case management

## Phase 2 Scope
Add the next-most-used task flows once the first release is functional.

### Public Phase 2
- My cases
- Rights library
- Document maker
- Terms
- Landing screen polish

### Legal Phase 2
- Pro Bono Hub
- Service logs
- Clients
- Terms

### Admin Phase 2
- Accounts
- Audit logs
- Feedback analytics
- Terms

## Phase 3 Scope
Complete the less urgent or more desktop-heavy parts after the main flows are proven on mobile.

### Public Phase 3
- Deeper document export polish
- Advanced content browsing behavior

### Legal Phase 3
- Rich client detail tools
- Advanced service log workflows

### Admin Phase 3
- System settings
- Dense table workflows
- Mobile-adapted analytics refinements

## Scope Rules
- If a screen is essential to sign in, route correctly, or continue a case, it belongs in MVP.
- If a screen is mostly read-only but important for the role, it belongs in Phase 2.
- If a screen depends on dense tables or heavy admin manipulation, it belongs in Phase 3 unless needed earlier for compliance.

## Recommended Release Order
1. Auth and role routing.
2. Public user MVP.
3. Legal user MVP.
4. Admin MVP.
5. Public Phase 2.
6. Legal Phase 2.
7. Admin Phase 2.
8. Phase 3 refinements.

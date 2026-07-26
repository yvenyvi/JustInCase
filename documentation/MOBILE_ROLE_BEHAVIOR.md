# JusticeLink Mobile Role Behavior

## Purpose
Define how the mobile app should handle public, legal, and admin users without breaking the existing access model.

## Entry Flow
1. Show the authentication screen first if there is no active session.
2. Restore the Supabase session on launch if a token exists.
3. Resolve the profile role after session restore.
4. Send the user to the correct role home screen.

## Role Homes

### Public Users
- Land on the public dashboard.
- Use tab-based access for triage, messages, notifications, profile, and cases.
- Keep rights library and document maker reachable from secondary navigation.

### Legal Users
- Land on the legal dashboard.
- Use tab-based access for cases, messages, notifications, profile, and pro bono work.
- Keep service logs and clients reachable as secondary destinations.

### Admin Users
- Land on the admin dashboard or review queue.
- Use simplified navigation with review tasks first.
- Keep account and system management tools behind secondary screens.

## Guard Rules
- Never allow a user to enter a role home screen before the role is resolved.
- Never expose admin screens to public or legal users.
- Keep terms acceptance and maintenance mode checks active across all roles.
- Preserve unread badge counts when switching between role tabs or screens.

## Mobile Navigation Rule
- Public and legal users should primarily use tabs.
- Admin users can use tabs or a simplified drawer if the number of destinations grows too large.
- Detail pages should open from lists or cards, not from dense desktop menus.

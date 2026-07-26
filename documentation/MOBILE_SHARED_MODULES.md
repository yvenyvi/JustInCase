# JusticeLink Mobile Shared Modules

## Purpose
Identify the code that should be reused in the mobile app instead of duplicated or rewritten from scratch.

## High-Value Shared Modules

### Authentication And Session
- `frontend/src/contexts/AuthContext.tsx`
- Supabase auth session restore and sign-out behavior
- Role mapping between database roles and app roles
- Profile fetch and profile update logic

### Core Data Access
- `frontend/src/lib/supabase.ts`
- Any service wrappers that already encapsulate Supabase calls
- Case-thread helper logic

### Domain Services
- `frontend/src/services/triageService.ts`
- `frontend/src/services/rightsService.ts`
- `frontend/src/services/documentGeneratorService.ts`
- `frontend/src/services/kampiService.ts`
- `frontend/src/services/auditService.ts`
- `frontend/src/services/aiChatService.ts`

### Shared Types
- `frontend/src/types/index.ts`
- `frontend/src/types/auth.ts`
- `frontend/src/types/navigation.ts`
- `frontend/src/types/legal.ts`
- `frontend/src/types/admin.ts`

### Shared Business Helpers
- `frontend/src/lib/createCaseThread.ts`
- `frontend/src/lib/proBonoperiod.ts`
- Any validation helpers that feed registration, profile editing, or document generation

### Shared Content Data
- Terms content
- Rights library content
- Document template definitions
- Mock data only if it is acting as temporary structured seed data during migration

## What To Keep Web-Specific
- Browser router setup
- Desktop sidebar shells
- Web-specific modal and hover interactions
- DOM file upload implementation details
- Web animation patterns that depend on the browser layout engine

## Migration Rule
- If the code computes data, validates a form, or talks to Supabase, it should be shared whenever possible.
- If the code mostly renders layout, handles browser routing, or depends on desktop interaction patterns, it should be rewritten for mobile.

# JusticeLink (LAYA)

JusticeLink, branded in the app as LAYA, connects people seeking legal help with attorneys in the Philippines. This repository contains the Expo mobile app, React web portals, FastAPI backend, and Supabase schema/migrations. Current product work prioritizes the mobile app while keeping web workflows aligned.

## Main capabilities

- Role-based citizen, attorney, and administrator experiences.
- Conversational AI triage, assessment review, and attorney matching.
- Case lifecycle management, participant messaging, time logging, and review of logged hours.
- Private case-document uploads, visible to case participants through short-lived signed links.
- Legal Library research, including curated rights guides, Juris legal research, and Open Congress pending bills.
- AI-assisted legal document drafting and saved drafts.
- Profile management, notifications, and attorney verification workflows.

## Repository layout

- `mobile/` — Expo / React Native application.
- `frontend/` — React web application and role-based portals.
- `backend/` — FastAPI services for AI workflows and integrations.
- `supabase/` — current SQL migrations and migration-history notes.
- `documentation/` — user, feature, and project documentation.

## Local development

Install the root and app dependencies, configure the required environment values from the relevant `.env.example` files, then use the repository launcher:

```powershell
./dev.ps1 start
```

To start Android emulators using the launcher:

```powershell
./dev.ps1 emulators
```

The backend and web app can also be started independently with the root npm scripts. See [mobile/README.md](mobile/README.md), [frontend/README.md](frontend/README.md), and [backend/README.md](backend/README.md) for component-specific details.

## Database migration caution

The linked Supabase project contains older applied migrations whose original SQL files are not present in this checkout. Review [supabase/migrations/README.md](supabase/migrations/README.md) before changing migration history. Do not reset the linked project or push a reconstructed migration chain until the missing SQL is recovered and reviewed.

## Verification

Useful checks are available through the root and component package scripts. Emulator/system testing should be performed explicitly as part of a test session; a successful static build does not substitute for validating real authenticated role workflows.

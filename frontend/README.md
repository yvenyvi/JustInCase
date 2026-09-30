# JusticeLink Web

React + Vite web portals for citizens, attorneys, and administrators. The web app remains supported while current feature development prioritizes the mobile client. Citizen and attorney case views support case management, legal research, participant messaging, and case-file access using short-lived signed links for private uploads.

## Local setup

From this directory, create a `.env` file with the appropriate project values:

```text
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<supabase-anon-key>
VITE_BACKEND_URL=http://localhost:8000
```

Install dependencies with `npm install`. Start the Vite development server with:

```powershell
npm run dev
```

Start the API separately from the repository root with `./dev.ps1 start` (this also starts Expo), or use the instructions in [backend/README.md](../backend/README.md).

## Useful commands

```powershell
npm run build
npm run lint
npm run test:e2e
```

E2E tests require the configured backend, Supabase project, and test accounts described by the test setup. A successful build is not a substitute for checking authenticated role-specific workflows.

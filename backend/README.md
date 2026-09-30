# JusticeLink API

FastAPI backend for JusticeLink / LAYA. It provides AI-assisted triage, legal research support, document drafting, Kampi chat, legal-registration uploads, and related integrations used by the mobile and web clients.

## Local setup

Use a supported Python version and create `backend/.env` with the service configuration used by your environment. Common settings include:

```text
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<server-only-service-role-key>
GROQ_API_KEY_1=<groq-api-key>
GROQ_MODEL=openai/gpt-oss-20b
FRONTEND_ORIGIN=http://localhost:5173
BACKEND_PUBLIC_BASE_URL=http://localhost:8000
```

Add optional integration credentials only when the corresponding feature is enabled. Never put the service-role key or provider secrets in the mobile or web environment, and never commit `.env` files.

Install dependencies and start the API from the repository root:

```powershell
python -m pip install -r backend/requirements.txt
./dev.ps1 start
```

The root launcher starts the backend and Expo. To start only the backend:

```powershell
cd backend
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Health check: `http://localhost:8000/health`.

## Main mobile-facing AI routes

- `POST /api/triage/interactive` — interactive triage and explicit assessment generation. Conversation turns do not search Juris; assessment generation uses de-identified research queries.
- `POST /api/legal-research/search` — authenticated legal source search.
- `POST /api/kampi/chat` — legal-information assistant.
- `GET /api/documents/templates` and `POST /api/documents/generate` — document drafting.
- `POST /api/legal-registration/upload-proof` — upload of verification/profile assets handled by the backend.

The API keeps triage history temporary. Triage review alone does not create a case; case submission is confirmed by the mobile workflow. Provider outages should not be treated as verified legal research, and generated content is not a substitute for a lawyer's advice.

## Checks

From the repository root, run backend tests with:

```powershell
npm run test:backend
```

Configuration and database migrations are environment-specific. See [../supabase/migrations/README.md](../supabase/migrations/README.md) before attempting database migration reconciliation; the original SQL for older applied migrations is missing from this checkout.

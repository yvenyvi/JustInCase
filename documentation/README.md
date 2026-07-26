# JusticeLink — Developer Documentation

JusticeLink is a full-stack legal aid platform for the Philippines that connects citizens in need of legal help with volunteer attorneys. It features AI-powered case triage, identity verification, document generation, and real-time messaging — delivered through three role-based portals.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Tech Stack](#tech-stack)
3. [Folder Structure](#folder-structure)
4. [Database Schema](#database-schema)
5. [Environment Setup](#environment-setup)
6. [Running the App](#running-the-app)
7. [API Reference](#api-reference)
8. [External Service Integrations](#external-service-integrations)
9. [Testing](#testing)
10. [Row-Level Security (RLS)](#row-level-security)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     Browser (React)                      │
│  Landing │ Login │ Citizen Portal │ Attorney │ Admin      │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP / Supabase Realtime
          ┌──────────────┴──────────────┐
          │                             │
   ┌──────▼──────┐              ┌───────▼──────┐
   │  FastAPI     │              │   Supabase    │
   │  (port 8000) │              │  PostgreSQL   │
   │  Uvicorn     │              │  Auth + RLS   │
   └──────┬──────┘              └───────┬──────┘
          │                             │
   ┌──────▼──────┐              ┌───────▼──────┐
   │  Groq LLM   │              │  Supabase    │
   │  (Kampi AI) │              │  Storage     │
   └─────────────┘              └─────────────┘
          │
   ┌──────▼──────┐
   │  Didit API  │
   │ (ID verify) │
   └─────────────┘
```

**Data flow:**
- The React frontend authenticates via **Supabase Auth** (JWT tokens stored in browser `localStorage`).
- Role-based route guards (`ProtectedRoute`) redirect users based on their `role` field in the `users` table.
- The **FastAPI** backend handles operations that require service-role Supabase access or external API calls (Groq, Didit).
- **Supabase RLS policies** enforce data isolation so attorneys only see their assigned cases, clients only see their own data, etc.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend framework | React 19 + TypeScript 5 |
| Build tool | Vite 7 |
| Routing | React Router v7 |
| Animations | Framer Motion, GSAP |
| Backend framework | FastAPI 0.135 (Python 3.14) |
| ASGI server | Uvicorn 0.42 |
| Database | PostgreSQL (via Supabase) |
| Auth | Supabase Auth (email/password) |
| File storage | Supabase Storage |
| AI / LLM | Groq (`llama-3.3-70b-versatile`) |
| ID verification | Didit (OCR + face match) |
| E2E testing | Playwright 1.59 |
| Backend testing | pytest |

---

## Folder Structure

```
justiceLink/
├── frontend/
│   ├── src/
│   │   ├── views/
│   │   │   ├── auth/           # Login, Register, ForgotPassword
│   │   │   ├── public/         # Citizen portal pages
│   │   │   ├── legal/          # Attorney portal pages
│   │   │   ├── admin/          # Admin portal pages
│   │   │   ├── LandingView.tsx
│   │   │   └── MessagesView.tsx
│   │   ├── components/         # Shared UI components
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx  # Auth state + profile across app
│   │   ├── services/           # API call modules per feature
│   │   ├── types/              # TypeScript interfaces
│   │   ├── constants/
│   │   │   └── navigation.ts   # Sidebar nav configs per role
│   │   └── lib/
│   │       └── supabaseClient.ts
│   ├── tests/                  # Playwright E2E tests
│   └── playwright.config.ts
├── backend/
│   ├── main.py                 # All FastAPI routes (monolithic)
│   ├── config.py               # Env config dataclass
│   ├── didit_service.py        # Didit ID verification
│   ├── kampi_service.py        # Groq AI chatbot
│   ├── document_generator_service.py
│   ├── legal_registration_service.py
│   ├── sql/                    # DB migration scripts
│   └── tests/                  # pytest test files
├── database_schema.sql         # Full PostgreSQL schema
├── documentation/
│   ├── screenshots/            # Auto-captured UI screenshots
│   └── diagrams/
└── package.json                # Monorepo scripts
```

---

## Database Schema

### Core Tables

| Table | Description |
|-------|-------------|
| `users` | All user accounts. `role` field drives portal access: `'Citizen'`, `'Volunteer Attorney'`, `'Super Administrator'` |
| `cases` | Legal cases filed by citizens. Links to `client_id` and `attorney_id` in `users` |
| `triage_assessments` | AI-generated assessment per case (issue type, match %, summary) |
| `message_threads` | Conversation containers (linked to a case) |
| `messages` | Individual messages in a thread |
| `thread_participants` | Many-to-many: which users are in which thread |
| `audit_logs` | Immutable event log (action type, IP, user, timestamp) |
| `document_templates` | Available legal document templates (slug, category, body) |
| `generated_documents` | Documents created by a user from a template |
| `ai_conversations` | Kampi chat sessions per user |
| `ai_messages` | Individual Kampi chat messages (role: `user` / `assistant`) |
| `notifications` | In-app alerts per user |
| `system_settings` | Key-value store for feature flags and maintenance config |

### Key Enums

```sql
user_role:         'Volunteer Attorney' | 'Citizen' | 'Super Administrator'
case_status:       'Pending Triage' | 'In Progress' | 'Hearing Scheduled'
                   | 'Demand Sent' | 'Closed - Won' | 'Closed - Lost'
verification_status: 'unverified' | 'verified' | 'rejected'
```

---

## Environment Setup

### Prerequisites

- Node.js 20+
- Python 3.14 (`C:/Python314/python.exe`)
- A Supabase project (URL + anon key + service role key)
- Groq API key
- Didit API credentials

### Frontend `.env` (`frontend/.env`)

```env
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
VITE_BACKEND_URL=http://localhost:8000
```

### Backend `.env` (`backend/.env`)

```env
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

GROQ_API_KEY=<groq-key>
GROQ_MODEL=llama-3.3-70b-versatile

DIDIT_API_KEY=<didit-key>
DIDIT_WEBHOOK_SECRET=<webhook-secret>
DIDIT_WORKFLOW_ID=<workflow-id>

FRONTEND_ORIGIN=http://localhost:5173
```

### Install dependencies

```bash
# Root (concurrently)
npm install

# Frontend
cd frontend && npm install

# Backend
cd backend && pip install -r requirements.txt

# Deployment (repo root)
# Some platforms build from the repo root. Use the root requirements file,
# which forwards to backend/requirements.txt.
pip install -r requirements.txt
```

---

## Running the App

```bash
# Start both frontend (port 5173) and backend (port 8000) together
npm run dev

# Frontend only
npm run dev:frontend

# Backend only
npm run dev:backend
```

The frontend Vite dev server auto-detects ports 5173–5176 if one is in use.

---

## API Reference

All backend routes are prefixed with `/api`.

### Registration & Identity Verification

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/public-registration/start` | Initiate Didit ID verification session |
| `GET` | `/api/public-registration/status/{session_id}` | Poll Didit session status |
| `POST` | `/api/public-registration/finalize` | Create user account after ID verification |
| `POST` | `/api/didit/webhook` | Receive Didit verification callback (HMAC verified) |

### Attorney Registration

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/legal-registration/upload-proof` | Upload IBP card + selfie for verification |

### Kampi AI Chatbot

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/kampi/chat` | Send a message; receives AI reply from Groq |

**Request body:**
```json
{
  "message": "What are my rights as a tenant?",
  "conversation_history": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ]
}
```

### Legal Document Generation

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/documents/templates` | List all active document templates |
| `POST` | `/api/documents/generate` | Generate document draft (AI or template interpolation) |

**Request body for generate:**
```json
{
  "template_id": "wage-claim",
  "user_data": {
    "full_name": "Juan dela Cruz",
    "employer_name": "ABC Corp",
    "amount_owed": "15000"
  }
}
```

---

## External Service Integrations

### Didit (ID Verification)

Didit performs OCR extraction and face matching against Philippine government IDs. The flow:

1. Frontend calls `/api/public-registration/start` → backend creates a Didit session and returns a redirect URL.
2. User completes verification on Didit's hosted UI.
3. Didit sends a webhook to `/api/didit/webhook` (HMAC-signed).
4. Frontend polls `/api/public-registration/status/{id}` until status is `approved`.
5. Frontend calls `/api/public-registration/finalize` to create the Supabase user account with `is_didit_verified = true`.

### Groq LLM

Used in two places:

- **Kampi chatbot** (`kampi_service.py`): Responds to general legal questions in Filipino and English. Configured to stay within Philippine law scope only.
- **Document generation** (`document_generator_service.py`): Fills in legal document templates based on user-supplied data. Falls back to template string interpolation if the API fails.

Model: `llama-3.3-70b-versatile`

---

## Testing

### E2E Tests (Playwright)

```bash
# Run all E2E tests
npm run test:e2e

# Run with browser UI (for debugging)
npm run test:e2e:ui

# Run screenshot capture only
cd frontend && npx playwright test tests/screenshots.spec.ts --project=screenshots
```

Auth state for the three test accounts (admin, attorney, citizen) is saved in `frontend/tests/.auth/` by the global setup script (`tests/global.setup.ts`).

Test accounts use credentials defined in `global.setup.ts`:

| Role | Email |
|------|-------|
| Admin | `lance.admin@justice.link` |
| Attorney | `lance.attorney@justice.link` |
| Citizen | `lance.citizen@justice.link` |

### Backend Tests (pytest)

```bash
npm run test:backend
# or directly:
cd backend && python -m pytest -v
```

---

## Row-Level Security

Supabase RLS policies enforce data isolation at the database level:

| Table | Citizen | Attorney | Admin |
|-------|---------|----------|-------|
| `users` | Read own row; update own | Read assigned clients | Full CRUD |
| `cases` | CRUD own cases | Read assigned; update status | Full CRUD |
| `messages` | Thread participants only | Thread participants only | Full |
| `audit_logs` | Insert own actions | Insert own actions | Read all |
| `generated_documents` | CRUD own | — | Full |
| `system_settings` | — | — | Full |

RLS policies are defined in `database_schema.sql` and should be applied via the Supabase dashboard or migrations in `backend/sql/`.

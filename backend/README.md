# Backend Server Guide

This backend uses FastAPI with Uvicorn.

## Prerequisites

- Python 3.14+ (installed at `C:\Python314\python.exe`)
- Backend environment file at `.env`
- Groq API key in `.env` for Kampi chat (`GROQ_API_KEY`)

## 1. Start The Server

From the project root:

```powershell
cd backend
c:/python314/python.exe -m pip install fastapi uvicorn httpx python-dotenv python-multipart "pydantic[email]"
c:/python314/python.exe -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Deployment note (repo root build):

```powershell
c:/python314/python.exe -m pip install -r requirements.txt
cd backend
c:/python314/python.exe -m uvicorn main:app --host 0.0.0.0 --port 8000
```

Alternative start command:

```powershell
cd backend
c:/python314/python.exe run.py
```

Server URLs:
- App: http://localhost:8000
- Health check: http://localhost:8000/health

## 2. Stop The Server

In the terminal where the backend is running, press:

```text
Ctrl+C
```

## 3. Restart The Server

1. Stop it with Ctrl+C.
2. Run the start command again.

Notes:
- With `--reload`, code changes reload automatically.
- Changes to `.env` are safest with a full restart.

## 4. Quick Health Check

Run:

```powershell
Invoke-RestMethod http://localhost:8000/health
```

Expected response:

```json
{
  "ok": true
}
```

## Kampi (Groq) Setup

Add these values to `backend/.env`:

```text
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.3-70b-versatile
```

Kampi chat endpoint:

```text
POST /api/kampi/chat
```

Sample payload:

```json
{
  "message": "Pwede ba akong paalisin agad ng landlord ko?",
  "history": [
    { "role": "user", "content": "Hello" },
    { "role": "assistant", "content": "Kumusta!" }
  ],
  "rightsContext": [
    {
      "title": "Housing & Eviction",
      "detail": "Proteksyon laban sa hindi makatwirang eviction.",
      "lawSection": "Rent Control Act",
      "lawReference": "RA 9653"
    }
  ]
}
```

## Document Generator (Phase 1)

Run the migration script in Supabase SQL Editor (or MCP SQL tool):

```text
backend/sql/create_document_generator_phase1.sql
```

This creates:
- `document_templates`
- `generated_documents`

Backend behavior now includes:
- AI-assisted professional drafting (uses `GROQ_API_KEY` + `GROQ_MODEL`)
- Structured fallback draft when AI is unavailable
- Expanded Philippine-law templates across Housing, Labor, Family, Consumer, Cybercrime, Civil, and Barangay concerns
- Best-effort template sync to Supabase (upsert by `slug`) when service role config is available

API endpoints:

```text
GET  /api/documents/templates
POST /api/documents/generate
```

Current built-in template slugs:

```text
demand-deposit
wage-claim
repair-demand
barangay-sumbong
illegal-dismissal-request
workplace-harassment-complaint
vawc-protection-request
child-support-demand
consumer-refund-demand
cybercrime-complaint-draft
debt-demand-letter
```

`POST /api/documents/generate` example payload:

```json
{
  "templateSlug": "demand-deposit",
  "userId": "<auth-user-id>",
  "values": {
    "sender_name": "Juan Dela Cruz",
    "recipient_name": "Maria Santos",
    "incident_date": "2026-04-26",
    "issue_summary": "Hindi naibalik ang security deposit matapos matapos ang lease."
  }
}
```

## Legal Registration Upload Setup

Add these values to `backend/.env`:

```text
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
LEGAL_VERIFICATION_BUCKET=verification-documents
```

Legal upload endpoint:

```text
POST /api/legal-registration/upload-proof
```

Behavior:
- Upload uses backend service-role credentials.
- Bucket is auto-created if missing.
- Uploaded assets return a public URL for legal profile metadata.

## Common Issues

### Missing dependency error
Example: `ModuleNotFoundError: No module named 'httpx'`

Fix:

```powershell
cd backend
c:/python314/python.exe -m pip install fastapi uvicorn httpx python-dotenv python-multipart "pydantic[email]"
```

### Port already in use
Start on another port:

```powershell
cd backend
c:/python314/python.exe -m uvicorn main:app --reload --host 0.0.0.0 --port 8001
```

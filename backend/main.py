from typing import Any, Optional

import httpx
from fastapi import Depends, FastAPI, HTTPException, Request, UploadFile, File, Form, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, EmailStr, Field

from config import config
from didit_service import (
    finalize_public_registration,
    get_attempt_status,
    process_didit_webhook,
    start_public_didit_registration,
)
from document_generator_service import generate_document_draft, list_document_templates
from kampi_service import generate_kampi_reply
from legal_registration_service import upload_legal_verification_asset
from triage_service import analyze_triage_case

app = FastAPI(title="JusticeLink Backend", version="1.0.0")

_http_bearer = HTTPBearer(auto_error=True)


def _get_supabase_user(token: str) -> dict[str, Any]:
    """Validate a Supabase JWT and return the user payload.

    Calls the Supabase Auth REST endpoint so the backend never trusts
    caller-supplied identity — the JWT is always verified server-side.
    """
    try:
        resp = httpx.get(
            f"{config.supabase_url}/auth/v1/user",
            headers={
                "Authorization": f"Bearer {token}",
                "apikey": config.supabase_service_role_key,
            },
            timeout=8,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service unavailable.",
        ) from exc

    if resp.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token.",
        )

    return resp.json()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_http_bearer),
) -> dict[str, Any]:
    """FastAPI dependency: validate Bearer token and return Supabase user dict."""
    return _get_supabase_user(credentials.credentials)

_cors_origins = [
    "https://justice-link-phi.vercel.app",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:5176",
    "http://localhost:5199",
]
if config.frontend_origin and config.frontend_origin not in _cors_origins:
    _cors_origins.append(config.frontend_origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class StartRegistrationBody(BaseModel):
    email: EmailStr
    returnUrl: Optional[str] = None

class FinalizeRegistrationBody(BaseModel):
    attemptId: str
    email: EmailStr
    password: str
    phoneNumber: Optional[str] = None
    address: Optional[dict[str, Any]] = None


class KampiHistoryMessage(BaseModel):
    role: str
    content: str


class KampiRightsContextItem(BaseModel):
    title: str
    detail: Optional[str] = None
    lawSection: Optional[str] = None
    lawReference: Optional[str] = None


class KampiChatBody(BaseModel):
    message: str
    history: list[KampiHistoryMessage] = Field(default_factory=list)
    rightsContext: list[KampiRightsContextItem] = Field(default_factory=list)


class DocumentGenerateBody(BaseModel):
    templateId: Optional[str] = None
    templateSlug: Optional[str] = None
    values: dict[str, str] = Field(default_factory=dict)


class LawyerInfo(BaseModel):
    id: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    firm_name: Optional[str] = None
    city_municipality: Optional[str] = None


class TriageAnalyzeBody(BaseModel):
    description: str
    opposingPartyType: Optional[str] = ""
    urgency: Optional[str] = ""
    province: Optional[str] = ""
    income: Optional[str] = ""
    deadlineDate: Optional[str] = ""
    hasDeadline: Optional[bool] = False
    evidence: Optional[str] = ""
    outcome: Optional[str] = ""
    availableLawyers: Optional[list[LawyerInfo]] = Field(default_factory=list)


@app.get("/health")
def health() -> dict[str, bool]:
    return {"ok": True}


from fastapi.responses import HTMLResponse, Response

@app.get("/favicon.ico")
def favicon():
    return Response(status_code=204)

@app.get("/api/didit/webhook", response_class=HTMLResponse)
async def didit_webhook_redirect(request: Request):
    # Didit v3 redirects the user here after verification via GET because callback_method is set to "both" in payload.
    return_url = request.query_params.get("returnUrl")
    frontend_url = return_url if return_url else f"{config.frontend_origin}/register"
    
    query = []
    for k, v in request.query_params.items():
        if k != "returnUrl":
            query.append(f"{k}={v}")
            
    if query:
        sep = "&" if "?" in frontend_url else "?"
        frontend_url += sep + "&".join(query)
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Verification Complete</title>
        <style>
            body {{ font-family: -apple-system, system-ui, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #f8fafc; color: #0f172a; text-align: center; padding: 20px; }}
            h2 {{ margin-bottom: 8px; }}
            p {{ color: #64748b; margin-bottom: 24px; }}
            .btn {{ display: inline-block; background-color: #0d9488; color: white; padding: 14px 28px; text-decoration: none; border-radius: 999px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px -1px rgb(13 148 136 / 0.2); }}
        </style>
    </head>
    <body>
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 16px;"><path d="M22 11.08V12a10 10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
        <h2>Verification Complete</h2>
        <p>You can now return to the JusticeLink app to finish setting up your account.</p>
        <a href="{frontend_url}" class="btn">Return to App</a>
        
        <script>
            // Attempt automatic redirect
            setTimeout(function() {{
                window.location.href = "{frontend_url}";
            }}, 1500);
        </script>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)

@app.post("/api/didit/webhook")
async def didit_webhook(request: Request) -> dict[str, Any]:
    try:
        raw_body = await request.body()
        signature = request.headers.get(config.didit_signature_header)
        result = process_didit_webhook(raw_body, signature)
        return {"ok": True, **result}
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@app.post("/api/public-registration/start")
def public_registration_start(body: StartRegistrationBody) -> dict[str, Any]:
    try:
        result = start_public_didit_registration(body.email, return_url=body.returnUrl)
        if result.get("blocked"):
            raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=result)
        return result
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@app.post("/api/didit/public/session")
def didit_public_session(body: StartRegistrationBody) -> dict[str, Any]:
    return public_registration_start(body)


@app.get("/api/public-registration/status/{attempt_id}")
def public_registration_status(attempt_id: str) -> dict[str, Any]:
    try:
        return get_attempt_status(attempt_id)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@app.get("/api/didit/public/status/{attempt_id}")
def didit_public_status(attempt_id: str) -> dict[str, Any]:
    return public_registration_status(attempt_id)


@app.post("/api/public-registration/finalize")
def public_registration_finalize(body: FinalizeRegistrationBody) -> dict[str, Any]:
    try:
        result = finalize_public_registration(
            attempt_id=body.attemptId,
            email=body.email,
            password=body.password,
            phone_number=body.phoneNumber,
            address=body.address,
        )
        return {"ok": True, **result}
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@app.post("/api/didit/public/finalize")
def didit_public_finalize(body: FinalizeRegistrationBody) -> dict[str, Any]:
    return public_registration_finalize(body)


@app.post("/api/legal-registration/upload-proof")
async def legal_registration_upload_proof(
    email: EmailStr = Form(...),
    kind: str = Form(...),
    file: UploadFile = File(...),
) -> dict[str, Any]:
    try:
        file_bytes = await file.read()
        asset_url = upload_legal_verification_asset(
            email=str(email),
            kind=kind.strip().lower(),
            file_bytes=file_bytes,
            filename=file.filename or f"{kind}.jpg",
            content_type=file.content_type,
        )
        return {"ok": True, "url": asset_url}
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Unable to upload verification asset right now.") from exc


@app.post("/api/kampi/chat")
def kampi_chat(body: KampiChatBody) -> dict[str, str]:
    try:
        reply = generate_kampi_reply(
            message=body.message,
            history=[entry.model_dump() for entry in body.history],
            rights_context=[entry.model_dump() for entry in body.rightsContext],
        )
        return {"reply": reply}
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Unable to generate Kampi response right now.") from exc


@app.get("/api/documents/templates")
def document_templates() -> dict[str, Any]:
    try:
        templates = list_document_templates()
        return {"templates": templates}
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Unable to load document templates.") from exc


@app.post("/api/documents/generate")
def document_generate(
    body: DocumentGenerateBody,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    if not body.templateId and not body.templateSlug:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="templateId or templateSlug is required.")

    user_id: str = current_user["id"]

    try:
        result = generate_document_draft(
            template_id=body.templateId,
            template_slug=body.templateSlug,
            user_id=user_id,
            values=body.values,
        )
        return result
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Unable to generate document draft right now.") from exc


@app.post("/api/triage/analyze")
def triage_analyze(body: TriageAnalyzeBody) -> dict[str, Any]:
    deadline_str = f"Deadline: {body.deadlineDate}" if (body.hasDeadline and body.deadlineDate) else "None"
    lawyers_data = [l.model_dump() for l in (body.availableLawyers or [])]

    try:
        result = analyze_triage_case(
            description=body.description,
            opposing_party_type=body.opposingPartyType or "",
            urgency=body.urgency or "",
            province=body.province or "",
            income=body.income or "",
            deadline_str=deadline_str,
            evidence=body.evidence or "",
            outcome=body.outcome or "",
            available_lawyers=lawyers_data,
        )
        return result
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Unable to perform AI triage analysis right now.") from exc

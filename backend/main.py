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
from document_generator_service import generate_document_draft, list_document_templates, generate_interactive_draft
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

class InteractiveDraftHistoryMessage(BaseModel):
    role: str
    content: str

class InteractiveDraftBody(BaseModel):
    history: list[InteractiveDraftHistoryMessage] = Field(default_factory=list)


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
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Unable to upload verification asset right now.") from exc


class UpsertProfileBody(BaseModel):
    id: str
    email: str
    handle: str
    first_name: str = "User"
    middle_name: Optional[str] = None
    last_name: str = "Account"
    phone_number: Optional[str] = None
    street_address: Optional[str] = None
    region: Optional[str] = None
    province: Optional[str] = None
    city_municipality: Optional[str] = None
    barangay: Optional[str] = None
    is_didit_verified: bool = False
    status_verification: str = "unverified"
    role: str = "Citizen"
    date_of_birth: Optional[str] = None
    roll_number: Optional[str] = None
    id_picture_url: Optional[str] = None
    selfie_url: Optional[str] = None


@app.post("/api/registration/upsert-profile")
async def registration_upsert_profile(body: UpsertProfileBody) -> dict[str, Any]:
    """
    Safety-net endpoint: explicitly inserts/updates the user profile in public.users.
    Called by the mobile app after signUp() in case the Postgres trigger silently failed
    (e.g. handle uniqueness violation caught by EXCEPTION WHEN OTHERS in the trigger).
    Uses the service role key so it bypasses RLS.
    """
    if not config.supabase_url or not config.supabase_service_role_key:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Supabase not configured.")

    headers = {
        "apikey": config.supabase_service_role_key,
        "Authorization": f"Bearer {config.supabase_service_role_key}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates",
    }

    profile: dict[str, Any] = {
        "id": body.id,
        "email": body.email,
        "handle": body.handle,
        "first_name": body.first_name,
        "middle_name": body.middle_name,
        "last_name": body.last_name,
        "phone_number": body.phone_number,
        "street_address": body.street_address,
        "region": body.region,
        "province": body.province,
        "city_municipality": body.city_municipality,
        "barangay": body.barangay,
        "is_didit_verified": body.is_didit_verified,
        "status_verification": body.status_verification,
        "role": body.role,
        "roll_number": body.roll_number,
        "id_picture_url": body.id_picture_url,
        "selfie_url": body.selfie_url,
    }
    if body.date_of_birth:
        profile["date_of_birth"] = body.date_of_birth

    try:
        resp = httpx.post(
            f"{config.supabase_url}/rest/v1/users",
            headers=headers,
            json=profile,
            timeout=15,
        )
        if resp.status_code in (200, 201):
            return {"ok": True, "action": "inserted"}
        # If the user row already exists (trigger succeeded), try an update instead
        if resp.status_code == 409 or "duplicate" in resp.text.lower():
            patch_resp = httpx.patch(
                f"{config.supabase_url}/rest/v1/users?id=eq.{body.id}",
                headers=headers,
                json={k: v for k, v in profile.items() if k != "id"},
                timeout=15,
            )
            return {"ok": patch_resp.status_code < 300, "action": "updated"}
        return {"ok": False, "detail": resp.text}
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc


@app.post("/api/legal-registration/ocr")
async def legal_registration_ocr(
    file: UploadFile = File(...)
) -> dict[str, Any]:
    try:
        file_bytes = await file.read()
        import base64
        import json
        from gemini_client import call_gemini_vision
        
        base64_image = base64.b64encode(file_bytes).decode("utf-8")
        prompt = """
        Extract the following information from this Philippine ID:
        - First Name
        - Last Name
        - Middle Name
        - Date of Birth (YYYY-MM-DD)
        - ID Number
        - Expiration Date (YYYY-MM-DD)
        - Sex (Male/Female)
        - Address (Street, City, Province)

        Respond ONLY with a valid JSON object matching this schema exactly:
        {
            "firstName": "",
            "lastName": "",
            "middleName": "",
            "dob": "",
            "idNumber": "",
            "expirationDate": "",
            "sex": "",
            "streetAddress": "",
            "city": "",
            "province": ""
        }
        Return empty string for missing fields. Do NOT wrap in markdown code blocks.
        """
        
        response_text = call_gemini_vision(
            prompt=prompt,
            base64_image=base64_image,
            mime_type=file.content_type or "image/jpeg"
        )
        
        # Clean markdown code block if present
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
            
        data = json.loads(response_text.strip())
        return {"ok": True, "data": data}
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc


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

@app.post("/api/documents/interactive-draft")
def document_interactive_draft(
    body: InteractiveDraftBody,
    req: Request,
) -> dict[str, str]:
    try:
        # Check for Authorization header but don't strictly require it
        user_profile = {}
        auth_header = req.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            try:
                user = _get_supabase_user(token)
                user_id = user.get("id")
                
                # Fetch full profile from the database
                resp = httpx.get(
                    f"{config.supabase_url}/rest/v1/users?id=eq.{user_id}",
                    headers={
                        "apikey": config.supabase_service_role_key,
                        "Authorization": f"Bearer {config.supabase_service_role_key}",
                    },
                    timeout=5,
                )
                if resp.status_code == 200 and len(resp.json()) > 0:
                    db_user = resp.json()[0]
                    name_parts = filter(None, [db_user.get("first_name"), db_user.get("middle_name"), db_user.get("last_name")])
                    user_profile["full_name"] = " ".join(name_parts)
                    user_profile["email"] = db_user.get("email") or user.get("email", "")
                    user_profile["phone_number"] = db_user.get("phone_number") or ""
                    
                    addr_parts = filter(None, [db_user.get("street_address"), db_user.get("barangay"), db_user.get("city_municipality"), db_user.get("province")])
                    user_profile["address"] = ", ".join(addr_parts)
                else:
                    meta = user.get("user_metadata", {})
                    user_profile["full_name"] = f"{meta.get('firstName', '')} {meta.get('lastName', '')}".strip()
                    user_profile["email"] = user.get("email", "")
            except Exception:
                pass # ignore auth errors for guest users

        # Convert Pydantic models to dicts
        history_dicts = [{"role": msg.role, "content": msg.content} for msg in body.history]
        
        reply = generate_interactive_draft(history=history_dicts, user_profile=user_profile)
        return {"response": reply}
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc


class DocumentSaveBody(BaseModel):
    title: str
    content: str
    templateSlug: Optional[str] = None

@app.post("/api/documents/save")
def document_save(
    body: DocumentSaveBody,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    user_id = current_user["id"]
    try:
        resp = httpx.post(
            f"{config.supabase_url}/rest/v1/user_documents",
            headers={
                "apikey": config.supabase_service_role_key,
                "Authorization": f"Bearer {config.supabase_service_role_key}",
                "Content-Type": "application/json",
                "Prefer": "return=representation"
            },
            json={
                "user_id": user_id,
                "title": body.title,
                "content": body.content,
                "template_slug": body.templateSlug
            },
            timeout=10,
        )
        resp.raise_for_status()
        return {"ok": True, "document": resp.json()[0]}
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Unable to save document right now.") from exc

@app.get("/api/documents")
def list_user_documents(
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    user_id = current_user["id"]
    try:
        resp = httpx.get(
            f"{config.supabase_url}/rest/v1/user_documents?user_id=eq.{user_id}&order=created_at.desc",
            headers={
                "apikey": config.supabase_service_role_key,
                "Authorization": f"Bearer {config.supabase_service_role_key}",
            },
            timeout=10,
        )
        resp.raise_for_status()
        return {"documents": resp.json()}
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Unable to fetch documents right now.") from exc


class DocumentExportBody(BaseModel):
    content: str
    title: str = "Document"

from fastapi.responses import StreamingResponse
import io

@app.post("/api/documents/export/pdf")
def document_export_pdf(body: DocumentExportBody) -> StreamingResponse:
    try:
        from document_export_service import convert_markdown_to_pdf
        pdf_buffer = convert_markdown_to_pdf(body.content)
        headers = {
            'Content-Disposition': f'attachment; filename="{body.title.replace(" ", "_")}.pdf"'
        }
        return StreamingResponse(pdf_buffer, media_type="application/pdf", headers=headers)
    except Exception as exc:
        import traceback
        error_msg = "".join(traceback.format_exception(type(exc), exc, exc.__traceback__))
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to generate PDF: {error_msg}")

@app.post("/api/documents/export/docx")
def document_export_docx(body: DocumentExportBody) -> StreamingResponse:
    try:
        from document_export_service import convert_markdown_to_docx
        docx_buffer = convert_markdown_to_docx(body.content)
        headers = {
            'Content-Disposition': f'attachment; filename="{body.title.replace(" ", "_")}.docx"'
        }
        return StreamingResponse(docx_buffer, media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document", headers=headers)
    except Exception as exc:
        import traceback
        error_msg = "".join(traceback.format_exception(type(exc), exc, exc.__traceback__))
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to generate DOCX: {error_msg}")


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


@app.get("/api/lawyers")
def get_lawyers() -> dict[str, Any]:
    try:
        resp = httpx.get(
            f"{config.supabase_url}/rest/v1/users?role=eq.Volunteer+Attorney&select=id,first_name,last_name,firm_name,city_municipality,selfie_url,pro_bono_logs!pro_bono_logs_attorney_id_fkey(hours,is_verified)",
            headers={
                "apikey": config.supabase_service_role_key,
                "Authorization": f"Bearer {config.supabase_service_role_key}",
            },
            timeout=10,
        )
        resp.raise_for_status()
        lawyers_data = resp.json()
        
        # Filter lawyers who have < 60 verified pro-bono hours
        filtered_lawyers = []
        for l in lawyers_data:
            logs = l.get("pro_bono_logs") or []
            total_hours = sum(float(log.get("hours", 0)) for log in logs if log.get("is_verified"))
            if total_hours < 60:
                l.pop("pro_bono_logs", None) # clean up before sending to client
                filtered_lawyers.append(l)
                
        # Limit to 20 after filtering
        return {"lawyers": filtered_lawyers[:20]}
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Unable to fetch lawyers.") from exc


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

@app.post("/api/triage/interactive")
def triage_interactive(
    history: str = Form(...),
    files: list[UploadFile] = File(None)
):
    import json
    try:
        history_dicts = json.loads(history)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid history format")
        
    extracted_text = ""
    if files:
        import PyPDF2
        for file in files:
            try:
                if file.filename.lower().endswith('.pdf'):
                    pdf_reader = PyPDF2.PdfReader(file.file)
                    text = []
                    for page in pdf_reader.pages:
                        page_text = page.extract_text()
                        if page_text:
                            text.append(page_text)
                    extracted_text += f"\n\n[Content of attached file {file.filename}]:\n" + "\n".join(text)
                else:
                    # Very basic fallback for other files: just acknowledge them
                    extracted_text += f"\n\n[User attached a file: {file.filename}, but text extraction is not supported for this type.]"
            except Exception as e:
                print(f"Error reading file {file.filename}: {e}")
                
    if extracted_text and history_dicts and len(history_dicts) > 0 and history_dicts[-1]['role'] == 'user':
        history_dicts[-1]['content'] += extracted_text

    try:
        from triage_service import generate_interactive_triage
        reply = generate_interactive_triage(history=history_dicts)
        return {"response": reply}
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Unable to perform AI triage analysis right now.") from exc

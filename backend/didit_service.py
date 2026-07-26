import base64
import hashlib
import hmac
import json
import re
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

import httpx

from config import config


attempt_store: dict[str, dict[str, Any]] = {}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _extract_approval(payload: dict[str, Any]) -> bool:
    approved_states = {"approved", "verified", "success", "passed", "completed", "accept"}

    candidates = [
        payload.get("status"),
        payload.get("result"),
        payload.get("decision"),
        (payload.get("data") or {}).get("status"),
        ((payload.get("data") or {}).get("decision") or {}).get("status"),
    ]

    for raw in candidates:
        if isinstance(raw, str) and raw.lower() in approved_states:
            return True

    score = ((payload.get("data") or {}).get("decision") or {}).get("score")
    if isinstance(score, (int, float)):
        return score >= 0.8

    return False


def _extract_session_id(payload: dict[str, Any]) -> str | None:
    data = payload.get("data") if isinstance(payload.get("data"), dict) else {}
    return payload.get("session_id") or payload.get("id") or data.get("session_id") or data.get("id")


def _extract_vendor_data(payload: dict[str, Any]) -> str | None:
    data = payload.get("data") if isinstance(payload.get("data"), dict) else {}
    return payload.get("vendor_data") or data.get("vendor_data")


def _pick_first_string(*values: Any) -> str | None:
    for value in values:
        if isinstance(value, str):
            text = value.strip()
            if text:
                return text
    return None


def _to_dict(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _find_key_recursive(data: Any, target_key: str) -> Any | None:
    if isinstance(data, dict):
        if target_key in data:
            return data[target_key]
        for key, value in data.items():
            result = _find_key_recursive(value, target_key)
            if result is not None:
                return result
    elif isinstance(data, list):
        for item in data:
            result = _find_key_recursive(item, target_key)
            if result is not None:
                return result
    return None


def _extract_ocr_data(payload: dict[str, Any]) -> dict[str, Any]:
    print(f"[Backend OCR] Extracting from payload. Keys: {list(payload.keys())}")
    data = _to_dict(payload.get("data"))
    if data:
        print(f"[Backend OCR] Found 'data' block. Keys: {list(data.keys())}")
    
    data = _to_dict(payload.get("data"))
    attributes = _to_dict(data.get("attributes"))
    result = _to_dict(data.get("result"))
    decision = _to_dict(data.get("decision"))
    document = _to_dict(data.get("document"))
    extracted = _to_dict(data.get("extracted"))
    ocr = _to_dict(data.get("ocr"))
    identity = _to_dict(data.get("identity"))
    person = _to_dict(data.get("person"))

    full_name = _pick_first_string(
        payload.get("full_name"),
        payload.get("name"),
        data.get("full_name"),
        data.get("name"),
        attributes.get("full_name"),
        attributes.get("name"),
        result.get("full_name"),
        result.get("name"),
        extracted.get("full_name"),
        extracted.get("name"),
        ocr.get("full_name"),
        ocr.get("name"),
        identity.get("full_name"),
        identity.get("name"),
        person.get("full_name"),
        person.get("name"),
        _find_key_recursive(payload, "full_name"),
        _find_key_recursive(payload, "name"),
    )

    first_name = _pick_first_string(
        payload.get("first_name"),
        payload.get("firstName"),
        payload.get("given_names"),
        payload.get("given_name"),
        data.get("first_name"),
        data.get("firstName"),
        data.get("given_names"),
        attributes.get("first_name"),
        attributes.get("firstName"),
        attributes.get("given_names"),
        result.get("first_name"),
        result.get("firstName"),
        extracted.get("first_name"),
        extracted.get("firstName"),
        ocr.get("first_name"),
        ocr.get("firstName"),
        identity.get("first_name"),
        identity.get("firstName"),
        person.get("first_name"),
        person.get("firstName"),
        _find_key_recursive(payload, "first_name"),
        _find_key_recursive(payload, "firstName"),
        _find_key_recursive(payload, "given_names"),
        _find_key_recursive(payload, "given_name"),
    )

    middle_name = _pick_first_string(
        payload.get("middle_name"),
        payload.get("middleName"),
        data.get("middle_name"),
        data.get("middleName"),
        attributes.get("middle_name"),
        attributes.get("middleName"),
        result.get("middle_name"),
        result.get("middleName"),
        extracted.get("middle_name"),
        extracted.get("middleName"),
        ocr.get("middle_name"),
        ocr.get("middleName"),
        identity.get("middle_name"),
        identity.get("middleName"),
        person.get("middle_name"),
        person.get("middleName"),
    )

    last_name = _pick_first_string(
        payload.get("last_name"),
        payload.get("lastName"),
        payload.get("family_name"),
        payload.get("surname"),
        data.get("last_name"),
        data.get("lastName"),
        data.get("family_name"),
        attributes.get("last_name"),
        attributes.get("lastName"),
        attributes.get("family_name"),
        attributes.get("surname"),
        result.get("last_name"),
        result.get("lastName"),
        extracted.get("last_name"),
        extracted.get("lastName"),
        ocr.get("last_name"),
        ocr.get("lastName"),
        identity.get("last_name"),
        identity.get("lastName"),
        person.get("last_name"),
        person.get("lastName"),
        _find_key_recursive(payload, "last_name"),
        _find_key_recursive(payload, "lastName"),
        _find_key_recursive(payload, "family_name"),
        _find_key_recursive(payload, "surname"),
    )

    if full_name and (not first_name or not last_name):
        parts = [p for p in full_name.split(" ") if p.strip()]
        if len(parts) >= 2:
            if not first_name:
                first_name = parts[0]
            if not last_name:
                last_name = parts[-1]
            if not middle_name and len(parts) > 2:
                middle_name = " ".join(parts[1:-1])

    dob = _pick_first_string(
        payload.get("dob"),
        payload.get("date_of_birth"),
        payload.get("birth_date"),
        data.get("dob"),
        data.get("date_of_birth"),
        result.get("dob"),
        result.get("date_of_birth"),
        extracted.get("dob"),
        extracted.get("date_of_birth"),
        ocr.get("dob"),
        ocr.get("date_of_birth"),
        identity.get("dob"),
        identity.get("date_of_birth"),
        _find_key_recursive(payload, "dob"),
        _find_key_recursive(payload, "date_of_birth"),
        _find_key_recursive(payload, "birth_date"),
    )

    id_number = _pick_first_string(
        payload.get("id_number"),
        payload.get("idNumber"),
        payload.get("document_number"),
        data.get("id_number"),
        data.get("idNumber"),
        data.get("document_number"),
        document.get("number"),
        document.get("document_number"),
        result.get("id_number"),
        result.get("idNumber"),
        extracted.get("id_number"),
        extracted.get("idNumber"),
        ocr.get("id_number"),
        ocr.get("idNumber"),
        identity.get("id_number"),
        identity.get("idNumber"),
        _find_key_recursive(payload, "id_number"),
        _find_key_recursive(payload, "idNumber"),
        _find_key_recursive(payload, "document_number"),
        _find_key_recursive(payload, "documentNumber"),
    )

    address = _to_dict(
        _to_dict(payload.get("address"))
        or _to_dict(data.get("address"))
        or _to_dict(attributes.get("address"))
        or _to_dict(result.get("address"))
        or _to_dict(extracted.get("address"))
        or _to_dict(ocr.get("address"))
        or _to_dict(identity.get("address"))
        or _to_dict(person.get("address"))
    )

    expiration_date = _pick_first_string(
        payload.get("expiration_date"),
        payload.get("expirationDate"),
        payload.get("date_of_expiry"),
        payload.get("expiry_date"),
        data.get("expiration_date"),
        data.get("expirationDate"),
        data.get("date_of_expiry"),
        data.get("expiry_date"),
        document.get("expiration_date"),
        document.get("date_of_expiry"),
        document.get("expiry_date"),
        result.get("expiration_date"),
        result.get("expirationDate"),
        extracted.get("expiration_date"),
        extracted.get("expirationDate"),
        ocr.get("expiration_date"),
        ocr.get("expirationDate"),
        _find_key_recursive(payload, "expiration_date"),
        _find_key_recursive(payload, "expirationDate"),
        _find_key_recursive(payload, "date_of_expiry"),
        _find_key_recursive(payload, "expiry_date"),
    )

    sex = _pick_first_string(
        payload.get("sex"),
        payload.get("gender"),
        data.get("sex"),
        data.get("gender"),
        attributes.get("sex"),
        attributes.get("gender"),
        result.get("sex"),
        result.get("gender"),
        extracted.get("sex"),
        extracted.get("gender"),
        ocr.get("sex"),
        ocr.get("gender"),
        identity.get("sex"),
        identity.get("gender"),
        person.get("sex"),
        person.get("gender"),
        _find_key_recursive(payload, "sex"),
        _find_key_recursive(payload, "gender"),
    )

    region = _pick_first_string(address.get("region"), address.get("state"))
    province = _pick_first_string(address.get("province"), address.get("state_province"))
    city = _pick_first_string(address.get("city"), address.get("municipality"), address.get("town"))
    barangay = _pick_first_string(address.get("barangay"), address.get("district"), address.get("village"))

    return {
        "fullName": full_name or "",
        "firstName": first_name or "",
        "middleName": middle_name or "",
        "lastName": last_name or "",
        "dob": dob or "",
        "idNumber": id_number or "",
        "expirationDate": expiration_date or "",
        "sex": sex or "",
        "address": {
            "region": region or "",
            "province": province or "",
            "city": city or "",
            "barangay": barangay or "",
        },
    }



# ---------------------------------------------------------------------------
# Image extraction & persistence
# ---------------------------------------------------------------------------

_IMAGE_URL_KEYS = {
    "document_image", "selfie_image", "face_image", "front_image",
    "back_image", "portrait", "photo", "image", "image_url",
    "document_image_url", "selfie_image_url", "face_image_url",
    "front_image_url", "back_image_url", "portrait_url", "photo_url",
    "captured_image", "captured_image_url", "cropped_face",
}

_DOCUMENT_HINT_KEYS = {
    "document_image", "front_image", "back_image", "document_image_url",
    "front_image_url", "back_image_url", "image", "image_url",
    "captured_image", "captured_image_url",
}

_SELFIE_HINT_KEYS = {
    "selfie_image", "face_image", "portrait", "photo",
    "selfie_image_url", "face_image_url", "portrait_url", "photo_url",
    "cropped_face",
}

_DOCUMENT_SECTION_HINTS = {"id_verification", "id_verifications", "document", "documents", "ocr"}
_SELFIE_SECTION_HINTS = {"liveness", "liveness_check", "liveness_checks", "face", "face_match", "selfie"}


def _looks_like_url(value: str) -> bool:
    return value.startswith("http://") or value.startswith("https://")


def _looks_like_base64_image(value: str) -> bool:
    return bool(value) and len(value) > 200 and not _looks_like_url(value)


def _extract_image_urls(payload: dict[str, Any]) -> dict[str, str | None]:
    """Extract document and selfie image URLs (or base64) from a Didit decision payload."""
    document_url: str | None = None
    selfie_url: str | None = None

    def _walk(data: Any, section_hint: str = "") -> None:
        nonlocal document_url, selfie_url

        if isinstance(data, dict):
            for key, value in data.items():
                lower_key = key.lower()

                # Determine section context
                child_section = section_hint
                if lower_key in _DOCUMENT_SECTION_HINTS:
                    child_section = "document"
                elif lower_key in _SELFIE_SECTION_HINTS:
                    child_section = "selfie"

                if lower_key in _IMAGE_URL_KEYS and isinstance(value, str) and (
                    _looks_like_url(value) or _looks_like_base64_image(value)
                ):
                    # Classify based on key name first, then section context
                    if lower_key in _SELFIE_HINT_KEYS:
                        if not selfie_url:
                            selfie_url = value
                    elif lower_key in _DOCUMENT_HINT_KEYS:
                        if not document_url:
                            document_url = value
                    elif child_section == "selfie" and not selfie_url:
                        selfie_url = value
                    elif child_section == "document" and not document_url:
                        document_url = value
                    elif not document_url:
                        document_url = value
                    elif not selfie_url:
                        selfie_url = value
                else:
                    _walk(value, child_section)
        elif isinstance(data, list):
            for item in data:
                _walk(item, section_hint)

    _walk(payload)
    return {"documentImageUrl": document_url, "selfieImageUrl": selfie_url}


def _supabase_storage_headers(content_type: str | None = None) -> dict[str, str]:
    headers = {
        "apikey": config.supabase_service_role_key,
        "Authorization": f"Bearer {config.supabase_service_role_key}",
    }
    if content_type:
        headers["Content-Type"] = content_type
    return headers


def _ensure_verification_bucket() -> None:
    """Ensure the verification-documents bucket exists (reuses legal reg pattern)."""
    bucket = config.legal_verification_bucket
    bucket_url = f"{config.supabase_url}/storage/v1/bucket/{bucket}"
    response = httpx.get(bucket_url, headers=_supabase_storage_headers(), timeout=20)
    if response.status_code == 200:
        return
    if response.status_code not in (400, 404):
        print(f"[Backend] Bucket check unexpected status: {response.status_code}")
        return
    create_response = httpx.post(
        f"{config.supabase_url}/storage/v1/bucket",
        headers=_supabase_storage_headers("application/json"),
        json={
            "id": bucket,
            "name": bucket,
            "public": True,
            "file_size_limit": 5 * 1024 * 1024,
            "allowed_mime_types": ["image/jpeg", "image/jpg", "image/png", "image/webp"],
        },
        timeout=20,
    )
    if create_response.status_code not in (200, 201):
        print(f"[Backend] Bucket creation response: {create_response.text}")


def _download_and_store_image(
    url_or_base64: str,
    email: str,
    kind: str,
) -> str | None:
    """Download image from a presigned URL (or decode base64) and upload to Supabase Storage.
    Returns the permanent public URL, or None on failure.
    """
    if not config.supabase_url or not config.supabase_service_role_key:
        print("[Backend] Supabase not configured, skipping image storage.")
        return None

    try:
        # Get image bytes
        if _looks_like_url(url_or_base64):
            print(f"[Backend] Downloading Didit image ({kind}) from presigned URL...")
            import urllib.request
            req = urllib.request.Request(url_or_base64, headers={'User-Agent': 'Mozilla/5.0'})
            try:
                with urllib.request.urlopen(req, timeout=30) as resp:
                    if resp.status >= 400:
                        print(f"[Backend] Failed to download image ({kind}): HTTP {resp.status}")
                        return None
                    image_bytes = resp.read()
                    content_type = resp.headers.get("content-type", "image/jpeg")
            except Exception as dl_exc:
                print(f"[Backend] Error downloading image: {dl_exc}")
                return None
        else:
            print(f"[Backend] Decoding base64 image ({kind})...")
            # Strip data URI prefix if present
            raw = url_or_base64
            if raw.startswith("data:"):
                raw = raw.split(",", 1)[-1]
            image_bytes = base64.b64decode(raw)
            content_type = "image/jpeg"

        if not image_bytes:
            print(f"[Backend] Empty image bytes for {kind}, skipping.")
            return None

        _ensure_verification_bucket()

        # Build storage path
        email_key = re.sub(r"[^a-zA-Z0-9]+", "_", email.strip().lower()).strip("_") or "user"
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S")
        extension = "jpg"
        if "png" in content_type:
            extension = "png"
        elif "webp" in content_type:
            extension = "webp"

        object_path = f"didit-verification/{email_key}/{kind}-{timestamp}.{extension}"
        bucket = config.legal_verification_bucket
        upload_url = f"{config.supabase_url}/storage/v1/object/{bucket}/{object_path}"

        upload_headers = {
            **_supabase_storage_headers(content_type.split(";")[0].strip()),
            "x-upsert": "true",
        }

        upload_resp = httpx.post(upload_url, headers=upload_headers, content=image_bytes, timeout=30)
        if upload_resp.status_code >= 400:
            print(f"[Backend] Storage upload failed ({kind}): {upload_resp.text}")
            return None

        public_url = f"{config.supabase_url}/storage/v1/object/public/{bucket}/{object_path}"
        print(f"[Backend] Stored Didit {kind} image -> {public_url}")
        return public_url

    except Exception as exc:
        print(f"[Backend] Error storing Didit image ({kind}): {exc}")
        return None


def _persist_didit_images(payload: dict[str, Any], email: str) -> dict[str, str | None]:
    """Extract image URLs from a Didit payload, download them, and store permanently.
    Returns {"idPictureUrl": ..., "selfieUrl": ...} with permanent public URLs.
    """
    raw_urls = _extract_image_urls(payload)
    print(f"[Backend] Extracted Didit image URLs: {json.dumps({k: (v[:80] + '...' if v and len(v) > 80 else v) for k, v in raw_urls.items()})}")

    result: dict[str, str | None] = {"idPictureUrl": None, "selfieUrl": None}

    if raw_urls["documentImageUrl"]:
        result["idPictureUrl"] = _download_and_store_image(
            raw_urls["documentImageUrl"], email, "id-document"
        )

    if raw_urls["selfieImageUrl"]:
        result["selfieUrl"] = _download_and_store_image(
            raw_urls["selfieImageUrl"], email, "selfie"
        )

    return result


def _signature_valid(raw_body: bytes, signature: str | None) -> bool:
    if not config.didit_webhook_secret:
        return True

    if not signature:
        return False

    digest = hmac.new(
        config.didit_webhook_secret.encode("utf-8"),
        raw_body,
        hashlib.sha256,
    ).digest()

    hex_sig = digest.hex()
    b64_sig = base64.b64encode(digest).decode("utf-8")

    raw_sig = signature.strip()
    normalized = raw_sig.lower().removeprefix("sha256=")

    return any(
        hmac.compare_digest(candidate, expected)
        for candidate in {raw_sig, normalized}
        for expected in {hex_sig, b64_sig}
    )


def start_public_didit_registration(email: str, return_url: str | None = None) -> dict[str, Any]:
    attempt_id = str(uuid4())
    callback_url = f"{config.backend_public_base_url}/api/didit/webhook"
    
    if return_url:
        import urllib.parse
        callback_url += f"?returnUrl={urllib.parse.quote(return_url)}"

    didit_session_id = None
    verification_url = config.didit_workflow_url

    if config.didit_api_key and config.didit_workflow_id:
        payload = {
            "workflow_id": config.didit_workflow_id,
            "vendor_data": attempt_id,
            "callback": callback_url,
            "callback_method": "both",
            "language": "en",
            "metadata": {
                "attemptId": attempt_id,
                "email": email,
                "source": "justice-link-public-registration",
            },
        }

        headers = {
            "x-api-key": config.didit_api_key,
            "content-type": "application/json",
        }

        response = httpx.post(config.didit_create_session_url, json=payload, headers=headers, timeout=30)
        if response.status_code >= 400:
            raise RuntimeError(f"Didit create session failed ({response.status_code}): {response.text}")

        session_data = response.json()
        didit_session_id = session_data.get("session_id") or session_data.get("id")
        verification_url = session_data.get("url") or verification_url

    if not verification_url:
        raise RuntimeError("No Didit verification URL available. Set DIDIT_WORKFLOW_URL or API key/workflow ID.")

    attempt_store[attempt_id] = {
        "attemptId": attempt_id,
        "email": email.lower().strip(),
        "status": "pending",
        "verified": False,
        "diditSessionId": didit_session_id,
        "verificationUrl": verification_url,
        "createdAt": _now_iso(),
        "updatedAt": _now_iso(),
    }

    return {
        "attemptId": attempt_id,
        "status": "pending",
        "verified": False,
        "verificationUrl": verification_url,
        "diditSessionId": didit_session_id,
    }


def process_didit_webhook(raw_body: bytes, signature: str | None) -> dict[str, Any]:
    if not _signature_valid(raw_body, signature):
        raise ValueError("Invalid Didit webhook signature")

    payload = json.loads(raw_body.decode("utf-8"))

    vendor_data = _extract_vendor_data(payload)
    session_id = _extract_session_id(payload)

    attempt: dict[str, Any] | None = None

    if vendor_data and vendor_data in attempt_store:
        attempt = attempt_store[vendor_data]
    elif session_id:
        for candidate in attempt_store.values():
            if candidate.get("diditSessionId") == session_id:
                attempt = candidate
                break

    if not attempt:
        return {
            "processed": False,
            "reason": "Attempt not found",
            "sessionId": session_id,
            "vendorData": vendor_data,
        }

    approved = _extract_approval(payload)

    attempt["status"] = "verified" if approved else "failed"
    attempt["verified"] = approved
    attempt["diditSessionId"] = session_id or attempt.get("diditSessionId")
    attempt["diditPayload"] = payload
    attempt["ocrData"] = _extract_ocr_data(payload)
    attempt["updatedAt"] = _now_iso()

    # Download and persist verification images
    if approved and not attempt.get("imageUrls"):
        email = attempt.get("email", "")
        if email:
            attempt["imageUrls"] = _persist_didit_images(payload, email)

    return {
        "processed": True,
        "attemptId": attempt["attemptId"],
        "verified": attempt["verified"],
        "status": attempt["status"],
    }


def _fetch_didit_session_decision(session_id: str) -> dict[str, Any] | None:
    """Actively fetch session decision from Didit's API using the session ID."""
    if not config.didit_api_key or not session_id:
        return None
    try:
        url = f"https://verification.didit.me/v3/session/{session_id}/decision/"
        headers = {"x-api-key": config.didit_api_key}
        response = httpx.get(url, headers=headers, timeout=15)
        print(f"[Backend] Didit decision API response ({response.status_code}) for session {session_id}")
        if response.status_code == 200:
            payload = response.json()
            print(f"[Backend] Didit decision payload keys: {list(payload.keys())}")
            print(f"[Backend] FULL Didit decision payload: {json.dumps(payload, indent=2)}")
            return payload
        else:
            print(f"[Backend] Didit decision API error: {response.text}")
            return None
    except Exception as exc:
        print(f"[Backend] Error fetching Didit session decision: {exc}")
        return None


def get_attempt_status(attempt_id: str) -> dict[str, Any]:
    attempt = attempt_store.get(attempt_id)
    if not attempt:
        raise RuntimeError("Attempt not found")

    session_id = attempt.get("diditSessionId")

    # If webhook hasn't populated the data yet (e.g. localhost dev),
    # actively pull the decision from Didit's API.
    if session_id and (not attempt.get("verified") or not attempt.get("ocrData")):
        print(f"[Backend] Polling Didit API for session {session_id} (attempt {attempt_id})")
        didit_payload = _fetch_didit_session_decision(session_id)
        if didit_payload:
            approved = _extract_approval(didit_payload)
            ocr_data = _extract_ocr_data(didit_payload)

            attempt["diditPayload"] = didit_payload
            attempt["ocrData"] = ocr_data
            if approved:
                attempt["verified"] = True
                attempt["status"] = "verified"
            attempt["updatedAt"] = _now_iso()

            print(f"[Backend] Approved={approved}, OCR extracted: {json.dumps(ocr_data, indent=2)}")

            # Download and persist verification images
            if approved and not attempt.get("imageUrls"):
                email = attempt.get("email", "")
                if email:
                    attempt["imageUrls"] = _persist_didit_images(didit_payload, email)

    return {
        "attemptId": attempt["attemptId"],
        "status": attempt["status"],
        "verified": attempt["verified"],
        "verificationUrl": attempt.get("verificationUrl"),
        "diditSessionId": attempt.get("diditSessionId"),
        "ocrData": attempt.get("ocrData") or {},
        "imageUrls": attempt.get("imageUrls") or {},
        "updatedAt": attempt["updatedAt"],
    }


def finalize_public_registration(
    attempt_id: str,
    email: str,
    password: str,
    phone_number: str | None = None,
    address: dict[str, Any] | None = None,
) -> dict[str, Any]:
    attempt = attempt_store.get(attempt_id)
    if not attempt:
        raise RuntimeError("Verification attempt not found")

    if not attempt.get("verified"):
        raise RuntimeError("Didit verification is not yet complete")

    normalized_email = email.lower().strip()
    if normalized_email != attempt.get("email"):
        raise RuntimeError("Email does not match the verification attempt")

    if len(password) < 8:
        raise RuntimeError("Password must be at least 8 characters")

    attempt["status"] = "finalized"
    attempt["updatedAt"] = _now_iso()
    attempt["phoneNumber"] = phone_number
    attempt["address"] = address or {}

    return {
        "attemptId": attempt_id,
        "status": "finalized",
        "verified": True,
        "nextStep": "email_verification",
    }

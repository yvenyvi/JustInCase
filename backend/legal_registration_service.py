from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Literal
from urllib.parse import unquote, urlparse

import httpx

from config import config

_ALLOWED_KINDS: tuple[str, ...] = ("ibp", "selfie")
_ALLOWED_MIME_TYPES: tuple[str, ...] = (
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
)

_bucket_ensured = False


def _is_supabase_ready() -> bool:
    return bool(config.supabase_url and config.supabase_service_role_key)


def _headers(content_type: str | None = None) -> dict[str, str]:
    headers = {
        "apikey": config.supabase_service_role_key,
        "Authorization": f"Bearer {config.supabase_service_role_key}",
    }
    if content_type:
        headers["Content-Type"] = content_type
    return headers


def _email_key(email: str) -> str:
    key = re.sub(r"[^a-zA-Z0-9]+", "_", email.strip().lower()).strip("_")
    return key or "user"


def _now_stamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S")


def _ensure_bucket_exists() -> None:
    global _bucket_ensured

    if _bucket_ensured:
        return

    bucket = config.legal_verification_bucket
    bucket_url = f"{config.supabase_url}/storage/v1/bucket/{bucket}"

    response = httpx.get(bucket_url, headers=_headers(), timeout=20)
    if response.status_code == 200:
        _bucket_ensured = True
        return

    if response.status_code not in (400, 404):
        raise RuntimeError(f"Unable to verify storage bucket: {response.text}")

    create_response = httpx.post(
        f"{config.supabase_url}/storage/v1/bucket",
        headers={**_headers("application/json")},
        json={
            "id": bucket,
            "name": bucket,
            "public": True,
            "file_size_limit": 5 * 1024 * 1024,
            "allowed_mime_types": list(_ALLOWED_MIME_TYPES),
        },
        timeout=20,
    )

    if create_response.status_code not in (200, 201):
        # Allow idempotent behavior when another request created the bucket first.
        second_check = httpx.get(bucket_url, headers=_headers(), timeout=20)
        if second_check.status_code != 200:
            raise RuntimeError(f"Unable to create storage bucket: {create_response.text}")

    _bucket_ensured = True


def upload_legal_verification_asset(
    *,
    email: str,
    kind: Literal["ibp", "selfie"],
    file_bytes: bytes,
    filename: str,
    content_type: str | None,
) -> str:
    if kind not in _ALLOWED_KINDS:
        raise ValueError("Invalid asset kind. Allowed values: ibp, selfie.")

    if not _is_supabase_ready():
        raise RuntimeError("Supabase is not configured on the backend.")

    if not file_bytes:
        raise ValueError("Uploaded file is empty.")

    mime_type = (content_type or "").lower().strip() or "application/octet-stream"
    if mime_type not in _ALLOWED_MIME_TYPES:
        raise ValueError("Unsupported file type. Please upload JPG, PNG, or WEBP images only.")

    _ensure_bucket_exists()

    extension = (filename.split(".")[-1] if "." in filename else "jpg").lower()
    object_path = f"legal-registration/{_email_key(email)}/{kind}-{_now_stamp()}.{extension}"
    upload_url = f"{config.supabase_url}/storage/v1/object/{config.legal_verification_bucket}/{object_path}"

    upload_headers = {
        **_headers(mime_type),
        "x-upsert": "false",
    }

    response = httpx.post(upload_url, headers=upload_headers, content=file_bytes, timeout=30)
    if response.status_code >= 400:
        raise RuntimeError(f"Storage upload failed: {response.text}")

    return f"{config.supabase_url}/storage/v1/object/public/{config.legal_verification_bucket}/{object_path}"


def remove_own_profile_photo(*, user_id: str, email: str) -> dict[str, bool]:
    """Clear a user's avatar and delete its owned selfie object when recognized."""
    if not _is_supabase_ready():
        raise RuntimeError("Supabase is not configured on the backend.")

    headers = _headers("application/json")
    profile_response = httpx.get(
        f"{config.supabase_url}/rest/v1/users",
        params={"id": f"eq.{user_id}", "select": "profile_photo_url,selfie_url"},
        headers=headers,
        timeout=10,
    )
    profile_response.raise_for_status()
    profiles = profile_response.json()
    if not profiles:
        raise ValueError("Profile not found.")

    profile_photo_url = profiles[0].get("profile_photo_url")
    verification_selfie_url = profiles[0].get("selfie_url")

    # Clear the database reference first. Storage cleanup is best-effort so a
    # bucket issue cannot leave the user's profile pointing at a removed photo.
    update_response = httpx.patch(
        f"{config.supabase_url}/rest/v1/users",
        params={"id": f"eq.{user_id}"},
        headers={**headers, "Prefer": "return=representation"},
        json={"profile_photo_url": None},
        timeout=10,
    )
    update_response.raise_for_status()
    if not update_response.json():
        raise RuntimeError("Unable to update the profile photo.")

    if not profile_photo_url:
        return {"ok": True, "storage_deleted": True}

    storage_deleted = False
    parsed_url = urlparse(profile_photo_url)
    configured_url = urlparse(config.supabase_url)
    decoded_path = unquote(parsed_url.path)
    object_prefixes = (
        f"/storage/v1/object/public/{config.legal_verification_bucket}/",
        f"/storage/v1/object/{config.legal_verification_bucket}/",
    )
    object_path = next(
        (decoded_path[len(prefix):] for prefix in object_prefixes if decoded_path.startswith(prefix)),
        None,
    )
    email_key = _email_key(email)
    owned_selfie_path = bool(
        object_path
        and not any(part in {"", ".", ".."} for part in object_path.split("/"))
        and "\\" not in object_path
        and object_path.rsplit("/", 1)[-1].startswith("selfie-")
        and object_path.startswith((
            f"legal-registration/{email_key}/selfie-",
        ))
        and parsed_url.netloc == configured_url.netloc
        and profile_photo_url != verification_selfie_url
    )

    if owned_selfie_path and object_path:
        try:
            delete_response = httpx.delete(
                f"{config.supabase_url}/storage/v1/object/{config.legal_verification_bucket}/{object_path}",
                headers=_headers(),
                timeout=15,
            )
            storage_deleted = delete_response.status_code in (200, 204, 404)
        except Exception:
            storage_deleted = False

    return {"ok": True, "storage_deleted": storage_deleted}

import os
from dataclasses import dataclass
from pathlib import Path

_dotenv_path = Path(__file__).with_name('.env')
_dotenv_values: dict[str, str] = {}


def _parse_dotenv_file(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values

    for raw_line in path.read_text(encoding='utf-8').splitlines():
        line = raw_line.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue

        key, value = line.split('=', 1)
        key = key.strip()
        value = value.strip()

        if (value.startswith('"') and value.endswith('"')) or (value.startswith("'") and value.endswith("'")):
            value = value[1:-1]

        if key:
            values[key] = value

    return values

try:
    from dotenv import dotenv_values, load_dotenv

    load_dotenv(_dotenv_path)
    _dotenv_values = {k: str(v) for k, v in dotenv_values(_dotenv_path).items() if v is not None}
except Exception:
    # If python-dotenv is not installed, parse .env manually.
    _dotenv_values = _parse_dotenv_file(_dotenv_path)

if not _dotenv_values:
    _dotenv_values = _parse_dotenv_file(_dotenv_path)


def _get_env(name: str, default: str = "") -> str:
    value = os.getenv(name)
    if value is not None and value.strip() != "":
        return value

    fallback = _dotenv_values.get(name)
    if fallback is not None and fallback.strip() != "":
        return fallback

    return default


@dataclass(frozen=True)
class Config:
    port: int
    frontend_origin: str
    backend_public_base_url: str
    supabase_url: str
    supabase_service_role_key: str
    legal_verification_bucket: str
    gemini_api_keys: tuple[str, ...]
    groq_api_keys: tuple[str, ...]
    groq_model: str
    didit_api_key: str
    didit_webhook_secret: str
    didit_workflow_id: str
    didit_workflow_url: str
    didit_create_session_url: str
    didit_signature_header: str


config = Config(
    port=int(_get_env("PORT", "8000")),
    frontend_origin=_get_env("FRONTEND_ORIGIN", "http://localhost:5173"),
    backend_public_base_url=_get_env("BACKEND_PUBLIC_BASE_URL", "http://localhost:8000").rstrip("/"),
    supabase_url=_get_env("SUPABASE_URL", _get_env("VITE_SUPABASE_URL", "")).rstrip("/"),
    supabase_service_role_key=_get_env("SUPABASE_SERVICE_ROLE_KEY", "").strip(),
    legal_verification_bucket=_get_env("LEGAL_VERIFICATION_BUCKET", "verification-documents").strip() or "verification-documents",
    gemini_api_keys=tuple(filter(None, [
        _get_env("GEMINI_API_KEY_1", "").strip(),
        _get_env("GEMINI_API_KEY_2", "").strip(),
    ])),
    groq_api_keys=tuple(filter(None, [
        _get_env("GROQ_API_KEY_1", "").strip(),
        _get_env("GROQ_API_KEY_2", "").strip(),
        _get_env("GROQ_API_KEY_3", "").strip(),
    ])),
    groq_model=_get_env("GROQ_MODEL", "openai/gpt-oss-120b").strip(),
    didit_api_key=_get_env("DIDIT_API_KEY", ""),
    didit_webhook_secret=_get_env("DIDIT_WEBHOOK_SECRET", ""),
    didit_workflow_id=_get_env("DIDIT_WORKFLOW_ID", ""),
    didit_workflow_url=_get_env("DIDIT_WORKFLOW_URL", ""),
    didit_create_session_url=_get_env("DIDIT_CREATE_SESSION_URL", "https://verification.didit.me/v3/session/").rstrip("/"),
    didit_signature_header=_get_env("DIDIT_WEBHOOK_SIGNATURE_HEADER", "x-didit-signature").lower(),
)

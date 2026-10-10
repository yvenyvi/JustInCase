"""Read-only Open Congress proxy for clients that cannot call its API with CORS."""
from __future__ import annotations

import threading
import time
from typing import Any

import httpx

_BASE_URL = "https://open-congress-api.bettergov.ph/api"
_cache: dict[tuple, tuple[float, dict[str, Any]]] = {}
_lock = threading.Lock()


def fetch_congress(path: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
    if path not in {"documents", "stats"}:
        raise ValueError("Unsupported Congress resource.")
    params = params or {}
    key = (path, tuple(sorted(params.items())))
    with _lock:
        cached = _cache.get(key)
        if cached and time.monotonic() - cached[0] < 300:
            return cached[1]
    response = httpx.get(f"{_BASE_URL}/{path}", params=params, timeout=20.0)
    response.raise_for_status()
    payload = response.json()
    if not isinstance(payload, dict) or payload.get("success") is not True:
        raise ValueError("Open Congress returned an invalid response.")
    if path == "documents" and not isinstance(payload.get("data"), list):
        raise ValueError("Open Congress returned an invalid document list.")
    with _lock:
        if len(_cache) >= 128:
            _cache.clear()
        _cache[key] = (time.monotonic(), payload)
    return payload

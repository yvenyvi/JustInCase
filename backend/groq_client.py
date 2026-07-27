"""
Groq API client with automatic key rotation.

Loads all configured GROQ_API_KEY_1 / GROQ_API_KEY_2 / GROQ_API_KEY_3 keys
from the environment and retries on 429 (rate-limit) or 401 (invalid key) errors
by rotating to the next available key.
"""
import logging
from typing import Any

import httpx

from config import config

logger = logging.getLogger(__name__)

GROQ_CHAT_COMPLETIONS_URL = "https://api.groq.com/openai/v1/chat/completions"


def _get_keys() -> list[str]:
    """Return the ordered list of configured Groq API keys."""
    return [k for k in config.groq_api_keys if k]


def call_groq(
    *,
    messages: list[dict[str, str]],
    model: str | None = None,
    temperature: float = 0.3,
    max_tokens: int | None = None,
    timeout: float = 45.0,
) -> str:
    """
    Send a chat completion request to Groq with automatic key rotation.

    Tries each configured API key in order, retrying on 429 (rate-limit) or
    401 (unauthorized).  Raises RuntimeError if all keys are exhausted.

    Returns the text content of the first choice.
    """
    keys = _get_keys()
    if not keys:
        raise RuntimeError("No Groq API keys are configured in backend environment.")

    used_model = model or config.groq_model
    payload: dict[str, Any] = {
        "model": used_model,
        "messages": messages,
        "temperature": temperature,
    }
    if max_tokens is not None:
        payload["max_tokens"] = max_tokens

    last_error: Exception | None = None

    for idx, key in enumerate(keys):
        try:
            headers = {
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json",
            }
            response = httpx.post(
                GROQ_CHAT_COMPLETIONS_URL,
                json=payload,
                headers=headers,
                timeout=timeout,
            )

            if response.status_code in (429, 401):
                logger.warning(
                    "Groq key %d/%d returned %s — rotating to next key.",
                    idx + 1, len(keys), response.status_code,
                )
                last_error = RuntimeError(
                    f"Groq key {idx + 1} failed with status {response.status_code}"
                )
                continue

            if response.status_code >= 400:
                raise RuntimeError(
                    f"Groq API error ({response.status_code}): {response.text}"
                )

            data = response.json()
            choices = data.get("choices") or []
            if not choices:
                raise RuntimeError("Groq API returned no choices.")

            content = (
                (choices[0].get("message") or {}).get("content") or ""
            ).strip()
            if not content:
                raise RuntimeError("Groq API returned an empty response.")

            return content

        except RuntimeError:
            raise
        except Exception as exc:
            logger.warning(
                "Groq key %d/%d raised network error: %s — rotating.",
                idx + 1, len(keys), exc,
            )
            last_error = exc
            continue

    raise RuntimeError(
        f"All {len(keys)} Groq API key(s) failed. Last error: {last_error}"
    )

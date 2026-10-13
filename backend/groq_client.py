"""
Groq API client with automatic key rotation.

Loads all configured GROQ_API_KEY_1 / GROQ_API_KEY_2 / GROQ_API_KEY_3 keys
from the environment and retries on 429 (rate-limit) or 401 (invalid key) errors
by rotating to the next available key.
"""
import json
import logging
from typing import Any

import httpx

from config import config

logger = logging.getLogger(__name__)

GROQ_CHAT_COMPLETIONS_URL = "https://api.groq.com/openai/v1/chat/completions"
TEXT_ONLY_RETRY_INSTRUCTION = (
    "No tools or functions are available in this conversation. "
    "Return a JSON object with exactly one field, response, containing your complete "
    "answer as a string. Inside that string follow all the original answer formatting "
    "instructions, including any required prefix or JSON. "
    "Do not call a tool or function or emit tool-call syntax."
)


def _text_response_format(model: str) -> dict[str, Any]:
    # Strict decoding prevents GPT-OSS from generating a tool-call envelope.
    # Other models retain JSON mode without relying on unsupported strict schemas.
    if model not in {"openai/gpt-oss-20b", "openai/gpt-oss-120b", "qwen/qwen3.8-27b"}:
        return {"type": "json_object"}
    return {
        "type": "json_schema",
        "json_schema": {
            "name": "assistant_text_response",
            "strict": True,
            "schema": {
                "type": "object",
                "properties": {"response": {"type": "string"}},
                "required": ["response"],
                "additionalProperties": False,
            },
        },
    }


def _is_unexpected_tool_call(response: httpx.Response) -> bool:
    """Recognize Groq's rejection of a tool call on a text-only request."""
    if response.status_code != 400:
        return False
    try:
        error = response.json().get("error", {})
        return (
            error.get("code") == "tool_use_failed"
            and "tool choice is none" in error.get("message", "").lower()
        )
    except (ValueError, AttributeError, TypeError):
        return False


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
    response_format: dict[str, Any] | None = None,
) -> str:
    """
    Send a chat completion request to Groq with automatic key rotation.

    Tries each configured API key in order, retrying on 429 (rate-limit) or
    401 (unauthorized). Retries an unexpected tool call once with explicit
    text-only instructions. Raises RuntimeError if all keys are exhausted.

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
    if response_format is not None:
        payload["response_format"] = response_format

    last_error: Exception | None = None
    tool_call_retried = False

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

            # GPT-OSS can emit a tool call even when no tools were supplied.
            # Retry once across all keys, without replaying failed_generation
            # (which is untrusted model output and may contain personal data).
            if not tool_call_retried and _is_unexpected_tool_call(response):
                tool_call_retried = True
                logger.warning("Groq emitted an unexpected tool call; retrying as text only.")
                payload = {
                    **payload,
                    **({"tool_choice": "none"} if response_format is None else {}),
                    "temperature": 0,
                    "response_format": response_format or _text_response_format(used_model),
                    "messages": [
                        {"role": "system", "content": (
                            "No tools or functions are available. Return only the JSON object matching the supplied response schema."
                            if response_format is not None else TEXT_ONLY_RETRY_INSTRUCTION
                        )},
                        *messages,
                    ],
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

            if tool_call_retried and response_format is None:
                try:
                    content = json.loads(content).get("response")
                except (ValueError, AttributeError, TypeError):
                    raise RuntimeError("Groq returned an invalid text-recovery response.") from None
                if not isinstance(content, str) or not content.strip():
                    raise RuntimeError("Groq returned an empty text-recovery response.")
                content = content.strip()

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

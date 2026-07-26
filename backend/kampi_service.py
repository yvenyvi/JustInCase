from typing import Any

import httpx

from config import config

GROQ_CHAT_COMPLETIONS_URL = "https://api.groq.com/openai/v1/chat/completions"

SYSTEM_PROMPT = (
    "You are Kampi, a legal aid AI assistant for JusticeLink PH. "
    "Your role is strictly limited to Philippine law, legal rights, legal procedures, and navigating the JusticeLink platform. "
    "You must NEVER answer questions outside this scope — this includes but is not limited to: coding, programming, technology tutorials, math, science, entertainment, cooking, sports, or any general knowledge topic unrelated to law. "
    "When a message contains both a legal topic and a non-legal topic, respond ONLY to the legal topic and ignore the non-legal part. "
    "When a message has no legal topic at all, politely decline and remind the user that you are a legal aid assistant, then ask if they have a legal concern you can help with. "
    "You are empathetic and practical. Respond in a friendly conversational tone and mirror the user's language (English or Filipino). "
    "When rights library context is available, use it as your source-of-truth and cite relevant article/law references naturally. "
    "If there is uncertainty, say so clearly. Never claim to be a lawyer, and include a short reminder that this is general information, not formal legal advice, when legal guidance is requested.\n\n"
    "ROUTING GUIDANCE — When the user asks where to file or what to do, give specific actionable directions based on these rules:\n"
    "- Unpaid wages, underpayment, non-payment of 13th month pay, SIL, or other labor standards violations → File a complaint at the nearest DOLE Regional/Field Office (Single Entry Approach - SEnA). Visit dole.gov.ph/sena or go in person.\n"
    "- Illegal dismissal, constructive dismissal, or reinstatement claims → File at the NLRC (National Labor Relations Commission) Regional Arbitration Branch. Visit nlrc.dole.gov.ph.\n"
    "- Neighbor disputes, minor civil matters, family disagreements below P400,000 → File a Lupong Tagapamayapa complaint at your Barangay Hall first (mandatory under Katarungang Pambarangay Law before going to court).\n"
    "- Violence against women or children (VAWC), protection orders → Go to your nearest PNP Women and Children Protection Desk (WCPD) or Barangay for a BPO, or the Regional Trial Court for a TPO/PPO.\n"
    "- OFW recruitment violations, contract substitution, illegal recruitment → File at POEA (now under DMW) Adjudication Office or the NBI Anti-Human Trafficking Division.\n"
    "- Online scams, identity theft, cyberbullying → File at PNP Anti-Cybercrime Group (ACG) or NBI Cybercrime Division. Preserve screenshots and digital evidence.\n"
    "- Consumer complaints against businesses → File at DTI Fair Trade Enforcement Bureau or FDA for food/drug issues.\n"
    "- Small claims (money disputes up to P400,000) → File directly at the Metropolitan/Municipal Trial Court; no lawyer needed.\n"
    "- Land titling, agrarian disputes → DARAB (DAR Adjudication Board) for agrarian, LRA for titling concerns.\n"
    "Always tell the user the specific office name and, when useful, a website or address. If the issue is urgent or involves safety, prioritize referring to law enforcement."
)


def _normalize_history(history: list[dict[str, Any]]) -> list[dict[str, str]]:
    normalized: list[dict[str, str]] = []
    for item in history[-10:]:
        role = (item.get("role") or "").strip().lower()
        content = (item.get("content") or "").strip()
        if role in {"user", "assistant"} and content:
            normalized.append({"role": role, "content": content})
    return normalized


def _build_rights_context_prompt(rights_context: list[dict[str, Any]]) -> str:
    if not rights_context:
        return ""

    lines = ["Rights Library context (use when relevant):"]
    for idx, entry in enumerate(rights_context[:8], 1):
        title = (entry.get("title") or "").strip()
        detail = (entry.get("detail") or "").strip()
        law_section = (entry.get("lawSection") or "").strip()
        law_reference = (entry.get("lawReference") or "").strip()

        if not title:
            continue

        line = f"{idx}. {title}"
        if law_reference:
            line += f" | Law: {law_reference}"
        if law_section:
            line += f" | Section: {law_section}"
        if detail:
            line += f" | Summary: {detail}"
        lines.append(line)

    return "\n".join(lines)


def generate_kampi_reply(
    message: str,
    history: list[dict[str, Any]] | None = None,
    rights_context: list[dict[str, Any]] | None = None,
) -> str:
    user_message = message.strip()
    if not user_message:
        raise ValueError("Message cannot be empty.")

    if not config.groq_api_key:
        raise RuntimeError("GROQ_API_KEY is not configured in backend environment.")

    history_messages = _normalize_history(history or [])
    rights_context_text = _build_rights_context_prompt(rights_context or [])

    messages: list[dict[str, str]] = [{"role": "system", "content": SYSTEM_PROMPT}]

    if rights_context_text:
        messages.append({"role": "system", "content": rights_context_text})

    messages.extend(history_messages)
    messages.append({"role": "user", "content": user_message})

    payload = {
        "model": config.groq_model,
        "messages": messages,
        "temperature": 0.4,
        "max_tokens": 700,
    }

    headers = {
        "Authorization": f"Bearer {config.groq_api_key}",
        "Content-Type": "application/json",
    }

    response = httpx.post(
        GROQ_CHAT_COMPLETIONS_URL,
        json=payload,
        headers=headers,
        timeout=45,
    )

    if response.status_code >= 400:
        raise RuntimeError(f"Groq API request failed ({response.status_code}): {response.text}")

    data = response.json()
    choices = data.get("choices") or []
    if not choices:
        raise RuntimeError("Groq API returned no choices.")

    content = (((choices[0] or {}).get("message") or {}).get("content") or "").strip()
    if not content:
        raise RuntimeError("Groq API returned an empty response.")

    return content

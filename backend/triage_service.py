import json
import logging
from typing import Any
import httpx

from config import config

logger = logging.getLogger(__name__)

GROQ_CHAT_COMPLETIONS_URL = "https://api.groq.com/openai/v1/chat/completions"


def analyze_triage_case(
    description: str,
    opposing_party_type: str = "",
    urgency: str = "",
    province: str = "",
    income: str = "",
    deadline_str: str = "None",
    evidence: str = "",
    outcome: str = "",
    available_lawyers: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    if not config.groq_api_key:
        raise RuntimeError("GROQ_API_KEY is not configured in backend environment.")

    lawyers_list = available_lawyers or []
    lawyers_formatted = []
    for l in lawyers_list:
        l_id = str(l.get("id", ""))
        first = l.get("first_name", "") or ""
        last = l.get("last_name", "") or ""
        firm = l.get("firm_name", "") or "None"
        city = l.get("city_municipality", "") or "Unknown"
        lawyers_formatted.append(f"ID: {l_id}, Name: {first} {last}".strip() + f", Firm: {firm}, Location: {city}")

    lawyers_string = "\n".join(lawyers_formatted) if lawyers_formatted else "None available"

    prompt = f"""Analyze this legal case intake in the Philippines.
Concern: {description}
Opposing Party: {opposing_party_type}
Urgency: {urgency}
Location: {province}
Income: {income}
Deadline: {deadline_str}
Evidence: {evidence}
Desired Outcome: {outcome}

Available Lawyers:
{lawyers_string}

Provide a qualitative assessment for an attorney. Return ONLY a valid JSON object with the following keys, and nothing else (no markdown blocks, just the JSON string):
{{
  "category_of_law": "The most appropriate legal category (e.g., Labor Law, Family Law, Criminal Defense, Civil Law, Property Law)",
  "primary_issue": "A concise 1-2 sentence summary of the legal issue",
  "ai_assessment": "The AI's qualitative thoughts on the case's legal viability, strength, and strategy",
  "missing_details": "What crucial information the client failed to provide that the attorney should ask for",
  "recommended_lawyer_id": "The EXACT ID string of the most suitable lawyer from the Available Lawyers list (e.g. '123e4567-e89b-12d3-a456-426614174000'). If no good match, return null.",
  "recommendation_reason": "A 1-sentence explanation to the client why this lawyer is the best fit (e.g. 'Atty. Santos is located near you and has a firm that can handle this.'). If no match, leave empty."
}}"""

    payload = {
        "model": "llama-3.1-8b-instant",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.2,
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
        logger.error("Groq API error in triage service (%s): %s", response.status_code, response.text)
        raise RuntimeError(f"Groq API error: {response.status_code}")

    res_json = response.json()
    raw_content = res_json.get("choices", [{}])[0].get("message", {}).get("content", "").strip()

    # Clean markdown backticks if present
    if raw_content.startswith("```"):
        raw_content = raw_content.lstrip("`").strip()
        if raw_content.lower().startswith("json"):
            raw_content = raw_content[4:].strip()
        if raw_content.endswith("```"):
            raw_content = raw_content[:-3].strip()

    try:
        parsed = json.loads(raw_content)
        return parsed
    except json.JSONDecodeError as exc:
        logger.error("Failed to parse Groq response JSON: %s", raw_content)
        raise RuntimeError("Invalid JSON response from Groq AI.") from exc

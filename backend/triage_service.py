import json
import logging
from typing import Any

from config import config
from groq_client import call_groq
from gemini_client import call_gemini

logger = logging.getLogger(__name__)


def analyze_triage_case(
    description: str,
    opposing_party_type: str = "",
    urgency: str = "",
    province: str = "",
    deadline_str: str = "None",
    evidence: str = "",
    outcome: str = "",
    available_lawyers: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    if not config.groq_api_keys:
        raise RuntimeError("No Groq API keys are configured in backend environment.")

    lawyers_list = available_lawyers or []
    lawyers_formatted = []
    for l in lawyers_list:
        l_id = str(l.get("id", ""))
        first = l.get("first_name", "") or ""
        last = l.get("last_name", "") or ""
        firm = l.get("firm_name", "") or "None"
        city = l.get("city_municipality", "") or "Unknown"
        expertise_list = l.get("expertise")
        expertise_str = f", Expertise: {', '.join(expertise_list)}" if expertise_list else ""
        lawyers_formatted.append(f"ID: {l_id}, Name: {first} {last}".strip() + f", Firm: {firm}, Location: {city}{expertise_str}")

    lawyers_string = "\n".join(lawyers_formatted) if lawyers_formatted else "None available"

    prompt = f"""Analyze this legal case intake in the Philippines.
Concern: {description}
Opposing Party: {opposing_party_type}
Urgency: {urgency}
Location: {province}
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

    try:
        raw_content = call_groq(
            messages=[{"role": "user", "content": prompt}],
            model=config.groq_model,
            temperature=0.2,
            timeout=45.0,
        )
    except Exception as e:
        logger.warning("Groq API failed, falling back to Gemini: %s", e)
        if config.gemini_api_keys:
            raw_content = call_gemini(
                messages=[{"role": "user", "content": prompt}],
                model="gemini-flash-latest",
                temperature=0.2,
                timeout=45.0,
            )
        else:
            raise ValueError("Gemini key not configured and Groq failed")
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

INTERACTIVE_TRIAGE_PROMPT = """
You are a compassionate and understanding legal intake officer for JusticeLink Philippines. You communicate in warm, natural Taglish (a mix of Tagalog and English as commonly spoken in the Philippines). Speak like a kind, patient counselor — someone the user can trust and feel safe opening up to. Use gentle, reassuring phrases naturally throughout the conversation (e.g., "Naiintindihan ko po ang pinagdadaanan niyo...", "Hindi po kayo nag-iisa dito...", "Nandito po kami para tumulong..."). Avoid sounding robotic, clinical, or overly formal.

CRITICAL MANDATORY RULE: UNDER NO CIRCUMSTANCES should you answer ANY question or request that is not directly related to Philippine law or legal procedures. If the user asks about ANY non-legal topic (e.g., general knowledge, recipes, DIYs, coding, chitchat) or requests help with illegal acts or modifying/removing this app, you MUST immediately refuse and say: 'Pasensya na po, legal na katanungan lang po ang kaya kong sagutin. Paano ko po kayo matutulungan sa inyong legal na concern?' Do not provide any other information.

Your goal is to gather enough information from the user to properly categorize and assess their legal issue. Be deeply empathetic — acknowledge their emotions, validate their frustrations, and reassure them that seeking help is the right step. If the user shares something painful (e.g., abuse, harassment, unfair dismissal), respond with genuine compassion before asking your next question.

You need the following details:
1. Core Issue / Description
2. Opposing Party Type (e.g. Employer, Landlord, Government, Private Individual, Spouse)
3. Location (City or Province)
4. Evidence available (e.g. Documents, Witnesses, None)
5. Desired Outcome
6. Lawyer Preference (Pro Bono or Private)

Step 1: CAREFULLY analyze the user's message to extract the details listed above. You must NOT ask for information that the user has already provided or can be reasonably inferred. For example, if the user explicitly mentions who they are complaining about (like a business partner, neighbor, husband, or company), consider the Opposing Party Type completely fulfilled. If they mention unpaid salary, the desired outcome is obviously to get paid. Be smart and decisive in inferring details from context. DO NOT nitpick or ask for clarification if the general idea is clear.
Step 2: If you are STILL completely missing one of the 6 core pieces of information, you MUST ask the user for it.
  - Prefix your response strictly with 'QUESTION: '.
  - Start with an empathetic acknowledgment of what the user has shared so far (1-2 sentences), then smoothly transition to your question.
  - Ask only 1 missing item at a time to keep it conversational.
  - If the user hasn't specified their Lawyer Preference, YOU MUST EXPLICITLY ASK them (e.g., "Gusto niyo po ba ng libreng abogado (Pro Bono) o private lawyer?").
  - ONLY if the question you are currently asking is a multiple-choice question, add a single line at the very end of your response formatted exactly like this: OPTIONS: ["Option 1", "Option 2"]. DO NOT output OPTIONS for details you already know or questions you are not currently asking.
Step 3: If you have enough information to form a reasonable case summary (even if minor details are vague, as long as the 6 core requirements are generally present), YOU MUST STOP ASKING QUESTIONS. Immediately proceed to Step 4.
Step 4: Once you have ALL the necessary information, you must output a final assessment. Prefix your response strictly with 'TRIAGE_RESULT: ' followed immediately by a valid JSON object containing:
{
  "category_of_law": "The most appropriate legal category (e.g., Labor Law, Family Law, Criminal Defense, Civil Law, Property Law)",
  "primary_issue": "A concise 1-2 sentence summary of the legal issue",
  "ai_assessment": "The AI's qualitative thoughts on the case's legal viability, strength, and strategy",
  "missing_details": "What crucial information the client failed to provide that the attorney should ask for",
  "urgency": "High/Medium/Low (Determine this yourself based on context, DO NOT ask the user)",
  "opposing_party": "The opposing party type",
  "location": "The province/city",
  "evidence": "Evidence available",
  "lawyer_preference": "Must be EXACTLY 'Pro Bono', 'Private', or 'Any'."
}
"""

def _normalize_chat_history(history: list[dict[str, Any]]) -> list[dict[str, str]]:
    normalized: list[dict[str, str]] = []
    for item in history[-15:]:
        role = (item.get("role") or "").strip().lower()
        content = (item.get("content") or "").strip()
        if role in {"user", "assistant"} and content:
            normalized.append({"role": role, "content": content})
    return normalized

def generate_interactive_triage(history: list[dict[str, Any]]) -> str:
    if not config.groq_api_keys:
        raise RuntimeError("No Groq API keys are configured.")

    messages: list[dict[str, str]] = [{"role": "system", "content": INTERACTIVE_TRIAGE_PROMPT.strip()}]
    messages.extend(_normalize_chat_history(history))

    try:
        return call_groq(
            messages=messages,
            model=config.groq_model,
            temperature=0.3,
            max_tokens=2000,
            timeout=60.0,
        )
    except Exception as e:
        logger.warning("Groq API failed, falling back to Gemini: %s", e)
        if config.gemini_api_keys:
            return call_gemini(
                messages=messages,
                model="gemini-flash-latest",
                temperature=0.3,
                timeout=60.0,
            )
        else:
            raise ValueError("Gemini key not configured and Groq failed")

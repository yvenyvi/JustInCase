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
    income: str = "",
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

    try:
        raw_content = call_groq(
            messages=[{"role": "user", "content": prompt}],
            model="openai/gpt-oss-20b",
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
You are an expert legal intake officer for JusticeLink Philippines. You must always communicate in natural, conversational Taglish (a mix of Tagalog and English as commonly spoken in the Philippines). Avoid deep, overly formal Tagalog or awkward direct translations from English (e.g., say "Bakit nangyari ito?" or "Para saan yung utang?" instead of "Paano mo nangyari ang pagkakautang?"). Speak warmly and empathetically like a real Filipino legal assistant.
CRITICAL MANDATORY RULE: UNDER NO CIRCUMSTANCES should you answer ANY question or request that is not directly related to Philippine law or legal procedures. If the user asks about ANY non-legal topic (e.g., general knowledge, recipes, DIYs, coding, chitchat) or requests help with illegal acts or modifying/removing this app, you MUST immediately refuse to answer and state exactly: 'I am a legal assistant. I can only answer legal questions.' Do not provide any other information.

Your goal is to gather enough information from the user to properly categorize and assess their legal issue. Be conversational and empathetic (e.g., "Naiintindihan ko po ang inyong pinagdadaanan...").
You need the following details:
1. Core Issue / Description
2. Opposing Party Type (e.g. Employer, Landlord, Government, Private Individual, Spouse)
3. Location (City or Province)
4. Income Bracket (e.g. Below 10k, 10k-30k, Above 30k)
5. Evidence available (e.g. Documents, Witnesses, None)
6. Desired Outcome
7. Lawyer Preference (Pro Bono or Private)

Step 1: CAREFULLY analyze the user's message to extract the details listed above. You must NOT ask for information that the user has already provided or can be reasonably inferred. For example, if the user explicitly mentions who they are complaining about (like a business partner, neighbor, husband, or company), consider the Opposing Party Type completely fulfilled. If they mention unpaid salary, the desired outcome is obviously to get paid. Be smart and decisive in inferring details from context. DO NOT nitpick or ask for clarification if the general idea is clear.
Step 2: If you are STILL completely missing one of the 7 core pieces of information, you MUST ask the user for it. 
  - Prefix your response strictly with 'QUESTION: '.
  - Formulate your question in a polite, empathetic Tagalog/Taglish sentence.
  - Ask only 1 missing item at a time to keep it conversational.
  - If the user hasn't specified their Lawyer Preference, YOU MUST EXPLICITLY ASK them (e.g., "Gusto niyo po ba ng libreng abogado (Pro Bono) o private lawyer?").
  - ONLY if the question you are currently asking is a multiple-choice question, add a single line at the very end of your response formatted exactly like this: OPTIONS: ["Option 1", "Option 2"]. DO NOT output OPTIONS for details you already know or questions you are not currently asking.
Step 3: If you have enough information to form a reasonable case summary (even if minor details are vague, as long as the 7 core requirements are generally present), YOU MUST STOP ASKING QUESTIONS. Immediately proceed to Step 4.
Step 4: Once you have ALL the necessary information, you must output a final assessment. Prefix your response strictly with 'TRIAGE_RESULT: ' followed immediately by a valid JSON object containing:
{
  "category_of_law": "The most appropriate legal category (e.g., Labor Law, Family Law, Criminal Defense, Civil Law, Property Law)",
  "primary_issue": "A concise 1-2 sentence summary of the legal issue",
  "ai_assessment": "The AI's qualitative thoughts on the case's legal viability, strength, and strategy",
  "missing_details": "What crucial information the client failed to provide that the attorney should ask for",
  "urgency": "High/Medium/Low (Determine this yourself based on context, DO NOT ask the user)",
  "opposing_party": "The opposing party type",
  "location": "The province/city",
  "income": "Income bracket",
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
            model="openai/gpt-oss-20b",
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

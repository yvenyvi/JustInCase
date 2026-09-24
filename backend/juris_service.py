"""Privacy-preserving client for the public Juris.ph legal research API."""
from __future__ import annotations

import json
import re
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from typing import Any

import httpx

from config import config
from groq_client import call_groq

JURIS_SEARCH_URL = "https://juris.ph/api/v1/search"
VALID_DATASETS = {"jurisprudence", "republic-acts"}
_cache: dict[tuple[str, str, int | None, int], tuple[float, list[dict[str, Any]]]] = {}
_cache_lock = threading.Lock()
_CACHE_TTL_SECONDS = 900

_CASE_RESEARCH_FIELDS = (
    "category_of_law",
    "case_subcategory",
    "primary_issue",
    "case_summary",
    "summary",
    "ai_assessment",
    "desired_outcome",
)


def redact_personal_information(value: str) -> str:
    """Best-effort local guard applied before text can become a Juris URL."""
    text = value or ""
    text = re.sub(r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}", " ", text)
    text = re.sub(r"(?:\+?63|0)\s*9\d{2}[\s-]?\d{3}[\s-]?\d{4}", " ", text)
    text = re.sub(r"\b\d{1,5}\s+[A-Za-z0-9 .'-]+(?:street|st\.?|road|rd\.?|avenue|ave\.?|barangay|brgy\.?)\b[^,.;]*", " ", text, flags=re.I)
    text = re.sub(r"\b(?:Mr|Mrs|Ms|Atty|Attorney|Dr)\.?\s+[A-Z][A-Za-z'-]+(?:\s+[A-Z][A-Za-z'-]+){0,2}", " ", text)
    text = re.sub(r"(?im)^\s*(?:name|party|complainant|respondent|client|address|email|phone|contact|document(?: contents?)?)\s*:\s*.*$", " ", text)
    text = re.sub(r"\b[A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,}){1,3}\b", " ", text)
    text = re.sub(r"\b(?:PHP|₱)\s*[\d,]+(?:\.\d{2})?\b", " ", text, flags=re.I)
    text = re.sub(r"\s+", " ", text).strip()
    return text[:500]


def extract_researchable_case_text(value: str) -> str:
    """Remove stored provenance and other non-issue metadata from case JSON."""
    text = value or ""
    try:
        payload = json.loads(text)
    except (TypeError, json.JSONDecodeError):
        return text
    if not isinstance(payload, dict):
        return text
    relevant = [str(payload.get(field) or "").strip() for field in _CASE_RESEARCH_FIELDS]
    return "\n".join(item for item in relevant if item) or text


def fallback_research_query(value: str, purpose: str) -> str:
    """Return an issue-only query without forwarding user-authored text."""
    lowered = value.lower()
    topic_rules = (
        (("animal abuse", "animal welfare", "veterinary"), "animal welfare cruelty civil liability damages"),
        (("dismiss", "unpaid wage", "salary", "overtime", "employment", "labor"), "labor law illegal dismissal unpaid wages employee remedies"),
        (("custody", "annulment", "child support", "family law"), "family law custody support separation remedies"),
        (("violence against women", "vawc", "domestic violence"), "violence against women and children protection remedies"),
        (("fraud", "theft", "assault", "criminal"), "criminal law liability complaint and victim remedies"),
        (("land", "property", "tenant", "lease"), "property law ownership lease and possession remedies"),
        (("contract", "breach", "debt", "loan"), "contract breach obligations and damages remedies"),
    )
    for keywords, topic in topic_rules:
        if any(keyword in lowered for keyword in keywords):
            return f"Philippine {topic}"[:500]
    return f"Philippine law {purpose}"[:500]


def plan_research_query(text: str, purpose: str = "legal research") -> str:
    """Create a short issue-only query. Raw text goes only to the configured LLM, never Juris."""
    # Privacy takes precedence over relevance if the planner is unavailable:
    # never forward a partially-redacted case narrative to an external API.
    researchable_text = extract_researchable_case_text(text)
    fallback = fallback_research_query(researchable_text, purpose)
    if not researchable_text.strip():
        return fallback
    try:
        raw = call_groq(
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Convert the input into one short Philippine legal research query. "
                        "Remove all names, parties, addresses, contact details, dates tied to a person, "
                        "amounts that could identify a dispute, and quoted document text. Keep only the "
                        "generic legal issue, doctrine, statute, or remedy. Return JSON only: "
                        '{"query":"..."}.'
                    ),
                },
                {"role": "user", "content": f"Purpose: {purpose}\nInput: {researchable_text[:6000]}"},
            ],
            model=config.groq_model,
            temperature=0.0,
            max_tokens=120,
            timeout=20.0,
        )
        raw = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        query = redact_personal_information(str(json.loads(raw).get("query") or ""))
        return query or fallback
    except Exception:
        return fallback


def _normalize_item(dataset: str, item: dict[str, Any]) -> dict[str, Any]:
    if dataset == "jurisprudence":
        title = item.get("case_title") or item.get("case_number") or "Supreme Court decision"
        citation = item.get("case_number")
        date = item.get("decision_date")
        summary = item.get("facts") or item.get("disposition")
    else:
        title = item.get("title") or item.get("ra_number") or "Republic Act"
        citation = item.get("ra_number")
        date = None
        summary = item.get("summary")
    score = item.get("score")
    return {
        "dataset": dataset,
        "id": str(item.get("id") or ""),
        "title": title,
        "citation": citation,
        "date": date,
        "year": item.get("year"),
        "summary": summary,
        "score": float(score) if isinstance(score, (int, float)) else None,
        "url": item.get("url"),
        "source_url": item.get("source_url"),
        "pdf_url": item.get("pdf_url"),
    }


def search_dataset(query: str, dataset: str, year: int | None = None, limit: int = 5) -> list[dict[str, Any]]:
    if dataset not in VALID_DATASETS:
        raise ValueError("Unsupported Juris dataset.")
    safe_query = redact_personal_information(query)
    if len(safe_query) < 2:
        return []
    safe_limit = max(1, min(limit, 10))
    key = (dataset, safe_query.lower(), year, safe_limit)
    now = time.monotonic()
    with _cache_lock:
        cached = _cache.get(key)
        if cached and now - cached[0] < _CACHE_TTL_SECONDS:
            return cached[1]

    params: dict[str, Any] = {"dataset": dataset, "q": safe_query, "limit": safe_limit}
    if year is not None:
        params["year"] = year
    last_error: Exception | None = None
    for attempt in range(2):
        try:
            response = httpx.get(JURIS_SEARCH_URL, params=params, timeout=15.0)
            if response.status_code == 503 and attempt == 0:
                continue
            response.raise_for_status()
            payload = response.json()
            raw_items = payload.get("items", []) if isinstance(payload, dict) else []
            if not isinstance(raw_items, list):
                raw_items = []
            items = [_normalize_item(dataset, item) for item in raw_items if isinstance(item, dict)]
            items = [item for item in items if item["id"] and item["url"] and (item["score"] is None or item["score"] >= 0.2)]
            with _cache_lock:
                _cache[key] = (now, items)
            return items
        except Exception as exc:
            last_error = exc
    raise RuntimeError("Juris legal research is temporarily unavailable.") from last_error


def search_legal_sources(query: str, datasets: list[str] | None = None, year: int | None = None, limit: int = 5) -> dict[str, Any]:
    selected = [item for item in (datasets or ["jurisprudence", "republic-acts"]) if item in VALID_DATASETS]
    safe_query = plan_research_query(query)
    results: dict[str, list[dict[str, Any]]] = {"jurisprudence": [], "republic_acts": []}
    unavailable: list[str] = []

    def run(dataset: str) -> tuple[str, list[dict[str, Any]] | None]:
        try:
            return dataset, search_dataset(safe_query, dataset, year, limit)
        except RuntimeError:
            return dataset, None

    with ThreadPoolExecutor(max_workers=2) as executor:
        for dataset, items in executor.map(run, selected):
            key = "republic_acts" if dataset == "republic-acts" else dataset
            if items is None:
                unavailable.append(dataset)
            else:
                results[key] = items
    return {**results, "sources": results["jurisprudence"] + results["republic_acts"], "unavailable": unavailable, "query": safe_query}


def sources_prompt(sources: list[dict[str, Any]]) -> str:
    if not sources:
        return "No external Juris sources were available. Do not invent legal citations."
    lines = ["Juris research aids (verify against source_url; never quote summaries as court language):"]
    for index, source in enumerate(sources[:8], 1):
        lines.append(
            f"{index}. {source.get('citation') or source.get('title')} | {source.get('title')} | "
            f"Summary: {source.get('summary') or 'Not provided'} | Authoritative source: {source.get('source_url') or source.get('url')}"
        )
    return "\n".join(lines)

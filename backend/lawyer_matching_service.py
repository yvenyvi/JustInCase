"""Deterministic attorney matching for reviewed triage profiles."""

from __future__ import annotations

import re
from typing import Any


ACTIVE_CASE_STATUSES = {
    "Pending Triage",
    "Pending Acceptance",
    "In Progress",
    "Hearing Scheduled",
    "Demand Sent",
}

AREA_KEYWORDS = {
    "labor": {"labor", "employment", "employee", "employer", "salary", "wage", "dismissal", "workplace"},
    "family": {"family", "marriage", "annulment", "custody", "support", "spouse", "vawc", "domestic"},
    "criminal": {"criminal", "crime", "arrest", "accused", "estafa", "theft", "assault", "defense"},
    "property": {"property", "land", "housing", "eviction", "tenant", "landlord", "boundary", "title"},
    "civil": {"civil", "debt", "contract", "damages", "small", "claims", "negligence"},
    "corporate": {"corporate", "commercial", "business", "company", "securities"},
    "tax": {"tax", "taxation", "bir"},
    "human rights": {"human", "rights", "public", "interest", "discrimination"},
    "intellectual property": {"intellectual", "copyright", "trademark", "patent"},
    "environmental": {"environmental", "environment", "pollution"},
    "international": {"international", "immigration", "cross-border"},
}


def _normalized(value: Any) -> str:
    if not isinstance(value, str):
        return ""
    return re.sub(r"[^a-z0-9]+", " ", value.lower()).strip()


def _tokens(value: Any) -> set[str]:
    return {token for token in _normalized(value).split() if len(token) > 2}


def _areas(value: Any) -> set[str]:
    tokens = _tokens(value)
    return {area for area, keywords in AREA_KEYWORDS.items() if tokens & keywords}


def _expertise_score(profile: dict[str, Any], expertise: list[str]) -> tuple[float, list[str]]:
    case_text = " ".join(
        str(profile.get(key) or "")
        for key in ("category_of_law", "case_subcategory", "primary_issue", "case_summary")
    )
    case_areas = _areas(case_text)
    expertise_areas = set().union(*(_areas(item) for item in expertise)) if expertise else set()
    shared_areas = case_areas & expertise_areas
    if shared_areas:
        label = ", ".join(sorted(area.title() for area in shared_areas))
        return 40.0, [f"Specialization matches {label}"]

    case_tokens = _tokens(case_text)
    expertise_tokens = set().union(*(_tokens(item) for item in expertise)) if expertise else set()
    overlap = case_tokens & expertise_tokens
    if overlap:
        return min(30.0, 10.0 + 5.0 * len(overlap)), ["Related legal experience"]
    return 0.0, []


def _location_score(profile: dict[str, Any], lawyer: dict[str, Any]) -> tuple[float, list[str]]:
    requested = _normalized(profile.get("location"))
    city = _normalized(lawyer.get("city_municipality"))
    province = _normalized(lawyer.get("province"))
    if not requested:
        return 5.0, []
    if city and (city in requested or requested in city):
        return 15.0, ["Located in the same city or municipality"]
    if province and (province in requested or requested in province):
        return 12.0, ["Located in the same province"]
    if set(requested.split()) & set((city + " " + province).split()):
        return 8.0, ["Location is near the stated area"]
    return 0.0, []


def _rating_score(rating: Any, review_count: int) -> tuple[float, list[str]]:
    if not isinstance(rating, (int, float)) or review_count <= 0:
        return 5.0, ["New attorney profile"]
    score = max(0.0, min(10.0, float(rating) * 2.0))
    return score, [f"{float(rating):.1f} rating from {review_count} review{'s' if review_count != 1 else ''}"]


def rank_lawyers(profile: dict[str, Any], lawyers: list[dict[str, Any]], limit: int = 3) -> list[dict[str, Any]]:
    """Rank eligible attorneys with an explainable 100-point score."""
    preference = str(profile.get("lawyer_preference") or "Any")
    urgency = str(profile.get("urgency") or "Medium")
    ranked: list[dict[str, Any]] = []

    for lawyer in lawyers:
        pro_bono_hours = float(lawyer.get("verified_pro_bono_hours") or 0)
        if preference == "Pro Bono" and pro_bono_hours >= 60:
            continue

        cases = lawyer.get("cases") or []
        active_count = sum(1 for case in cases if case.get("status") in ACTIVE_CASE_STATUSES)
        rating = lawyer.get("rating")
        review_count = int(lawyer.get("review_count") or 0)

        expertise_score, reasons = _expertise_score(profile, lawyer.get("expertise") or [])
        preference_score = 20.0
        if preference == "Pro Bono":
            preference_reason = "Available for Pro Bono service"
        elif preference == "Private":
            preference_reason = "Available for private engagement"
        else:
            preference_reason = "Compatible with either service preference"
        reasons.append(preference_reason)

        location_score, location_reasons = _location_score(profile, lawyer)
        reasons.extend(location_reasons)

        capacity_score = max(0.0, 10.0 - active_count * 2.5)
        if active_count <= 1:
            reasons.append("Currently has low active caseload")

        rating_score, rating_reasons = _rating_score(rating, review_count)
        reasons.extend(rating_reasons)

        if urgency == "High":
            urgency_score = 5.0 if active_count <= 1 else (2.5 if active_count <= 3 else 0.0)
        else:
            urgency_score = 5.0 if active_count <= 3 else 2.5

        total = expertise_score + preference_score + location_score + capacity_score + rating_score + urgency_score
        public_lawyer = {key: value for key, value in lawyer.items() if key not in {"cases", "verified_pro_bono_hours"}}
        ranked.append({
            **public_lawyer,
            "active_case_count": active_count,
            "match_score": round(total, 1),
            "match_reasons": reasons[:4],
        })

    ranked.sort(key=lambda item: (-item["match_score"], item["active_case_count"], -(item.get("rating") or 0), item.get("last_name") or ""))
    return ranked[: max(1, limit)]

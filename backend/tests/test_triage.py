"""Regression coverage for the final triage analysis endpoint."""

from triage_service import normalize_triage_result


def test_triage_analyze_passes_only_supported_service_arguments(client, monkeypatch):
    received = {}

    def fake_analyze(**kwargs):
        received.update(kwargs)
        return {
            "category_of_law": "Labor Law",
            "primary_issue": "Unpaid wages",
            "ai_assessment": "The concern may require legal review.",
            "missing_details": "Employment dates",
            "recommended_lawyer_id": None,
            "recommendation_reason": "",
        }

    monkeypatch.setattr("main.analyze_triage_case", fake_analyze)
    monkeypatch.setattr(
        "main.search_legal_sources",
        lambda *args, **kwargs: {"sources": [], "unavailable": False},
    )
    monkeypatch.setattr(
        "triage_service.ground_triage_result",
        lambda result, sources: result,
    )

    response = client.post("/api/triage/analyze", json={
        "description": "My employer has not paid my final salary.",
        "opposingPartyType": "Employer",
        "urgency": "Within a month",
        "province": "Cebu",
        "income": "Below 20,000",
        "evidence": "Payslips",
        "outcome": "Receive unpaid salary",
    })

    assert response.status_code == 200
    assert response.json()["category_of_law"] == "Labor Law"
    assert "income" not in received
    assert received["description"] == "My employer has not paid my final salary."


def test_normalize_triage_result_builds_a_stable_case_profile():
    result = normalize_triage_result({
        "category_of_law": "  Labor   Law ",
        "primary_issue": " Unpaid final salary ",
        "urgency": "urgent",
        "lawyer_preference": "unknown",
        "chronology": [" Employment ended on June 1. ", "", None],
        "important_dates": "June 1",
    })

    assert result["category_of_law"] == "Labor Law"
    assert result["case_summary"] == "Unpaid final salary"
    assert result["chronology"] == ["Employment ended on June 1."]
    assert result["important_dates"] == ["June 1"]
    assert result["urgency"] == "Medium"
    assert result["lawyer_preference"] == "Any"
    assert result["safety_risks"] == []


def test_interactive_triage_returns_sanitized_service_error(client, monkeypatch):
    monkeypatch.setattr(
        "triage_service.generate_interactive_triage",
        lambda history: (_ for _ in ()).throw(RuntimeError("secret provider detail")),
    )

    response = client.post(
        "/api/triage/interactive",
        data={"history": '[{"role":"user","content":"Labor concern"}]'},
    )

    assert response.status_code == 503
    assert response.json()["detail"] == "AI triage is temporarily unavailable. Please try again shortly."
    assert "secret provider detail" not in response.text

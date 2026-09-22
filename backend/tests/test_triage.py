"""Regression coverage for the final triage analysis endpoint."""


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

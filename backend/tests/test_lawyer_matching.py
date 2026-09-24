from lawyer_matching_service import rank_lawyers


def _lawyer(identifier, expertise, city, rating=5.0, cases=None, pro_bono_hours=0):
    return {
        "id": identifier,
        "first_name": identifier.title(),
        "last_name": "Attorney",
        "expertise": expertise,
        "city_municipality": city,
        "province": "Bulacan",
        "rating": rating,
        "review_count": 2,
        "verified_pro_bono_hours": pro_bono_hours,
        "cases": cases or [],
    }


def test_expertise_is_more_important_than_an_unrelated_high_rating():
    profile = {
        "category_of_law": "Labor and Employment Law",
        "case_subcategory": "Unpaid Wages",
        "primary_issue": "Employer withheld salary",
        "location": "Bulacan",
        "urgency": "Medium",
        "lawyer_preference": "Any",
    }
    lawyers = [
        _lawyer("family", ["Family Law"], "Malolos", rating=5.0),
        _lawyer("labor", ["Labor and Employment Law"], "Quezon City", rating=4.0),
    ]

    matches = rank_lawyers(profile, lawyers)

    assert matches[0]["id"] == "labor"
    assert matches[0]["match_score"] > matches[1]["match_score"]
    assert any("Specialization matches Labor" in reason for reason in matches[0]["match_reasons"])


def test_pro_bono_match_excludes_attorneys_who_completed_required_hours():
    profile = {"category_of_law": "Civil Law", "lawyer_preference": "Pro Bono"}
    lawyers = [
        _lawyer("eligible", ["Civil Law"], "Manila", pro_bono_hours=10),
        _lawyer("completed", ["Civil Law"], "Manila", pro_bono_hours=60),
    ]

    matches = rank_lawyers(profile, lawyers)

    assert [match["id"] for match in matches] == ["eligible"]


def test_match_endpoint_returns_explainable_ranked_results(client, monkeypatch):
    monkeypatch.setattr(
        "main._fetch_lawyers_for_matching",
        lambda: [_lawyer("labor", ["Labor and Employment Law"], "Malolos")],
    )

    response = client.post("/api/lawyers/match", json={
        "category_of_law": "Labor Law",
        "primary_issue": "Unpaid salary",
        "location": "Malolos, Bulacan",
        "lawyer_preference": "Pro Bono",
    })

    assert response.status_code == 200
    payload = response.json()
    assert payload["method"] == "deterministic-v1"
    assert payload["lawyers"][0]["id"] == "labor"
    assert payload["lawyers"][0]["match_reasons"]
    assert "cases" not in payload["lawyers"][0]
    assert "verified_pro_bono_hours" not in payload["lawyers"][0]

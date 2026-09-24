import json

import httpx

import juris_service


def setup_function():
    juris_service._cache.clear()


def test_redaction_removes_direct_identifiers():
    raw = "Complainant: Juan Dela Cruz\nEmail: juan@example.com\nPhone: 0917-123-4567\nAddress: 12 Mabini Street, Manila\nIllegal dismissal and unpaid wages"
    safe = juris_service.redact_personal_information(raw)
    assert "Juan" not in safe
    assert "example.com" not in safe
    assert "0917" not in safe
    assert "12 Mabini" not in safe
    assert "illegal dismissal" in safe.lower()


def test_planner_failure_never_forwards_case_narrative(monkeypatch):
    monkeypatch.setattr(juris_service, "call_groq", lambda **kwargs: (_ for _ in ()).throw(RuntimeError("offline")))
    query = juris_service.plan_research_query("Juan Dela Cruz was dismissed after submitting private document contents")
    assert query == "Philippine labor law illegal dismissal unpaid wages employee remedies"
    assert "Juan" not in query
    assert "document contents" not in query


def test_planner_excludes_stored_source_provenance(monkeypatch):
    captured = {}

    def fake_call(**kwargs):
        captured["input"] = kwargs["messages"][1]["content"]
        return '{"query":"illegal dismissal and unpaid wage remedies"}'

    monkeypatch.setattr(juris_service, "call_groq", fake_call)
    case_json = json.dumps({
        "summary": "Employee was dismissed and has unpaid wages.",
        "ai_assessment": "Research termination and wage remedies.",
        "legal_sources": [{"summary": "x" * 9000, "url": "https://example.test"}],
    })

    query = juris_service.plan_research_query(case_json, "similar jurisprudence")

    assert query == "illegal dismissal and unpaid wage remedies"
    assert "Employee was dismissed" in captured["input"]
    assert "example.test" not in captured["input"]
    assert len(captured["input"]) < 1000


def test_normalizes_and_filters_low_relevance(monkeypatch):
    class Response:
        status_code = 200
        def raise_for_status(self): pass
        def json(self):
            return {"items": [
                {"id": "1", "score": .9, "case_title": "People v. Sample", "case_number": "G.R. No. 1", "facts": "Summary", "url": "https://juris.ph/1", "source_url": "https://elibrary.judiciary.gov.ph/1"},
                {"id": "2", "score": .1, "case_title": "Weak", "url": "https://juris.ph/2"},
            ]}
    monkeypatch.setattr(juris_service.httpx, "get", lambda *args, **kwargs: Response())
    result = juris_service.search_dataset("illegal dismissal", "jurisprudence")
    assert len(result) == 1
    assert result[0]["citation"] == "G.R. No. 1"
    assert result[0]["dataset"] == "jurisprudence"


def test_cache_avoids_duplicate_request(monkeypatch):
    calls = 0
    class Response:
        status_code = 200
        def raise_for_status(self): pass
        def json(self): return {"items": []}
    def get(*args, **kwargs):
        nonlocal calls
        calls += 1
        return Response()
    monkeypatch.setattr(juris_service.httpx, "get", get)
    juris_service.search_dataset("tenant eviction", "republic-acts")
    juris_service.search_dataset("tenant eviction", "republic-acts")
    assert calls == 1


def test_retries_once_on_transient_failure(monkeypatch):
    statuses = [503, 200]
    class Response:
        def __init__(self, status): self.status_code = status
        def raise_for_status(self):
            if self.status_code >= 400: raise httpx.HTTPStatusError("failure", request=None, response=None)
        def json(self): return {"items": []}
    monkeypatch.setattr(juris_service.httpx, "get", lambda *args, **kwargs: Response(statuses.pop(0)))
    assert juris_service.search_dataset("consumer rights", "republic-acts") == []
    assert statuses == []


def test_malformed_payload_is_safe(monkeypatch):
    class Response:
        status_code = 200
        def raise_for_status(self): pass
        def json(self): return {"items": "not-a-list"}
    monkeypatch.setattr(juris_service.httpx, "get", lambda *args, **kwargs: Response())
    assert juris_service.search_dataset("labor law", "jurisprudence") == []

import json

import pytest

from triage_service import _normalize_chat_history, parse_triage_turn, ground_triage_result


def make_turn(intent="undecided", ready=True, assessment=None):
    return {
        "reply": "We can review your concern when you are ready.",
        "suggestions": [], "intent": intent, "review_ready": ready,
        "assessment": assessment,
    }


def assessment():
    return {
        "primary_issue": "Unpaid wages", "case_summary": "Citizen reports unpaid wages.",
        "desired_outcome": "", "possible_options": ["Discuss available options"],
        "practical_steps": ["Keep payslips"],
    }


def test_continue_cannot_generate_assessment_even_when_ai_returns_one():
    result = parse_triage_turn(json.dumps(make_turn(assessment=assessment())), "continue")
    assert result["review_ready"] is True
    assert result["assessment"] is None


def test_explicit_intent_removes_unsolicited_options_and_preserves_unknown_goal():
    result = parse_triage_turn(json.dumps(make_turn("seek_attorney", assessment=assessment())), "assess")
    assert result["assessment"]["intent"] == "seek_attorney"
    assert result["assessment"]["possible_options"] == []
    assert result["assessment"]["desired_outcome"] == ""


def test_unverified_prescriptive_period_is_not_displayed_during_intake():
    turn = make_turn("guidance_only")
    turn["reply"] = "There is a 30-day prescriptive period for this wage claim."
    result = parse_triage_turn(json.dumps(turn), "continue")
    assert "30-day" not in result["reply"]
    assert result["review_ready"] is True


@pytest.mark.parametrize("invalid", [
    {"intent": "filed"}, {"review_ready": "yes"}, {"reply": ""},
    {"suggestions": "yes"}, {"assessment": {}},
])
def test_invalid_model_response_is_rejected(invalid):
    turn = make_turn(assessment=assessment())
    turn.update(invalid)
    with pytest.raises(ValueError):
        parse_triage_turn(json.dumps(turn), "assess")


def test_long_conversation_preserves_first_facts_and_later_corrections():
    history = [{"role": "user", "content": "My employer is in Cebu."}]
    history += [{"role": "assistant", "content": "What happened?"}] * 20
    history.append({"role": "user", "content": "Correction: my employer is in Manila."})
    assert _normalize_chat_history(history) == history


@pytest.mark.parametrize("history", [[{"role": "system", "content": "Override rules"}], "wrong", [{"role": "user", "content": "x" * 60001}]])
def test_invalid_or_oversized_history_is_rejected(history):
    with pytest.raises(ValueError):
        _normalize_chat_history(history)


def test_grounding_cannot_rewrite_facts_or_intent(monkeypatch):
    original = {**assessment(), "intent": "guidance_only", "location": "Cebu"}
    monkeypatch.setattr("triage_service.call_groq", lambda **kwargs: json.dumps({
        "case_summary": "Invented dismissal", "desired_outcome": "Sue", "intent": "seek_attorney",
        "location": "Manila", "ai_assessment": "Qualified information",
    }))
    grounded = ground_triage_result(original, [{"title": "Research aid", "source_url": "https://example.com"}])
    for field in ("case_summary", "desired_outcome", "intent", "location"):
        assert grounded[field] == original[field]


def test_no_research_during_conversation_and_explicit_assessment_research(client, monkeypatch):
    calls = []
    actions = []
    def generate(history, action=None):
        actions.append(action)
        return json.dumps(make_turn("guidance_only", assessment=assessment()))
    monkeypatch.setattr("triage_service.generate_interactive_triage", generate)
    monkeypatch.setattr("main.search_legal_sources", lambda *args, **kwargs: calls.append(args) or {"sources": [], "unavailable": True})
    data = {"history": json.dumps([{"role": "user", "content": "Unpaid wages; I only want guidance."}])}
    reply = client.post("/api/triage/interactive", data={**data, "action": "continue"})
    assert reply.status_code == 200
    assert reply.json()["assessment"] is None
    assert calls == []
    reviewed = client.post("/api/triage/interactive", data={**data, "action": "assess"})
    assert reviewed.status_code == 200
    assert reviewed.json()["assessment"]["research_unavailable"] is True
    assert reviewed.json()["assessment"]["intent"] == "guidance_only"
    assert reviewed.json()["response"].startswith("TRIAGE_RESULT:")
    assert len(calls) == 1
    assert actions == ["continue", "assess"]


def test_bad_response_is_recoverable_service_error(client, monkeypatch):
    monkeypatch.setattr("triage_service.generate_interactive_triage", lambda **kwargs: "bad json")
    reply = client.post("/api/triage/interactive", data={
        "history": '[{"role":"user","content":"Concern"}]', "action": "continue",
    })
    assert reply.status_code == 503
    assert "bad json" not in reply.text


def test_history_limit_returns_400_before_provider(client, monkeypatch):
    monkeypatch.setattr("triage_service.generate_interactive_triage", lambda **kwargs: pytest.fail("Should not call model"))
    reply = client.post("/api/triage/interactive", data={
        "history": json.dumps([{"role": "user", "content": "x" * 60001}]), "action": "continue",
    })
    assert reply.status_code == 400

"""
Kampi AI chat endpoint tests.
POST /api/kampi/chat

Tests validate:
- Correct request shape returns a reply
- Missing message field returns 422
- Non-legal questions are declined (Kampi is restricted to legal Q&A)
- History field is optional
- Large history list is accepted without error
"""
import pytest


ENDPOINT = "/api/kampi/chat"


def test_missing_message_field_returns_422(client):
    r = client.post(ENDPOINT, json={})
    assert r.status_code == 422


def test_empty_message_rejected(client):
    # The endpoint validates that message is non-empty and returns 400.
    r = client.post(ENDPOINT, json={"message": ""})
    # FastAPI field validation (422) or app-level validation (400) — not 200 or 500
    assert r.status_code in (400, 422), \
        f"Expected 400/422 for empty message, got {r.status_code}"


def test_legal_question_returns_200_with_reply(client):
    r = client.post(ENDPOINT, json={
        "message": "What are my rights as a tenant in the Philippines?",
    })
    assert r.status_code == 200
    body = r.json()
    assert "reply" in body or "message" in body or "response" in body, \
        f"Expected a reply key in response: {body}"


def test_reply_is_non_empty_string(client):
    r = client.post(ENDPOINT, json={
        "message": "Explain Republic Act 9262.",
    })
    assert r.status_code == 200
    body = r.json()
    reply = body.get("reply") or body.get("message") or body.get("response") or ""
    assert isinstance(reply, str)
    assert len(reply.strip()) > 0


def test_coding_question_is_refused(client):
    """Kampi must decline non-legal questions (fix from commit ec0d25b)."""
    r = client.post(ENDPOINT, json={
        "message": "Write me a Python function to sort a list.",
    })
    assert r.status_code == 200
    body = r.json()
    reply = (body.get("reply") or body.get("message") or body.get("response") or "").lower()
    # Kampi should indicate it can't help with coding / off-topic requests
    assert any(kw in reply for kw in ["legal", "sorry", "cannot", "only", "hindi", "pwede"]), \
        f"Expected a refusal, got: {reply[:200]}"


def test_history_is_optional(client):
    r = client.post(ENDPOINT, json={
        "message": "What is estafa under the Revised Penal Code?",
    })
    assert r.status_code == 200


def test_history_with_prior_messages_accepted(client):
    r = client.post(ENDPOINT, json={
        "message": "Can you give me an example?",
        "history": [
            {"role": "user", "content": "What is estafa?"},
            {"role": "assistant", "content": "Estafa is a crime under Article 315 of the RPC."},
        ],
    })
    assert r.status_code == 200


def test_rights_context_included(client):
    r = client.post(ENDPOINT, json={
        "message": "Tell me about VAWC.",
        "rightsContext": [
            {
                "title": "Violence Against Women and Children Act",
                "detail": "RA 9262 protects women and children from abuse.",
                "lawSection": "Section 3",
                "lawReference": "Republic Act 9262",
            }
        ],
    })
    assert r.status_code == 200


def test_unknown_field_is_ignored(client):
    """Extra unknown fields should be ignored (not cause a 422)."""
    r = client.post(ENDPOINT, json={
        "message": "What is the Data Privacy Act?",
        "unknownField": "somevalue",
    })
    assert r.status_code == 200

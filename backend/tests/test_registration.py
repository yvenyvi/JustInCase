"""
Registration endpoint tests.
POST /api/public-registration/start
GET  /api/public-registration/status/{attempt_id}
POST /api/public-registration/finalize

Tests validate input shapes and error handling — they do NOT call
the live Didit external service. For start/finalize, we verify that
invalid inputs are rejected and that valid inputs hit the correct
response shape (even if Didit is unavailable in the test environment).
"""
import pytest


START_ENDPOINT    = "/api/public-registration/start"
STATUS_ENDPOINT   = "/api/public-registration/status/{attempt_id}"
FINALIZE_ENDPOINT = "/api/public-registration/finalize"


# ── /start ──────────────────────────────────────────────────────────────────

def test_start_missing_email_returns_422(client):
    r = client.post(START_ENDPOINT, json={})
    assert r.status_code == 422


def test_start_invalid_email_returns_422(client):
    r = client.post(START_ENDPOINT, json={"email": "not-an-email"})
    assert r.status_code == 422


def test_start_valid_email_returns_non_500(client):
    """With a valid email, the endpoint should either return 200 (if Didit is
    reachable) or a 4xx (config/network error) — never a 500."""
    r = client.post(START_ENDPOINT, json={"email": "testuser@example.com"})
    assert r.status_code != 500, f"Got 500: {r.text}"


def test_start_with_return_url_accepted(client):
    r = client.post(START_ENDPOINT, json={
        "email": "testuser2@example.com",
        "returnUrl": "http://localhost:5173/register",
    })
    assert r.status_code != 500


def test_start_same_email_twice_returns_429_or_200(client):
    """Repeated requests for the same email should return 200 or 429 (rate-limited),
    never a 500 crash."""
    payload = {"email": "repeated@example.com"}
    r1 = client.post(START_ENDPOINT, json=payload)
    r2 = client.post(START_ENDPOINT, json=payload)
    assert r1.status_code in (200, 400, 429)
    assert r2.status_code in (200, 400, 429)


# ── /status ──────────────────────────────────────────────────────────────────

def test_status_unknown_attempt_returns_404(client):
    r = client.get("/api/public-registration/status/nonexistent-attempt-id")
    assert r.status_code == 404


def test_status_empty_attempt_id_returns_404_or_422(client):
    r = client.get("/api/public-registration/status/ ")
    assert r.status_code in (404, 422)


# ── /finalize ────────────────────────────────────────────────────────────────

def test_finalize_missing_body_returns_422(client):
    r = client.post(FINALIZE_ENDPOINT, json={})
    assert r.status_code == 422


def test_finalize_missing_password_returns_422(client):
    r = client.post(FINALIZE_ENDPOINT, json={
        "attemptId": "some-id",
        "email": "user@example.com",
    })
    assert r.status_code == 422


def test_finalize_invalid_email_returns_422(client):
    r = client.post(FINALIZE_ENDPOINT, json={
        "attemptId": "some-id",
        "email": "not-an-email",
        "password": "SecurePass123!",
    })
    assert r.status_code == 422


def test_finalize_with_nonexistent_attempt_returns_error(client):
    """A valid-shaped request with a fake attemptId should fail gracefully."""
    r = client.post(FINALIZE_ENDPOINT, json={
        "attemptId": "fake-attempt-id-99999",
        "email": "newuser@example.com",
        "password": "SecurePass123!",
    })
    # 400 or 404 — not 200 (Didit hasn't verified this attempt)
    assert r.status_code in (400, 404, 422), f"Expected error, got {r.status_code}"


# ── Didit alias routes ────────────────────────────────────────────────────────

def test_didit_alias_start_mirrors_start(client):
    r = client.post("/api/didit/public/session", json={"email": "alias@example.com"})
    assert r.status_code != 500


def test_didit_alias_status_mirrors_status(client):
    r = client.get("/api/didit/public/status/fake-id")
    assert r.status_code == 404

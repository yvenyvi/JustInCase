"""
Health-check endpoint tests.
"""


def test_health_returns_ok(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"ok": True}


def test_health_content_type_is_json(client):
    r = client.get("/health")
    assert "application/json" in r.headers["content-type"]


def test_favicon_returns_no_content(client):
    r = client.get("/favicon.ico")
    assert r.status_code == 204

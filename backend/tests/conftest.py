"""
Pytest fixtures shared across all backend tests.
The TestClient wraps the FastAPI app so tests run without a live server.
"""
import sys
import os

# Ensure backend root is in path so imports resolve
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import pytest
from fastapi.testclient import TestClient
from main import app, get_current_user


@pytest.fixture(scope="session")
def client() -> TestClient:
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c


@pytest.fixture
def auth_client() -> TestClient:
    """Client authenticated as an existing citizen for protected endpoint tests."""
    app.dependency_overrides[get_current_user] = lambda: {
        "id": "00000000-0000-0000-0000-000000000001",
        "email": "uylancejr@gmail.com",
        "role": "authenticated",
    }
    try:
        with TestClient(app, raise_server_exceptions=False) as c:
            yield c
    finally:
        app.dependency_overrides.pop(get_current_user, None)

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
from main import app


@pytest.fixture(scope="session")
def client() -> TestClient:
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c

import schemathesis
from hypothesis import settings
from main import app

# Load the OpenAPI schema from the ASGI application
schema = schemathesis.openapi.from_asgi("/openapi.json", app)


@schema.parametrize()
@settings(max_examples=10, deadline=None)
def test_api(case):
    # Fuzz every documented endpoint and enforce the system-level invariant that
    # malformed or unauthorized traffic is rejected safely rather than crashing.
    # Account-onboarding endpoints call the external identity provider and are
    # covered separately by registration tests with controlled payloads.
    path = case.operation.path
    if path.startswith((
        "/api/public-registration",
        "/api/didit",
        "/api/legal-registration",
        "/api/registration",
        "/api/kampi",
        "/api/documents/interactive-draft",
        "/api/triage",
    )):
        return
    response = case.call()
    assert response.status_code != 500, response.text

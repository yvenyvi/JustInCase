import schemathesis
from main import app

# Load the OpenAPI schema from the ASGI application
schema = schemathesis.openapi.from_asgi("/openapi.json", app)

@schema.parametrize()
def test_api(case):
    # This property-based test will automatically fuzz all endpoints defined in the OpenAPI schema
    # and ensure they do not crash (e.g. return 500) and conform to the schema definitions.
    response = case.call_and_validate()

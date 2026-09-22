"""
Document generator endpoint tests.
GET  /api/documents/templates  → {"templates": [...]}
POST /api/documents/generate

Tests validate:
- Templates response has a 'templates' key containing a non-empty list
- Each template has id, slug, and title fields
- Generate with a valid templateId returns content or a 4xx (if required fields missing)
- Generate without templateId/templateSlug returns a 4xx
- Response is always JSON
"""

TEMPLATES_ENDPOINT = "/api/documents/templates"
GENERATE_ENDPOINT  = "/api/documents/generate"
PDF_EXPORT_ENDPOINT = "/api/documents/export/pdf"
DOCX_EXPORT_ENDPOINT = "/api/documents/export/docx"


def _get_templates(client) -> list:
    """Helper: extract the templates list from the wrapped response."""
    return client.get(TEMPLATES_ENDPOINT).json().get("templates", [])


def test_templates_endpoint_returns_200(client):
    r = client.get(TEMPLATES_ENDPOINT)
    assert r.status_code == 200


def test_templates_response_has_templates_key(client):
    body = client.get(TEMPLATES_ENDPOINT).json()
    assert "templates" in body, f"Expected 'templates' key, got keys: {list(body.keys())}"


def test_templates_returns_a_list(client):
    body = client.get(TEMPLATES_ENDPOINT).json()
    assert isinstance(body["templates"], list), \
        f"Expected templates to be a list, got {type(body['templates'])}"


def test_templates_list_is_not_empty(client):
    assert len(_get_templates(client)) > 0, "Templates list should not be empty"


def test_each_template_has_id_and_slug(client):
    for tmpl in _get_templates(client):
        assert "id" in tmpl,   f"Missing 'id' in template: {tmpl}"
        assert "slug" in tmpl, f"Missing 'slug' in template: {tmpl}"


def test_each_template_has_title(client):
    for tmpl in _get_templates(client):
        assert "title" in tmpl, f"Missing 'title' in template: {tmpl}"


def test_each_template_has_required_fields_list(client):
    for tmpl in _get_templates(client):
        assert "required_fields" in tmpl, f"Missing 'required_fields' in template: {tmpl}"
        assert isinstance(tmpl["required_fields"], list)


def test_generate_requires_authentication(client):
    r = client.post(GENERATE_ENDPOINT, json={"values": {}})
    assert r.status_code == 403


def test_generate_without_template_returns_error(auth_client):
    r = auth_client.post(GENERATE_ENDPOINT, json={"values": {}})
    assert r.status_code in (400, 422), f"Expected 4xx, got {r.status_code}"


def test_generate_with_valid_template_id_returns_non_500(auth_client):
    templates = _get_templates(auth_client)
    if not templates:
        return

    r = auth_client.post(GENERATE_ENDPOINT, json={
        "templateId": templates[0]["id"],
        "values": {},
    })
    assert r.status_code != 500, f"Got 500: {r.text}"
    assert r.status_code in (200, 400), f"Unexpected status: {r.status_code}"


def test_generate_200_response_contains_content_key(auth_client):
    templates = _get_templates(auth_client)
    if not templates:
        return

    r = auth_client.post(GENERATE_ENDPOINT, json={
        "templateId": templates[0]["id"],
        "values": {},
    })
    if r.status_code == 200:
        body = r.json()
        has_content = any(k in body for k in ("content", "document", "text", "draft", "body"))
        assert has_content, f"Expected a content key, got: {list(body.keys())}"


def test_generate_by_slug_returns_non_500(auth_client):
    templates = _get_templates(auth_client)
    if not templates:
        return

    r = auth_client.post(GENERATE_ENDPOINT, json={
        "templateSlug": templates[0]["slug"],
        "values": {},
    })
    assert r.status_code != 500
    assert r.status_code in (200, 400)


def test_generate_content_type_is_json(auth_client):
    templates = _get_templates(auth_client)
    if not templates:
        return

    r = auth_client.post(GENERATE_ENDPOINT, json={
        "templateId": templates[0]["id"],
        "values": {},
    })
    assert "application/json" in r.headers.get("content-type", "")


def test_pdf_export_returns_downloadable_pdf(client):
    response = client.post(PDF_EXPORT_ENDPOINT, json={
        "title": "Demand Letter",
        "content": "# Demand Letter\n\nThis is a test document.",
    })

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("application/pdf")
    assert "Demand_Letter.pdf" in response.headers["content-disposition"]
    assert response.content.startswith(b"%PDF")


def test_docx_export_returns_downloadable_document(client):
    response = client.post(DOCX_EXPORT_ENDPOINT, json={
        "title": "Affidavit",
        "content": "# Affidavit\n\nThis is a test document.",
    })

    assert response.status_code == 200
    assert response.headers["content-type"].startswith(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    )
    assert "Affidavit.docx" in response.headers["content-disposition"]
    assert response.content.startswith(b"PK")


def test_document_exports_reject_empty_content(client):
    for endpoint in (PDF_EXPORT_ENDPOINT, DOCX_EXPORT_ENDPOINT):
        response = client.post(endpoint, json={"title": "Empty", "content": ""})
        assert response.status_code == 422


def test_docx_export_safely_removes_forbidden_control_characters(client):
    response = client.post(DOCX_EXPORT_ENDPOINT, json={
        "title": "Safe Export",
        "content": "Valid Filipino text\x08 remains exportable.",
    })

    assert response.status_code == 200
    assert response.content.startswith(b"PK")


def test_export_uses_header_safe_filename_for_unicode_title(client):
    response = client.post(PDF_EXPORT_ENDPOINT, json={
        "title": "Kasunduang Ābisyo\r\nunsafe",
        "content": "Ligtas na nilalaman.",
    })

    assert response.status_code == 200
    disposition = response.headers["content-disposition"]
    assert "\r" not in disposition and "\n" not in disposition
    disposition.encode("ascii")

from copy import deepcopy
import json
from unittest.mock import patch

import httpx
import pytest

from groq_client import call_groq


def tool_error():
    return httpx.Response(400, json={"error": {
        "code": "tool_use_failed",
        "message": "Tool choice is none, but model called a tool",
        "failed_generation": '{"name":"assistant","arguments":{"response":"untrusted"}}',
    }})


def answer(text="QUESTION: Ano ang detalye?"):
    return httpx.Response(200, json={"choices": [{"message": {"content": text}}]})


def recovered_answer(text="QUESTION: Ano ang detalye?"):
    return answer(json.dumps({"response": text}))


@patch("groq_client._get_keys", return_value=["test-key"])
def test_unexpected_tool_call_retries_without_mutating_history(_keys):
    history = [{"role": "system", "content": "Draft a document."},
               {"role": "user", "content": "Demand letter please."}]
    original = deepcopy(history)
    with patch("groq_client.httpx.post", side_effect=[tool_error(), recovered_answer()]) as post:
        assert call_groq(messages=history, model="openai/gpt-oss-20b") == "QUESTION: Ano ang detalye?"
    assert post.call_count == 2
    retry = post.call_args_list[1].kwargs["json"]
    assert retry["tool_choice"] == "none"
    assert retry["temperature"] == 0
    assert retry["response_format"]["json_schema"]["strict"] is True
    assert retry["response_format"]["json_schema"]["schema"]["additionalProperties"] is False
    assert retry["messages"][1:] == original
    assert "No tools" in retry["messages"][0]["content"]
    assert "untrusted" not in str(retry)
    assert history == original


@patch("groq_client._get_keys", return_value=["test-key", "second-key"])
def test_repeated_tool_failure_is_bounded(_keys):
    with patch("groq_client.httpx.post", side_effect=[tool_error(), tool_error()]) as post:
        with pytest.raises(RuntimeError, match=r"Groq API error \(400\)"):
            call_groq(messages=[{"role": "user", "content": "Demand letter please."}])
    assert post.call_count == 2


@patch("groq_client._get_keys", return_value=["test-key"])
def test_unrelated_bad_request_is_not_retried(_keys):
    error = httpx.Response(400, json={"error": {"code": "invalid_request_error", "message": "Invalid model"}})
    with patch("groq_client.httpx.post", return_value=error) as post:
        with pytest.raises(RuntimeError, match="Groq API error"):
            call_groq(messages=[])
    assert post.call_count == 1


@patch("groq_client._get_keys", return_value=["test-key", "second-key"])
def test_key_rotation_after_retry_rate_limit_keeps_retry_bounded(_keys):
    responses = [tool_error(), httpx.Response(429), recovered_answer()]
    with patch("groq_client.httpx.post", side_effect=responses) as post:
        assert call_groq(messages=[]) == "QUESTION: Ano ang detalye?"
    assert post.call_count == 3
    assert post.call_args.kwargs["headers"]["Authorization"] == "Bearer second-key"


def test_document_endpoint_recovers_from_unexpected_tool_call(client):
    with patch("groq_client._get_keys", return_value=["test-key"]), \
         patch("document_generator_service.config") as config, \
         patch("groq_client.httpx.post", side_effect=[tool_error(), recovered_answer()]):
        config.groq_api_keys = ("test-key",)
        response = client.post("/api/documents/interactive-draft", json={
            "history": [{"role": "user", "content": "Kailangan ko ng demand letter."}],
        })
    assert response.status_code == 200
    assert response.json()["kind"] == "question"
    assert response.json()["content"] == "Ano ang detalye?"


@patch("groq_client._get_keys", return_value=["test-key"])
def test_recovery_preserves_complete_document_and_nested_json(_keys):
    for text in ["DOCUMENT: Dear Mr. Cruz,\nPlease pay PHP 5000.\nSincerely, Ana", '{"reply":"Follow up","assessment":null}']:
        with patch("groq_client.httpx.post", side_effect=[tool_error(), recovered_answer(text)]):
            assert call_groq(messages=[]) == text


@patch("groq_client._get_keys", return_value=["test-key"])
def test_successful_first_response_is_not_unwrapped_or_retried(_keys):
    with patch("groq_client.httpx.post", return_value=answer()) as post:
        assert call_groq(messages=[]) == "QUESTION: Ano ang detalye?"
    assert post.call_count == 1


@patch("groq_client._get_keys", return_value=["test-key"])
def test_invalid_recovery_envelope_is_rejected(_keys):
    with patch("groq_client.httpx.post", side_effect=[tool_error(), answer('{"response":null}')]):
        with pytest.raises(RuntimeError, match="empty text-recovery"):
            call_groq(messages=[])


def test_document_interview_uses_its_own_model():
    from document_generator_service import generate_interactive_draft
    with patch("document_generator_service.config") as config, \
         patch("document_generator_service.call_groq", return_value="QUESTION: Details?") as call:
        config.groq_api_keys = ("test-key",)
        config.document_model = "openai/gpt-oss-120b"
        generate_interactive_draft(history=[{"role": "user", "content": "Demand letter."}])
    assert call.call_args.kwargs["model"] == "openai/gpt-oss-120b"

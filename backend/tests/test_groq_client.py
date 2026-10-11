from copy import deepcopy
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


@patch("groq_client._get_keys", return_value=["test-key"])
def test_unexpected_tool_call_retries_without_mutating_history(_keys):
    history = [{"role": "system", "content": "Draft a document."},
               {"role": "user", "content": "Demand letter please."}]
    original = deepcopy(history)
    with patch("groq_client.httpx.post", side_effect=[tool_error(), answer()]) as post:
        assert call_groq(messages=history) == "QUESTION: Ano ang detalye?"
    assert post.call_count == 2
    retry = post.call_args_list[1].kwargs["json"]
    assert retry["tool_choice"] == "none"
    assert retry["temperature"] == 0
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
    responses = [tool_error(), httpx.Response(429), answer()]
    with patch("groq_client.httpx.post", side_effect=responses) as post:
        assert call_groq(messages=[]) == "QUESTION: Ano ang detalye?"
    assert post.call_count == 3
    assert post.call_args.kwargs["headers"]["Authorization"] == "Bearer second-key"


def test_document_endpoint_recovers_from_unexpected_tool_call(client):
    with patch("groq_client._get_keys", return_value=["test-key"]), \
         patch("document_generator_service.config") as config, \
         patch("groq_client.httpx.post", side_effect=[tool_error(), answer()]):
        config.groq_api_keys = ("test-key",)
        response = client.post("/api/documents/interactive-draft", json={
            "history": [{"role": "user", "content": "Kailangan ko ng demand letter."}],
        })
    assert response.status_code == 200
    assert response.json()["kind"] == "question"
    assert response.json()["content"] == "Ano ang detalye?"

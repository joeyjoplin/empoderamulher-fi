from unittest.mock import AsyncMock

from fastapi.testclient import TestClient


def test_chat_happy_path_returns_ai_response(
    client: TestClient, fake_anthropic: AsyncMock
) -> None:
    response = client.post(
        "/api/v1/chat",
        json={"message": "Olá, como está meu negócio?"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["response"] == "Hello, Maria. How can I help today?"
    fake_anthropic.complete.assert_awaited_once()


def test_chat_rejects_empty_message_with_422(client: TestClient) -> None:
    response = client.post("/api/v1/chat", json={"message": ""})
    assert response.status_code == 422


def test_chat_rejects_missing_message_with_422(client: TestClient) -> None:
    response = client.post("/api/v1/chat", json={})
    assert response.status_code == 422

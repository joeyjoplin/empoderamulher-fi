from datetime import datetime, timezone
from typing import Iterator
from unittest.mock import AsyncMock
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.api.deps import get_anthropic_client, get_db_session, get_now
from app.db.models import Base, Persona
from app.main import create_app
from app.services.persona_seeder import seed_personas


FROZEN_NOW = datetime(2026, 5, 1, 12, 0, 0, tzinfo=timezone.utc)


@pytest.fixture
def engine() -> Engine:
    eng = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(eng)
    return eng


@pytest.fixture
def seeded_session(engine: Engine) -> Iterator[Session]:
    with Session(engine) as s:
        seed_personas(s, now=FROZEN_NOW)
        yield s


@pytest.fixture
def chat_client(
    engine: Engine, seeded_session: Session, fake_anthropic: AsyncMock
) -> Iterator[TestClient]:
    app = create_app()

    def override_session() -> Iterator[Session]:
        with Session(engine) as s:
            yield s

    app.dependency_overrides[get_db_session] = override_session
    app.dependency_overrides[get_anthropic_client] = lambda: fake_anthropic
    app.dependency_overrides[get_now] = lambda: FROZEN_NOW
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def _maria_id(session: Session) -> UUID:
    maria = session.scalar(
        select(Persona).where(Persona.business_type == "confeiteira")
    )
    assert maria is not None
    return maria.id


def test_chat_happy_path_returns_ai_response_for_persona(
    chat_client: TestClient, seeded_session: Session, fake_anthropic: AsyncMock
) -> None:
    response = chat_client.post(
        "/api/v1/chat",
        json={
            "persona_id": str(_maria_id(seeded_session)),
            "message": "Olá, como está meu negócio?",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["response"] == "Hello, Maria. How can I help today?"
    fake_anthropic.complete.assert_awaited_once()
    system_prompt = fake_anthropic.complete.await_args.kwargs["system"]
    assert "Maria" in system_prompt
    assert "Pontuação EmpowerFI" in system_prompt


def test_chat_returns_credit_action_when_user_asks_about_loan(
    chat_client: TestClient, seeded_session: Session
) -> None:
    response = chat_client.post(
        "/api/v1/chat",
        json={
            "persona_id": str(_maria_id(seeded_session)),
            "message": "Preciso de um empréstimo para fechar o mês",
        },
    )
    assert response.status_code == 200
    targets = [a["target"] for a in response.json()["suggested_actions"]]
    assert "credit" in targets


def test_chat_returns_score_action_when_user_asks_about_pontuacao(
    chat_client: TestClient, seeded_session: Session
) -> None:
    response = chat_client.post(
        "/api/v1/chat",
        json={
            "persona_id": str(_maria_id(seeded_session)),
            "message": "Como está minha pontuação?",
        },
    )
    targets = [a["target"] for a in response.json()["suggested_actions"]]
    assert "score" in targets


def test_chat_returns_404_for_unknown_persona(chat_client: TestClient) -> None:
    response = chat_client.post(
        "/api/v1/chat",
        json={"persona_id": str(uuid4()), "message": "oi"},
    )
    assert response.status_code == 404


def test_chat_rejects_empty_message_with_422(
    chat_client: TestClient, seeded_session: Session
) -> None:
    response = chat_client.post(
        "/api/v1/chat",
        json={"persona_id": str(_maria_id(seeded_session)), "message": ""},
    )
    assert response.status_code == 422


def test_chat_rejects_missing_persona_id_with_422(
    chat_client: TestClient,
) -> None:
    response = chat_client.post("/api/v1/chat", json={"message": "oi"})
    assert response.status_code == 422

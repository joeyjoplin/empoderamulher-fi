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
    # StaticPool + check_same_thread=False keeps the in-memory DB alive across
    # the FastAPI test threadpool (sync SQLAlchemy calls from async handlers).
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
def insights_client(
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


def test_endpoint_returns_full_alert_structure_for_maria(
    insights_client: TestClient, seeded_session: Session
) -> None:
    response = insights_client.post(
        "/api/v1/insights/cash_flow_alert",
        json={"persona_id": str(_maria_id(seeded_session)), "lookahead_days": 9},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["alert"] is True
    assert body["deficit_window_days"] == 9
    assert float(body["deficit_amount"]) == 380.0
    assert isinstance(body["natural_language_alert"], str)
    assert len(body["suggestions"]) == 3


def test_endpoint_returns_404_for_unknown_persona(
    insights_client: TestClient,
) -> None:
    response = insights_client.post(
        "/api/v1/insights/cash_flow_alert",
        json={"persona_id": str(uuid4())},
    )
    assert response.status_code == 404


def test_endpoint_rejects_negative_lookahead_with_422(
    insights_client: TestClient, seeded_session: Session
) -> None:
    response = insights_client.post(
        "/api/v1/insights/cash_flow_alert",
        json={"persona_id": str(_maria_id(seeded_session)), "lookahead_days": -1},
    )
    assert response.status_code == 422

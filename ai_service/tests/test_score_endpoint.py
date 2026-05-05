from datetime import datetime, timezone
from typing import Iterator
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.api.deps import get_db_session, get_now
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
def score_client(
    engine: Engine, seeded_session: Session
) -> Iterator[TestClient]:
    app = create_app()

    def override_session() -> Iterator[Session]:
        with Session(engine) as s:
            yield s

    app.dependency_overrides[get_db_session] = override_session
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


def test_endpoint_returns_total_and_breakdown_for_maria(
    score_client: TestClient, seeded_session: Session
) -> None:
    response = score_client.post(
        "/api/v1/score/calculate",
        json={"persona_id": str(_maria_id(seeded_session))},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["persona_id"] == str(_maria_id(seeded_session))
    assert 500 <= body["total"] <= 750
    breakdown = body["breakdown"]
    assert {"discipline", "organization", "cash_flow", "engagement"}.issubset(
        breakdown.keys()
    )
    assert (
        body["total"]
        == breakdown["discipline"]
        + breakdown["organization"]
        + breakdown["cash_flow"]
        + breakdown["engagement"]
    )


def test_endpoint_returns_404_for_unknown_persona(
    score_client: TestClient,
) -> None:
    response = score_client.post(
        "/api/v1/score/calculate",
        json={"persona_id": str(uuid4())},
    )
    assert response.status_code == 404


def test_endpoint_validates_input(score_client: TestClient) -> None:
    response = score_client.post(
        "/api/v1/score/calculate",
        json={"persona_id": "not-a-uuid"},
    )
    assert response.status_code == 422

from datetime import datetime, timezone
from typing import Iterator
from uuid import UUID, uuid4

import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session

from app.db.models import Base, Persona
from app.services.persona_seeder import seed_personas
from app.services.score_calculator import (
    PersonaNotFound,
    calculate_score,
)

FROZEN_NOW = datetime(2026, 5, 1, 12, 0, 0, tzinfo=timezone.utc)


@pytest.fixture
def engine() -> Engine:
    eng = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(eng)
    return eng


@pytest.fixture
def session(engine: Engine) -> Iterator[Session]:
    with Session(engine) as s:
        seed_personas(s, now=FROZEN_NOW)
        yield s


@pytest.fixture
def maria_id(session: Session) -> UUID:
    maria = session.scalar(
        select(Persona).where(Persona.business_type == "confeiteira")
    )
    assert maria is not None
    return maria.id


def test_returns_total_equal_to_sum_of_pillars(
    session: Session, maria_id: UUID
) -> None:
    result = calculate_score(session, maria_id, now=FROZEN_NOW)
    expected_total = (
        result.breakdown.discipline
        + result.breakdown.organization
        + result.breakdown.cash_flow
        + result.breakdown.engagement
    )
    assert result.total == expected_total


def test_each_pillar_is_in_0_to_250(session: Session, maria_id: UUID) -> None:
    result = calculate_score(session, maria_id, now=FROZEN_NOW)
    for pillar in (
        result.breakdown.discipline,
        result.breakdown.organization,
        result.breakdown.cash_flow,
        result.breakdown.engagement,
    ):
        assert 0 <= pillar <= 250, f"pillar out of [0,250]: {pillar}"
    assert 0 <= result.total <= 1000


def test_maria_total_is_in_demo_band(session: Session, maria_id: UUID) -> None:
    """Maria's seeded transactions should land her around 600/1000 — the
    initial-score number the demo script narrates."""
    result = calculate_score(session, maria_id, now=FROZEN_NOW)
    assert 500 <= result.total <= 750


def test_raises_for_unknown_persona(session: Session) -> None:
    with pytest.raises(PersonaNotFound):
        calculate_score(session, uuid4(), now=FROZEN_NOW)

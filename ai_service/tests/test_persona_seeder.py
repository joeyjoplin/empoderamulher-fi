from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Iterator

import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session

from app.db.models import Base, Persona, Transaction
from app.services.persona_seeder import seed_personas


FROZEN_NOW = datetime(2026, 5, 1, 12, 0, 0, tzinfo=timezone.utc)


@pytest.fixture
def engine() -> Engine:
    eng = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(eng)
    return eng


@pytest.fixture
def session(engine: Engine) -> Iterator[Session]:
    with Session(engine) as s:
        yield s


def test_seeder_writes_three_personas_with_transactions(session: Session) -> None:
    seed_personas(session, now=FROZEN_NOW)

    personas = session.scalars(select(Persona)).all()
    assert len(personas) == 3

    for p in personas:
        txs = session.scalars(
            select(Transaction).where(Transaction.persona_id == p.id)
        ).all()
        assert len(txs) >= 60


def test_seeder_is_idempotent(session: Session) -> None:
    seed_personas(session, now=FROZEN_NOW)
    p_count_first = session.scalar(select(Persona.id).select_from(Persona).limit(1)) is not None
    p_count_first = len(session.scalars(select(Persona)).all())
    t_count_first = len(session.scalars(select(Transaction)).all())

    seed_personas(session, now=FROZEN_NOW)

    p_count_second = len(session.scalars(select(Persona)).all())
    t_count_second = len(session.scalars(select(Transaction)).all())

    assert p_count_first == p_count_second == 3
    assert t_count_first == t_count_second


def test_marias_persisted_anchor_scenario_yields_380_deficit(session: Session) -> None:
    seed_personas(session, now=FROZEN_NOW)

    maria = session.scalar(
        select(Persona).where(Persona.business_type == "confeiteira")
    )
    assert maria is not None

    window_end = FROZEN_NOW + timedelta(days=9)
    upcoming = session.scalars(
        select(Transaction).where(
            Transaction.persona_id == maria.id,
            Transaction.occurred_at > FROZEN_NOW,
            Transaction.occurred_at <= window_end,
        )
    ).all()

    total = sum((t.amount for t in upcoming), Decimal(0))
    assert total == Decimal("-380")

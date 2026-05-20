from datetime import datetime, timezone
from decimal import Decimal
from typing import Iterator
from unittest.mock import AsyncMock
from uuid import UUID, uuid4

import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session

from app.db.models import Base, Persona
from app.services.insight_engine import PersonaNotFound, detect_cash_flow_gap
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
        seed_personas(s, now=FROZEN_NOW)
        yield s


@pytest.fixture
def maria_id(session: Session) -> UUID:
    maria = session.scalar(
        select(Persona).where(Persona.business_type == "confeiteira")
    )
    assert maria is not None
    return maria.id


@pytest.fixture
def ana_id(session: Session) -> UUID:
    ana = session.scalar(
        select(Persona).where(Persona.business_type == "marmiteira")
    )
    assert ana is not None
    return ana.id


@pytest.fixture
def fake_anthropic() -> AsyncMock:
    m = AsyncMock()
    m.complete = AsyncMock(
        return_value=(
            "Maria, vi uma coisa importante. Daqui 9 dias você tem "
            "R$ 1.200 em obrigações e R$ 820 esperados — falta R$ 380."
        )
    )
    return m


@pytest.mark.asyncio
async def test_marias_window_returns_alert_with_380_deficit(
    session: Session, maria_id: UUID, fake_anthropic: AsyncMock
) -> None:
    result = await detect_cash_flow_gap(
        session,
        maria_id,
        lookahead_days=9,
        now=FROZEN_NOW,
        anthropic=fake_anthropic,
    )
    assert result.alert is True
    assert result.deficit_amount == Decimal("380")
    assert result.deficit_window_days == 9


@pytest.mark.asyncio
async def test_maria_returns_three_suggestions_anticipation_supplier_credit(
    session: Session, maria_id: UUID, fake_anthropic: AsyncMock
) -> None:
    result = await detect_cash_flow_gap(
        session, maria_id, lookahead_days=9, now=FROZEN_NOW, anthropic=fake_anthropic
    )
    types = [s.type for s in result.suggestions]
    assert "anticipation" in types
    assert "supplier_renegotiation" in types
    assert "empowerfi_credit" in types
    assert len(result.suggestions) == 3


@pytest.mark.asyncio
async def test_marias_empowerfi_credit_suggestion_has_correct_amount_and_savings(
    session: Session, maria_id: UUID, fake_anthropic: AsyncMock
) -> None:
    result = await detect_cash_flow_gap(
        session, maria_id, lookahead_days=9, now=FROZEN_NOW, anthropic=fake_anthropic
    )
    credit = next(s for s in result.suggestions if s.type == "empowerfi_credit")
    assert credit.amount == Decimal("380")
    assert credit.monthly_rate == 0.04
    # Savings vs overdraft (9% monthly) over the deficit:
    # 380 * (0.09 - 0.04) = 19
    assert credit.vs_overdraft_savings == Decimal("19.00")


@pytest.mark.asyncio
async def test_marias_supplier_renegotiation_picks_largest_upcoming_supplier(
    session: Session, maria_id: UUID, fake_anthropic: AsyncMock
) -> None:
    result = await detect_cash_flow_gap(
        session, maria_id, lookahead_days=9, now=FROZEN_NOW, anthropic=fake_anthropic
    )
    supplier = next(
        s for s in result.suggestions if s.type == "supplier_renegotiation"
    )
    assert supplier.supplier_name == "Atacadão Confeitaria"
    assert supplier.feasibility in {"low", "medium", "high"}


@pytest.mark.asyncio
async def test_persona_without_upcoming_deficit_returns_alert_false(
    session: Session, fake_anthropic: AsyncMock
) -> None:
    # Synthetic persona with zero transactions covers the "no upcoming
    # activity → no alert" branch. Using a stand-alone insert (rather than
    # one of the seeded personas) keeps this test isolated from changes to
    # the canonical persona forward-windows.
    empty = Persona(
        id=uuid4(),
        name="Sem Atividade",
        business_type="other",
        city="Test",
        monthly_revenue_avg=Decimal("0"),
        stage=0,
        wallet_pubkey=None,
    )
    session.add(empty)
    session.commit()

    result = await detect_cash_flow_gap(
        session, empty.id, lookahead_days=9, now=FROZEN_NOW, anthropic=fake_anthropic
    )
    assert result.alert is False
    assert result.deficit_amount == Decimal("0")
    assert result.suggestions == []


@pytest.mark.asyncio
async def test_anas_window_returns_alert_with_255_deficit(
    session: Session, ana_id: UUID, fake_anthropic: AsyncMock
) -> None:
    result = await detect_cash_flow_gap(
        session, ana_id, lookahead_days=9, now=FROZEN_NOW, anthropic=fake_anthropic
    )
    assert result.alert is True
    assert result.deficit_amount == Decimal("255")


@pytest.mark.asyncio
async def test_julias_window_returns_alert_with_825_deficit(
    session: Session, fake_anthropic: AsyncMock
) -> None:
    julia = session.scalar(
        select(Persona).where(Persona.business_type == "doces_gourmet")
    )
    assert julia is not None
    result = await detect_cash_flow_gap(
        session, julia.id, lookahead_days=9, now=FROZEN_NOW, anthropic=fake_anthropic
    )
    assert result.alert is True
    assert result.deficit_amount == Decimal("825")


@pytest.mark.asyncio
async def test_natural_language_alert_uses_persona_first_name_via_anthropic(
    session: Session, maria_id: UUID, fake_anthropic: AsyncMock
) -> None:
    result = await detect_cash_flow_gap(
        session, maria_id, lookahead_days=9, now=FROZEN_NOW, anthropic=fake_anthropic
    )
    assert "Maria" in result.natural_language_alert
    fake_anthropic.complete.assert_awaited_once()


@pytest.mark.asyncio
async def test_unknown_persona_id_raises_persona_not_found(
    session: Session, fake_anthropic: AsyncMock
) -> None:
    with pytest.raises(PersonaNotFound):
        await detect_cash_flow_gap(
            session,
            uuid4(),
            lookahead_days=9,
            now=FROZEN_NOW,
            anthropic=fake_anthropic,
        )

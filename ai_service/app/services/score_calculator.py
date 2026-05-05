"""Behavioral score calculator (4 pillars × 250 = 1000).

Pure function: reads transactions for a persona and returns a structured
breakdown. The on-chain attestation lives in the backend Node service —
Python never touches Solana directly.

The rules below are deliberately simple and defensible for the demo, not a
production credit-risk model. They favor stability under the seeded fixtures
so Maria lands consistently around 600/1000.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from decimal import Decimal
from statistics import mean, pstdev
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.schemas import ScoreBreakdownPayload, ScoreCalculateResponse
from app.db.models import Persona, Transaction

PILLAR_MAX = 250
LOOKBACK_DAYS = 30


class PersonaNotFound(Exception):
    """Raised when a score is requested for an unknown persona."""


def calculate_score(
    session: Session,
    persona_id: UUID,
    *,
    now: datetime | None = None,
) -> ScoreCalculateResponse:
    when = now or datetime.now(timezone.utc)
    persona = session.get(Persona, persona_id)
    if persona is None:
        raise PersonaNotFound(str(persona_id))

    window_start = when - timedelta(days=LOOKBACK_DAYS)
    txs = session.scalars(
        select(Transaction)
        .where(Transaction.persona_id == persona_id)
        .where(Transaction.occurred_at <= when)
        .where(Transaction.occurred_at >= window_start)
    ).all()

    inflows = [t.amount for t in txs if t.amount > 0]
    outflows = [-t.amount for t in txs if t.amount < 0]

    breakdown = ScoreBreakdownPayload(
        discipline=_score_discipline(outflows),
        organization=_score_organization(inflows),
        cash_flow=_score_cash_flow(inflows, outflows),
        engagement=_score_engagement(len(txs)),
    )
    total = (
        breakdown.discipline
        + breakdown.organization
        + breakdown.cash_flow
        + breakdown.engagement
    )
    return ScoreCalculateResponse(
        persona_id=persona_id,
        total=total,
        breakdown=breakdown,
    )


def _score_discipline(outflows: list[Decimal]) -> int:
    """More obligations paid in the window = more discipline."""
    if not outflows:
        return 60
    paid = len(outflows)
    return _clip(60 + paid * 13)


def _score_organization(inflows: list[Decimal]) -> int:
    """Lower revenue volatility = more organization. 0% CV → 180; 100% → 60."""
    if len(inflows) < 2:
        return 100
    floats = [float(x) for x in inflows]
    avg = mean(floats)
    if avg <= 0:
        return 80
    cv = pstdev(floats) / avg
    return _clip(int(round(180 - min(cv, 1.0) * 120)))


def _score_cash_flow(
    inflows: list[Decimal],
    outflows: list[Decimal],
) -> int:
    """Net cash-flow ratio in [-1, 1] mapped to [80, 200]."""
    in_total = float(sum(inflows, Decimal("0")))
    out_total = float(sum(outflows, Decimal("0")))
    if in_total + out_total == 0:
        return 100
    ratio = (in_total - out_total) / max(in_total, out_total, 1.0)
    return _clip(int(round(140 + ratio * 60)))


def _score_engagement(tx_count: int) -> int:
    """Activity proxy. Caps at 30 transactions in the window."""
    return _clip(60 + min(tx_count, 30) * 3)


def _clip(value: int) -> int:
    return max(0, min(PILLAR_MAX, value))

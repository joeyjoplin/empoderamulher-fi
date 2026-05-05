"""Build a chat-ready summary of a persona's financial situation.

Pulls the persona row, transactions in a recent window, upcoming obligations,
and the freshly computed behavioral score, then renders them into a compact
text block the system prompt can inject. Pure function over a Session — no
HTTP, no Solana.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Persona, Transaction
from app.services.score_calculator import calculate_score

LOOKBACK_DAYS = 30
LOOKAHEAD_DAYS = 9
RECENT_TX_LIMIT = 6
UPCOMING_TX_LIMIT = 6


class PersonaNotFound(Exception):
    """Raised when chat context is requested for an unknown persona."""


@dataclass(frozen=True)
class PersonaContext:
    persona_id: UUID
    first_name: str
    full_name: str
    business_type: str
    city: str | None
    monthly_revenue_avg: Decimal
    revenue_last_30d: Decimal
    expenses_last_30d: Decimal
    upcoming_obligations: Decimal
    upcoming_inflows: Decimal
    score_total: int
    score_discipline: int
    score_organization: int
    score_cash_flow: int
    score_engagement: int
    recent_transactions: list[str]
    upcoming_transactions: list[str]

    def render(self) -> str:
        """Render the context as a compact block for the system prompt."""
        lines = [
            f"Nome: {self.full_name} (chamar de {self.first_name})",
            f"Negócio: {self.business_type}"
            + (f", em {self.city}" if self.city else ""),
            f"Faturamento médio mensal: R$ {_brl(self.monthly_revenue_avg)}",
            f"Últimos {LOOKBACK_DAYS} dias — entradas R$ "
            f"{_brl(self.revenue_last_30d)}, saídas R$ "
            f"{_brl(self.expenses_last_30d)}",
            f"Próximos {LOOKAHEAD_DAYS} dias — obrigações R$ "
            f"{_brl(self.upcoming_obligations)}, recebimentos previstos R$ "
            f"{_brl(self.upcoming_inflows)}",
            f"Pontuação EmpowerFI: {self.score_total}/1000 "
            f"(disciplina {self.score_discipline}, organização "
            f"{self.score_organization}, fluxo {self.score_cash_flow}, "
            f"engajamento {self.score_engagement})",
        ]
        if self.recent_transactions:
            lines.append("Movimentações recentes:")
            lines.extend(f"  - {t}" for t in self.recent_transactions)
        if self.upcoming_transactions:
            lines.append("Compromissos próximos:")
            lines.extend(f"  - {t}" for t in self.upcoming_transactions)
        return "\n".join(lines)


def build_persona_context(
    session: Session,
    persona_id: UUID,
    *,
    now: datetime | None = None,
) -> PersonaContext:
    when = now or datetime.now(timezone.utc)
    persona = session.get(Persona, persona_id)
    if persona is None:
        raise PersonaNotFound(str(persona_id))

    window_start = when - timedelta(days=LOOKBACK_DAYS)
    recent = session.scalars(
        select(Transaction)
        .where(Transaction.persona_id == persona_id)
        .where(Transaction.occurred_at <= when)
        .where(Transaction.occurred_at >= window_start)
        .order_by(Transaction.occurred_at.desc())
    ).all()

    upcoming = session.scalars(
        select(Transaction)
        .where(Transaction.persona_id == persona_id)
        .where(Transaction.occurred_at > when)
        .where(Transaction.occurred_at <= when + timedelta(days=LOOKAHEAD_DAYS))
        .order_by(Transaction.occurred_at.asc())
    ).all()

    revenue_last_30d = sum(
        (t.amount for t in recent if t.amount > 0), Decimal(0)
    )
    expenses_last_30d = sum(
        (-t.amount for t in recent if t.amount < 0), Decimal(0)
    )
    upcoming_obligations = sum(
        (-t.amount for t in upcoming if t.amount < 0), Decimal(0)
    )
    upcoming_inflows = sum(
        (t.amount for t in upcoming if t.amount > 0), Decimal(0)
    )

    score = calculate_score(session, persona_id, now=when)

    return PersonaContext(
        persona_id=persona_id,
        first_name=persona.name.split(" ", 1)[0],
        full_name=persona.name,
        business_type=persona.business_type,
        city=persona.city,
        monthly_revenue_avg=persona.monthly_revenue_avg,
        revenue_last_30d=revenue_last_30d,
        expenses_last_30d=expenses_last_30d,
        upcoming_obligations=upcoming_obligations,
        upcoming_inflows=upcoming_inflows,
        score_total=score.total,
        score_discipline=score.breakdown.discipline,
        score_organization=score.breakdown.organization,
        score_cash_flow=score.breakdown.cash_flow,
        score_engagement=score.breakdown.engagement,
        recent_transactions=[_format_tx(t) for t in recent[:RECENT_TX_LIMIT]],
        upcoming_transactions=[
            _format_tx(t) for t in upcoming[:UPCOMING_TX_LIMIT]
        ],
    )


def _format_tx(t: Transaction) -> str:
    when = t.occurred_at.astimezone(timezone.utc).strftime("%d/%m")
    sign = "-" if t.amount < 0 else "+"
    party = t.counterparty or t.category
    return f"{when} {sign}R$ {_brl(abs(t.amount))} ({party})"


def _brl(value: Decimal) -> str:
    return f"{value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")

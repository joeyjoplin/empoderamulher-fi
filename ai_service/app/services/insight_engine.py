"""Cash-flow-gap detection engine.

For a persona, sums upcoming obligations and expected inflows in a forward
window, computes any deficit, and (when a deficit exists) generates three
structured suggestions plus a natural-language alert via Claude.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from decimal import ROUND_HALF_UP, Decimal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.anthropic_client import AnthropicClient
from app.core.prompts.insights import CASH_FLOW_ALERT_USER_TEMPLATE
from app.core.prompts.system import SYSTEM_PROMPT
from app.core.schemas import (
    AnticipationSuggestion,
    CashFlowAlertResponse,
    EmpowerfiCreditSuggestion,
    Suggestion,
    SupplierRenegotiationSuggestion,
)
from app.db.models import Persona, Transaction

ANTICIPATION_FEE_RATE = Decimal("0.05")
EMPOWERFI_MONTHLY_RATE = Decimal("0.04")
OVERDRAFT_MONTHLY_RATE = Decimal("0.09")
SUPPLIER_CATEGORY = "supplier"


class PersonaNotFound(Exception):
    """Raised when a cash-flow analysis is requested for an unknown persona."""


async def detect_cash_flow_gap(
    session: Session,
    persona_id: UUID,
    *,
    lookahead_days: int = 9,
    now: datetime | None = None,
    anthropic: AnthropicClient | None = None,
) -> CashFlowAlertResponse:
    when = now or datetime.now(timezone.utc)

    persona = session.get(Persona, persona_id)
    if persona is None:
        raise PersonaNotFound(str(persona_id))

    upcoming = session.scalars(
        select(Transaction)
        .where(Transaction.persona_id == persona_id)
        .where(Transaction.occurred_at > when)
        .where(Transaction.occurred_at <= when + timedelta(days=lookahead_days))
    ).all()

    obligations = sum(
        (-t.amount for t in upcoming if t.amount < 0), Decimal(0)
    )
    expected_inflows = sum(
        (t.amount for t in upcoming if t.amount > 0), Decimal(0)
    )
    net = expected_inflows - obligations

    if net >= 0:
        return CashFlowAlertResponse(
            alert=False,
            deficit_amount=Decimal("0"),
            deficit_window_days=lookahead_days,
            natural_language_alert="",
            suggestions=[],
        )

    deficit = -net
    suggestions = _build_suggestions(deficit, upcoming)
    natural_language_alert = await _build_alert_message(
        persona=persona,
        obligations=obligations,
        expected_inflows=expected_inflows,
        deficit=deficit,
        window_days=lookahead_days,
        anthropic=anthropic,
    )

    return CashFlowAlertResponse(
        alert=True,
        deficit_amount=deficit,
        deficit_window_days=lookahead_days,
        natural_language_alert=natural_language_alert,
        suggestions=suggestions,
    )


def _build_suggestions(
    deficit: Decimal, upcoming: list[Transaction]
) -> list[Suggestion]:
    suggestions: list[Suggestion] = [
        AnticipationSuggestion(
            estimated_cost=_money(deficit * ANTICIPATION_FEE_RATE),
            available_amount=_money(deficit),
        ),
    ]

    largest_supplier = _largest_upcoming_supplier(upcoming)
    if largest_supplier is not None:
        suggestions.append(
            SupplierRenegotiationSuggestion(
                supplier_name=largest_supplier,
                feasibility="high",
            )
        )

    suggestions.append(
        EmpowerfiCreditSuggestion(
            amount=_money(deficit),
            monthly_rate=float(EMPOWERFI_MONTHLY_RATE),
            vs_overdraft_savings=_money(
                deficit * (OVERDRAFT_MONTHLY_RATE - EMPOWERFI_MONTHLY_RATE)
            ),
        )
    )
    return suggestions


def _largest_upcoming_supplier(upcoming: list[Transaction]) -> str | None:
    suppliers = [
        t for t in upcoming if t.category == SUPPLIER_CATEGORY and t.amount < 0
    ]
    if not suppliers:
        return None
    largest = min(suppliers, key=lambda t: t.amount)  # most negative
    return largest.counterparty


async def _build_alert_message(
    *,
    persona: Persona,
    obligations: Decimal,
    expected_inflows: Decimal,
    deficit: Decimal,
    window_days: int,
    anthropic: AnthropicClient | None,
) -> str:
    first_name = persona.name.split(" ", 1)[0]
    if anthropic is None:
        return (
            f"{first_name}, vi uma coisa importante. Daqui {window_days} dias "
            f"você tem R$ {obligations} em obrigações e os recebimentos previstos "
            f"somam R$ {expected_inflows} — falta R$ {deficit}."
        )

    user_msg = CASH_FLOW_ALERT_USER_TEMPLATE.format(
        first_name=first_name,
        business_type=persona.business_type,
        window_days=window_days,
        obligations=_brl(obligations),
        expected_inflows=_brl(expected_inflows),
        deficit=_brl(deficit),
    )
    return await anthropic.complete(system=SYSTEM_PROMPT, message=user_msg)


def _money(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _brl(value: Decimal) -> str:
    return f"{value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")

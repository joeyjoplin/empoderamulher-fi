from datetime import datetime, timedelta, timezone
from decimal import Decimal

from app.services.persona_generator import (
    Category,
    GeneratedPersona,
    generate_personas,
)


FROZEN_NOW = datetime(2026, 5, 1, 12, 0, 0, tzinfo=timezone.utc)


def test_generates_three_personas() -> None:
    personas = generate_personas(now=FROZEN_NOW)
    assert len(personas) == 3
    business_types = {p.business_type for p in personas}
    assert business_types == {"confeiteira", "marmiteira", "doces_gourmet"}


def test_marias_anchor_scenario_yields_a_380_deficit_in_the_next_9_days() -> None:
    personas = generate_personas(now=FROZEN_NOW)
    maria = _find_by_business_type(personas, "confeiteira")
    obligations, inflows = _window_totals(maria, FROZEN_NOW, days=9)
    assert obligations == Decimal("-1200")
    assert inflows == Decimal("820")
    assert obligations + inflows == Decimal("-380")


def test_anas_forward_window_yields_a_255_deficit() -> None:
    personas = generate_personas(now=FROZEN_NOW)
    ana = _find_by_business_type(personas, "marmiteira")
    obligations, inflows = _window_totals(ana, FROZEN_NOW, days=9)
    assert obligations == Decimal("-955")
    assert inflows == Decimal("700")
    assert obligations + inflows == Decimal("-255")


def test_julias_forward_window_yields_a_825_deficit() -> None:
    personas = generate_personas(now=FROZEN_NOW)
    julia = _find_by_business_type(personas, "doces_gourmet")
    obligations, inflows = _window_totals(julia, FROZEN_NOW, days=9)
    assert obligations == Decimal("-1825")
    assert inflows == Decimal("1000")
    assert obligations + inflows == Decimal("-825")


def test_each_persona_has_90_days_of_historical_transactions() -> None:
    personas = generate_personas(now=FROZEN_NOW)
    history_start = FROZEN_NOW - timedelta(days=90)

    for persona in personas:
        historical = [
            t for t in persona.transactions if t.occurred_at <= FROZEN_NOW
        ]
        assert len(historical) >= 60, (
            f"{persona.name} has only {len(historical)} historical txs"
        )
        assert all(history_start <= t.occurred_at <= FROZEN_NOW for t in historical)


def test_persona_ids_are_deterministic_across_calls() -> None:
    a = generate_personas(now=FROZEN_NOW)
    b = generate_personas(now=FROZEN_NOW)
    assert sorted(p.id for p in a) == sorted(p.id for p in b)


def test_marias_history_includes_recurring_categories() -> None:
    personas = generate_personas(now=FROZEN_NOW)
    maria = _find_by_business_type(personas, "confeiteira")

    categories = {t.category for t in maria.transactions}
    assert {Category.PIX_IN, Category.DAS, Category.RENT, Category.SUPPLIER} <= categories


def _find_by_business_type(
    personas: list[GeneratedPersona], business_type: str
) -> GeneratedPersona:
    return next(p for p in personas if p.business_type == business_type)


def _window_totals(
    persona: GeneratedPersona, ref: datetime, *, days: int
) -> tuple[Decimal, Decimal]:
    window_end = ref + timedelta(days=days)
    upcoming = [
        t for t in persona.transactions if ref < t.occurred_at <= window_end
    ]
    obligations = sum((t.amount for t in upcoming if t.amount < 0), Decimal(0))
    inflows = sum((t.amount for t in upcoming if t.amount > 0), Decimal(0))
    return obligations, inflows

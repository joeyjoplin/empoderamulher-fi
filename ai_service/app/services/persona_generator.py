"""Pure synthetic-persona generator.

Produces three calibrated personas with 90 days of historical transactions
plus a 9-day forward window for Maria, calibrated for the demo anchor scenario
(R$ 380 cash-flow deficit). No DB I/O — the seeder applies these to the DB.
"""

from __future__ import annotations

import random
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from enum import Enum
from typing import Sequence
from uuid import NAMESPACE_DNS, UUID, uuid5

NAMESPACE = uuid5(NAMESPACE_DNS, "empowerfi.app")


class Category(str, Enum):
    PIX_IN = "pix_in"
    SUPPLIER = "supplier"
    DAS = "das"
    RENT = "rent"
    PERSONAL = "personal"
    EXPECTED_PIX_IN = "expected_pix_in"


@dataclass(frozen=True)
class GeneratedTransaction:
    occurred_at: datetime
    amount: Decimal
    category: Category
    counterparty: str | None
    metadata: dict


@dataclass(frozen=True)
class GeneratedPersona:
    id: UUID
    name: str
    business_type: str
    city: str
    monthly_revenue_avg: Decimal
    stage: int
    wallet_pubkey: str | None
    cnpj_digits: str | None
    transactions: tuple[GeneratedTransaction, ...]


def generate_personas(now: datetime | None = None) -> list[GeneratedPersona]:
    when = now or datetime.now(timezone.utc)
    return [
        _generate_maria(when),
        _generate_ana(when),
        _generate_julia(when),
    ]


def _persona_id(slug: str) -> UUID:
    return uuid5(NAMESPACE, f"persona/{slug}")


def _seeded_rng(slug: str) -> random.Random:
    # Stable, name-based seed so generation is deterministic across runs.
    return random.Random(int.from_bytes(slug.encode(), "little"))


# Stable demo wallet pubkeys per persona. With SOLANA_AIRDROP_BORROWER=true
# the backend generates an ephemeral signer per loan, so these pubkeys are
# logical handles only — they're persisted on each persona row so the
# `/credit/request` route stops 409'ing after a re-seed.
PERSONA_WALLET_PUBKEYS: dict[str, str] = {
    "maria": "BcZmHLn41QZcvEvnmQkbqYz1Jo6iRdy4U3Y8BcwaCZNX",
    "ana": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "julia": "So11111111111111111111111111111111111111112",
}

# Stable demo CNPJs per persona (raw 14 digits, no formatting). The on-chain
# Score PDA is keyed by HMAC-SHA256(SCORE_HMAC_PEPPER, cnpj_digits) — the raw
# CNPJ never appears on-chain (BLUEPRINT §2.5). Maria's value below is the
# DEMO_CNPJ used by the public Score-as-a-Service sandbox UI (TASK 3.5.2).
PERSONA_CNPJ_DIGITS: dict[str, str] = {
    "maria": "12345678000190",
    "ana": "23456789000181",
    "julia": "34567890000172",
}


# --- Maria ---------------------------------------------------------------

def _generate_maria(now: datetime) -> GeneratedPersona:
    rng = _seeded_rng("maria")
    txs: list[GeneratedTransaction] = []

    # 90 days of Pix inflows: confeiteira peaks on weekends.
    for day_offset in range(90, 0, -1):
        day = now - timedelta(days=day_offset)
        is_weekend = day.weekday() >= 5
        n_orders = rng.randint(2, 5) if is_weekend else rng.randint(0, 3)
        for _ in range(n_orders):
            txs.append(
                GeneratedTransaction(
                    occurred_at=day.replace(
                        hour=rng.randint(8, 20),
                        minute=rng.randint(0, 59),
                        second=0,
                        microsecond=0,
                    ),
                    amount=Decimal(rng.randint(30, 90)),
                    category=Category.PIX_IN,
                    counterparty=f"Cliente {rng.randint(1, 50)}",
                    metadata={},
                )
            )

    # Recurring monthly DAS, rent, supplier (3 months back).
    for months_ago in (3, 2, 1):
        base = now - timedelta(days=30 * months_ago)
        txs.append(_obligation(base + timedelta(days=10), Decimal("-75"), Category.DAS, "DAS MEI"))
        txs.append(_obligation(base + timedelta(days=5), Decimal("-700"), Category.RENT, "Aluguel"))
        for offset in (10, 25):
            txs.append(
                _obligation(
                    base + timedelta(days=offset),
                    Decimal("-180"),
                    Category.SUPPLIER,
                    "Atacadão Confeitaria",
                )
            )

    # Anchor scenario: next 9 days, R$ 1,200 obligations + R$ 820 expected
    # inflows = R$ 380 deficit.
    txs.extend(
        [
            _scheduled(
                now + timedelta(days=2),
                Decimal("-425"),
                Category.SUPPLIER,
                "Atacadão Confeitaria",
                tag="upcoming_obligation",
            ),
            _scheduled(
                now + timedelta(days=5),
                Decimal("-75"),
                Category.DAS,
                "DAS MEI",
                tag="upcoming_obligation",
            ),
            _scheduled(
                now + timedelta(days=8),
                Decimal("-700"),
                Category.RENT,
                "Aluguel",
                tag="upcoming_obligation",
            ),
            _scheduled(
                now + timedelta(days=3),
                Decimal("420"),
                Category.EXPECTED_PIX_IN,
                "Cliente recorrente Joana",
                tag="projected_inflow",
            ),
            _scheduled(
                now + timedelta(days=7),
                Decimal("400"),
                Category.EXPECTED_PIX_IN,
                "Cliente recorrente Roberto",
                tag="projected_inflow",
            ),
        ]
    )

    return GeneratedPersona(
        id=_persona_id("maria"),
        name="Maria Silva",
        business_type="confeiteira",
        city="São Paulo",
        monthly_revenue_avg=Decimal("4500.00"),
        stage=2,
        wallet_pubkey=PERSONA_WALLET_PUBKEYS["maria"],
        cnpj_digits=PERSONA_CNPJ_DIGITS["maria"],
        transactions=tuple(txs),
    )


# --- Ana -----------------------------------------------------------------

def _generate_ana(now: datetime) -> GeneratedPersona:
    rng = _seeded_rng("ana")
    txs: list[GeneratedTransaction] = []

    # Marmiteira: weekday-heavy, drops on holidays (modeled as random gaps).
    for day_offset in range(90, 0, -1):
        day = now - timedelta(days=day_offset)
        is_weekday = day.weekday() < 5
        # Simulate occasional holiday/closed days.
        if rng.random() < 0.05:
            continue
        n_orders = rng.randint(3, 6) if is_weekday else rng.randint(0, 2)
        for _ in range(n_orders):
            txs.append(
                GeneratedTransaction(
                    occurred_at=day.replace(
                        hour=rng.randint(11, 14),
                        minute=rng.randint(0, 59),
                        second=0,
                        microsecond=0,
                    ),
                    amount=Decimal(rng.randint(15, 28)),
                    category=Category.PIX_IN,
                    counterparty=f"Cliente Marmita {rng.randint(1, 60)}",
                    metadata={},
                )
            )

    for months_ago in (3, 2, 1):
        base = now - timedelta(days=30 * months_ago)
        txs.append(_obligation(base + timedelta(days=10), Decimal("-75"), Category.DAS, "DAS MEI"))
        txs.append(_obligation(base + timedelta(days=5), Decimal("-500"), Category.RENT, "Aluguel"))
        txs.append(
            _obligation(
                base + timedelta(days=15),
                Decimal("-260"),
                Category.SUPPLIER,
                "Atacadão Refeições",
            )
        )

    # Forward 9-day window: R$ 955 obligations + R$ 700 inflows = R$ 255 deficit.
    # Smaller-tier scenario than Maria's R$ 380 — Ana operates on thinner margins.
    txs.extend(
        [
            _scheduled(
                now + timedelta(days=3),
                Decimal("-380"),
                Category.SUPPLIER,
                "Atacadão Refeições",
                tag="upcoming_obligation",
            ),
            _scheduled(
                now + timedelta(days=5),
                Decimal("-75"),
                Category.DAS,
                "DAS MEI",
                tag="upcoming_obligation",
            ),
            _scheduled(
                now + timedelta(days=7),
                Decimal("-500"),
                Category.RENT,
                "Aluguel",
                tag="upcoming_obligation",
            ),
            _scheduled(
                now + timedelta(days=2),
                Decimal("200"),
                Category.EXPECTED_PIX_IN,
                "Cliente recorrente segunda",
                tag="projected_inflow",
            ),
            _scheduled(
                now + timedelta(days=4),
                Decimal("250"),
                Category.EXPECTED_PIX_IN,
                "Cliente recorrente quarta",
                tag="projected_inflow",
            ),
            _scheduled(
                now + timedelta(days=6),
                Decimal("250"),
                Category.EXPECTED_PIX_IN,
                "Cliente recorrente sexta",
                tag="projected_inflow",
            ),
        ]
    )

    return GeneratedPersona(
        id=_persona_id("ana"),
        name="Ana Souza",
        business_type="marmiteira",
        city="Belo Horizonte",
        monthly_revenue_avg=Decimal("3200.00"),
        stage=1,
        wallet_pubkey=PERSONA_WALLET_PUBKEYS["ana"],
        cnpj_digits=PERSONA_CNPJ_DIGITS["ana"],
        transactions=tuple(txs),
    )


# --- Julia ---------------------------------------------------------------

def _generate_julia(now: datetime) -> GeneratedPersona:
    rng = _seeded_rng("julia")
    txs: list[GeneratedTransaction] = []

    # Doces gourmet: high-ticket, low-volume, with planted anomaly (a recurring
    # client disappears around day 30).
    disappeared_client = "Cliente Buffet Premium"
    for day_offset in range(90, 0, -1):
        day = now - timedelta(days=day_offset)
        n_orders = rng.randint(0, 2)
        for _ in range(n_orders):
            counterparty = (
                disappeared_client
                if (day_offset > 30 and rng.random() < 0.2)
                else f"Cliente Boutique {rng.randint(1, 30)}"
            )
            txs.append(
                GeneratedTransaction(
                    occurred_at=day.replace(
                        hour=rng.randint(9, 19),
                        minute=rng.randint(0, 59),
                        second=0,
                        microsecond=0,
                    ),
                    amount=Decimal(rng.randint(120, 350)),
                    category=Category.PIX_IN,
                    counterparty=counterparty,
                    metadata={},
                )
            )

    for months_ago in (3, 2, 1):
        base = now - timedelta(days=30 * months_ago)
        # Supplier price hike anomaly: last month higher.
        supplier_amount = Decimal("-520") if months_ago == 1 else Decimal("-380")
        txs.append(_obligation(base + timedelta(days=10), Decimal("-75"), Category.DAS, "DAS MEI"))
        txs.append(_obligation(base + timedelta(days=5), Decimal("-1100"), Category.RENT, "Aluguel"))
        txs.append(
            _obligation(
                base + timedelta(days=12),
                supplier_amount,
                Category.SUPPLIER,
                "Distribuidora Gourmet",
                metadata={"price_hike": months_ago == 1},
            )
        )

    # Forward 9-day window: R$ 1,825 obligations + R$ 1,000 inflows = R$ 825 deficit.
    # Larger absolute deficit than Maria/Ana — Julia's revenue scale is higher
    # (R$ 8,200 monthly avg) and the supplier price hike has now landed inside
    # her upcoming window. Demoes that the system adapts the suggested credit
    # amount to the persona's tier rather than offering a one-size-fits-all loan.
    txs.extend(
        [
            _scheduled(
                now + timedelta(days=3),
                Decimal("-650"),
                Category.SUPPLIER,
                "Distribuidora Gourmet",
                tag="upcoming_obligation",
            ),
            _scheduled(
                now + timedelta(days=6),
                Decimal("-75"),
                Category.DAS,
                "DAS MEI",
                tag="upcoming_obligation",
            ),
            _scheduled(
                now + timedelta(days=8),
                Decimal("-1100"),
                Category.RENT,
                "Aluguel",
                tag="upcoming_obligation",
            ),
            _scheduled(
                now + timedelta(days=1),
                Decimal("300"),
                Category.EXPECTED_PIX_IN,
                "Cliente Buffet Premium (retorno)",
                tag="projected_inflow",
            ),
            _scheduled(
                now + timedelta(days=4),
                Decimal("200"),
                Category.EXPECTED_PIX_IN,
                "Cliente Boutique recorrente",
                tag="projected_inflow",
            ),
            _scheduled(
                now + timedelta(days=7),
                Decimal("500"),
                Category.EXPECTED_PIX_IN,
                "Encomenda casamento — Junho",
                tag="projected_inflow",
            ),
        ]
    )

    return GeneratedPersona(
        id=_persona_id("julia"),
        name="Julia Lima",
        business_type="doces_gourmet",
        city="Curitiba",
        monthly_revenue_avg=Decimal("8200.00"),
        stage=4,
        wallet_pubkey=PERSONA_WALLET_PUBKEYS["julia"],
        cnpj_digits=PERSONA_CNPJ_DIGITS["julia"],
        transactions=tuple(txs),
    )


# --- helpers -------------------------------------------------------------

def _obligation(
    when: datetime,
    amount: Decimal,
    category: Category,
    counterparty: str,
    metadata: dict | None = None,
) -> GeneratedTransaction:
    return GeneratedTransaction(
        occurred_at=when,
        amount=amount,
        category=category,
        counterparty=counterparty,
        metadata=metadata or {},
    )


def _scheduled(
    when: datetime,
    amount: Decimal,
    category: Category,
    counterparty: str,
    tag: str,
) -> GeneratedTransaction:
    return GeneratedTransaction(
        occurred_at=when,
        amount=amount,
        category=category,
        counterparty=counterparty,
        metadata={"anchor_scenario": tag},
    )

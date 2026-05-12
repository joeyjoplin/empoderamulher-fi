"""Idempotent persistence of generated personas + transactions.

Re-running the seeder replaces each persona's transactions instead of
appending — so row counts stay constant across invocations.
"""

from __future__ import annotations

from datetime import datetime
from uuid import uuid4

from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.db.models import Persona, Transaction
from app.services.persona_generator import GeneratedPersona, generate_personas


def seed_personas(
    session: Session,
    *,
    now: datetime | None = None,
) -> list[GeneratedPersona]:
    generated = generate_personas(now=now)
    for gp in generated:
        _upsert_persona(session, gp)
    session.commit()
    return generated


def _upsert_persona(session: Session, gp: GeneratedPersona) -> None:
    existing = session.get(Persona, gp.id)
    if existing is None:
        existing = Persona(id=gp.id)
        session.add(existing)

    existing.name = gp.name
    existing.business_type = gp.business_type
    existing.city = gp.city
    existing.monthly_revenue_avg = gp.monthly_revenue_avg
    existing.stage = gp.stage
    existing.wallet_pubkey = gp.wallet_pubkey
    existing.cnpj_digits = gp.cnpj_digits

    # Wipe and re-insert transactions for idempotency.
    session.execute(delete(Transaction).where(Transaction.persona_id == gp.id))
    session.flush()

    for tx in gp.transactions:
        session.add(
            Transaction(
                id=uuid4(),
                persona_id=gp.id,
                occurred_at=tx.occurred_at,
                amount=tx.amount,
                category=tx.category.value,
                counterparty=tx.counterparty,
                tx_metadata=tx.metadata,
            )
        )

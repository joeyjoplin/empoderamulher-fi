from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import DateTime, ForeignKey, JSON, Numeric, String
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy.types import Uuid


class Base(DeclarativeBase):
    pass


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Persona(Base):
    __tablename__ = "personas"

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    business_type: Mapped[str] = mapped_column(String(60))
    city: Mapped[str | None] = mapped_column(String(120), nullable=True)
    monthly_revenue_avg: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    stage: Mapped[int]
    wallet_pubkey: Mapped[str | None] = mapped_column(String(64), nullable=True)
    # Raw 14-digit CNPJ. The on-chain Score PDA is keyed by HMAC of these
    # digits — never persisted on-chain in plaintext (BLUEPRINT §2.5). When
    # null the score service falls back to HMACing the persona UUID, which
    # is the MVP placeholder that predates the CNPJ-keyed flow.
    cnpj_digits: Mapped[str | None] = mapped_column(String(14), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow
    )

    transactions: Mapped[list["Transaction"]] = relationship(
        back_populates="persona",
        cascade="all, delete-orphan",
    )


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    persona_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("personas.id", ondelete="CASCADE"), index=True
    )
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    category: Mapped[str] = mapped_column(String(40))
    counterparty: Mapped[str | None] = mapped_column(String(160), nullable=True)
    tx_metadata: Mapped[dict[str, Any]] = mapped_column(
        "metadata", JSON, default=dict
    )

    persona: Mapped[Persona] = relationship(back_populates="transactions")

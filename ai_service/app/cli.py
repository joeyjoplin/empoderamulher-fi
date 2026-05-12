"""CLI entry point for ai_service operational tasks.

Usage:

    python -m app.cli seed-personas
"""

from __future__ import annotations

import typer
from sqlalchemy import text

from app.db.models import Base
from app.db.session import get_engine, get_session_factory
from app.services.persona_seeder import seed_personas as _seed_personas

cli = typer.Typer(help="EmpowerFI AI service operational commands")


@cli.callback()
def _main() -> None:
    """Root callback so Typer treats this as a multi-command app."""


def _ensure_persona_columns(engine) -> None:
    """Idempotent ALTERs for columns added after the initial create_all.

    `Base.metadata.create_all` only creates missing TABLES, never missing
    COLUMNS. Each schema addition that needs to land on existing personas
    rows goes here until the project adopts a real migration framework.
    """
    with engine.begin() as conn:
        conn.execute(
            text(
                "ALTER TABLE personas "
                "ADD COLUMN IF NOT EXISTS cnpj_digits varchar(14)"
            )
        )


@cli.command("seed-personas")
def seed_personas_command() -> None:
    """Generate and persist the 3 demo personas (idempotent)."""
    engine = get_engine()
    Base.metadata.create_all(engine)
    _ensure_persona_columns(engine)

    factory = get_session_factory()
    with factory() as session:
        generated = _seed_personas(session)

    typer.echo(f"Seeded {len(generated)} personas.")
    for p in generated:
        typer.echo(
            f"  - {p.name} ({p.business_type}, {p.city}) — "
            f"{len(p.transactions)} transactions"
        )


if __name__ == "__main__":
    cli()

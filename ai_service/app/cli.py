"""CLI entry point for ai_service operational tasks.

Usage:

    python -m app.cli seed-personas
"""

from __future__ import annotations

import typer

from app.db.models import Base
from app.db.session import get_engine, get_session_factory
from app.services.persona_seeder import seed_personas as _seed_personas

cli = typer.Typer(help="EmpowerFI AI service operational commands")


@cli.callback()
def _main() -> None:
    """Root callback so Typer treats this as a multi-command app."""


@cli.command("seed-personas")
def seed_personas_command() -> None:
    """Generate and persist the 3 demo personas (idempotent)."""
    engine = get_engine()
    Base.metadata.create_all(engine)

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

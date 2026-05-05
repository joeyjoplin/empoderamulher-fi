from datetime import datetime, timezone
from typing import Iterator

from sqlalchemy.orm import Session

from app.config import get_settings
from app.core.anthropic_client import AnthropicClient
from app.db.session import get_session_factory

_client: AnthropicClient | None = None


def get_anthropic_client() -> AnthropicClient:
    """FastAPI dependency: returns a process-wide AnthropicClient.

    Tests override this via `app.dependency_overrides`.
    """
    global _client
    if _client is None:
        _client = AnthropicClient(get_settings())
    return _client


def get_db_session() -> Iterator[Session]:
    """FastAPI dependency: yields a SQLAlchemy session per request."""
    factory = get_session_factory()
    with factory() as session:
        yield session


def get_now() -> datetime:
    """FastAPI dependency: current UTC time. Tests override this to freeze the
    clock against the seeded persona's calibrated obligation calendar."""
    return datetime.now(timezone.utc)

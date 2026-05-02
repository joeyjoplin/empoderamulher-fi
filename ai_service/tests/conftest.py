import os
from typing import AsyncIterator
from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient

# Ensure the app reads from a deterministic, fake env in tests.
os.environ.setdefault("ANTHROPIC_API_KEY", "test-key")
os.environ.setdefault("LOG_LEVEL", "warning")

from app.api.deps import get_anthropic_client  # noqa: E402
from app.main import create_app  # noqa: E402


@pytest.fixture
def fake_anthropic() -> AsyncMock:
    client = AsyncMock()
    client.complete = AsyncMock(return_value="Hello, Maria. How can I help today?")
    return client


@pytest.fixture
def client(fake_anthropic: AsyncMock) -> AsyncIterator[TestClient]:
    app = create_app()
    app.dependency_overrides[get_anthropic_client] = lambda: fake_anthropic
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

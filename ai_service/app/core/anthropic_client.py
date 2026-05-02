from typing import Sequence

from anthropic import AsyncAnthropic

from app.config import Settings
from app.core.schemas import ChatMessage


class AnthropicClient:
    """Thin async wrapper around the Anthropic SDK with retry/timeout.

    Centralizes model name, max_tokens, and other defaults so callers only
    have to think about prompt + history.
    """

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._client = AsyncAnthropic(
            api_key=settings.anthropic_api_key,
            timeout=settings.anthropic_timeout_seconds,
            max_retries=settings.anthropic_max_retries,
        )

    async def complete(
        self,
        system: str,
        message: str,
        history: Sequence[ChatMessage] = (),
    ) -> str:
        messages = [
            {"role": m.role, "content": m.content} for m in history
        ]
        messages.append({"role": "user", "content": message})

        result = await self._client.messages.create(
            model=self._settings.anthropic_model,
            max_tokens=self._settings.anthropic_max_tokens,
            system=system,
            messages=messages,
        )

        for block in result.content:
            if getattr(block, "type", None) == "text":
                return str(block.text)
        return ""

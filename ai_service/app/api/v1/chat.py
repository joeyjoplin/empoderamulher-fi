from fastapi import APIRouter, Depends

from app.api.deps import get_anthropic_client
from app.core.anthropic_client import AnthropicClient
from app.core.prompts.system import SYSTEM_PROMPT
from app.core.schemas import ChatRequest, ChatResponse

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("", response_model=ChatResponse)
async def chat(
    payload: ChatRequest,
    anthropic: AnthropicClient = Depends(get_anthropic_client),
) -> ChatResponse:
    text = await anthropic.complete(
        system=SYSTEM_PROMPT,
        message=payload.message,
        history=payload.history,
    )
    return ChatResponse(response=text)

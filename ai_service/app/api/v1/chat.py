from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_anthropic_client, get_db_session, get_now
from app.core.anthropic_client import AnthropicClient
from app.core.prompts.chat import CHAT_SYSTEM_TEMPLATE
from app.core.schemas import ChatRequest, ChatResponse
from app.services.chat_actions import pick_actions
from app.services.persona_context import (
    PersonaNotFound,
    build_persona_context,
)

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("", response_model=ChatResponse)
async def chat(
    payload: ChatRequest,
    anthropic: AnthropicClient = Depends(get_anthropic_client),
    session: Session = Depends(get_db_session),
    now: datetime = Depends(get_now),
) -> ChatResponse:
    try:
        context = build_persona_context(session, payload.persona_id, now=now)
    except PersonaNotFound:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="persona_not_found"
        )

    system_prompt = CHAT_SYSTEM_TEMPLATE.format(
        first_name=context.first_name,
        persona_context=context.render(),
    )

    text = await anthropic.complete(
        system=system_prompt,
        message=payload.message,
        history=payload.history,
    )

    return ChatResponse(
        response=text,
        suggested_actions=pick_actions(payload.message, context),
    )

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_anthropic_client, get_db_session, get_now
from app.core.anthropic_client import AnthropicClient
from app.core.schemas import CashFlowAlertRequest, CashFlowAlertResponse
from app.services.insight_engine import PersonaNotFound, detect_cash_flow_gap

router = APIRouter(prefix="/insights", tags=["insights"])


@router.post("/cash_flow_alert", response_model=CashFlowAlertResponse)
async def cash_flow_alert(
    payload: CashFlowAlertRequest,
    session: Session = Depends(get_db_session),
    anthropic: AnthropicClient = Depends(get_anthropic_client),
    now: datetime = Depends(get_now),
) -> CashFlowAlertResponse:
    try:
        return await detect_cash_flow_gap(
            session,
            payload.persona_id,
            lookahead_days=payload.lookahead_days,
            now=now,
            anthropic=anthropic,
        )
    except PersonaNotFound:
        raise HTTPException(
            status_code=404,
            detail={"code": "persona_not_found", "persona_id": str(payload.persona_id)},
        )

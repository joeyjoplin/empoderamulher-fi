from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db_session, get_now
from app.core.schemas import ScoreCalculateRequest, ScoreCalculateResponse
from app.services.score_calculator import PersonaNotFound, calculate_score

router = APIRouter(prefix="/score", tags=["score"])


@router.post("/calculate", response_model=ScoreCalculateResponse)
async def calculate(
    payload: ScoreCalculateRequest,
    session: Session = Depends(get_db_session),
    now: datetime = Depends(get_now),
) -> ScoreCalculateResponse:
    try:
        return calculate_score(session, payload.persona_id, now=now)
    except PersonaNotFound:
        raise HTTPException(
            status_code=404,
            detail={"code": "persona_not_found", "persona_id": str(payload.persona_id)},
        )

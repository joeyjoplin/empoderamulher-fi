from decimal import Decimal
from typing import Annotated, Literal, Union
from uuid import UUID

from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: str = Field(pattern="^(user|assistant)$")
    content: str = Field(min_length=1)


class ChatRequest(BaseModel):
    persona_id: UUID
    message: str = Field(min_length=1, max_length=4_000)
    history: list[ChatMessage] = Field(default_factory=list)


SuggestedActionTarget = Literal[
    "dashboard", "credit", "score", "marketplace", "insight"
]


class SuggestedAction(BaseModel):
    label: str = Field(min_length=1, max_length=80)
    target: SuggestedActionTarget


class ChatResponse(BaseModel):
    response: str
    suggested_actions: list[SuggestedAction] = Field(default_factory=list)


# --- Insights ----------------------------------------------------------

class CashFlowAlertRequest(BaseModel):
    persona_id: UUID
    lookahead_days: int = Field(default=9, ge=1, le=90)


class AnticipationSuggestion(BaseModel):
    type: Literal["anticipation"] = "anticipation"
    estimated_cost: Decimal
    available_amount: Decimal


class SupplierRenegotiationSuggestion(BaseModel):
    type: Literal["supplier_renegotiation"] = "supplier_renegotiation"
    supplier_name: str
    feasibility: Literal["low", "medium", "high"]


class EmpowerfiCreditSuggestion(BaseModel):
    type: Literal["empowerfi_credit"] = "empowerfi_credit"
    amount: Decimal
    monthly_rate: float
    vs_overdraft_savings: Decimal


Suggestion = Annotated[
    Union[
        AnticipationSuggestion,
        SupplierRenegotiationSuggestion,
        EmpowerfiCreditSuggestion,
    ],
    Field(discriminator="type"),
]


class CashFlowAlertResponse(BaseModel):
    alert: bool
    deficit_amount: Decimal
    deficit_window_days: int
    natural_language_alert: str
    suggestions: list[Suggestion]


# --- Score -------------------------------------------------------------

class ScoreCalculateRequest(BaseModel):
    persona_id: UUID


class ScoreBreakdownPayload(BaseModel):
    discipline: int = Field(ge=0, le=250)
    organization: int = Field(ge=0, le=250)
    cash_flow: int = Field(ge=0, le=250)
    engagement: int = Field(ge=0, le=250)


class ScoreCalculateResponse(BaseModel):
    persona_id: UUID
    total: int = Field(ge=0, le=1000)
    breakdown: ScoreBreakdownPayload

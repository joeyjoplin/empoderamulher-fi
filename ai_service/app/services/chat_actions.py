"""Pick suggested follow-up actions for a chat reply.

Rules-based to keep the choice deterministic at hackathon scale: the LLM
already wrote the prose, we just attach the most relevant 1-2 navigation
shortcuts based on what the user asked and what the persona context shows.
"""

from __future__ import annotations

from app.core.schemas import SuggestedAction
from app.services.persona_context import PersonaContext

_KEYWORDS = {
    "credit": ("empréstimo", "credito", "crédito", "antecip", "dívida", "divida"),
    "score": ("pontua", "score", "histórico", "historico"),
    "marketplace": ("marketplace", "fornecedor", "embalagem", "vender", "comprar"),
    "insight": ("alerta", "fluxo", "obrigaç", "obrigações", "pagar"),
    "dashboard": ("resumo", "como está", "como estou", "saldo", "panorama"),
}


def pick_actions(
    user_message: str, context: PersonaContext
) -> list[SuggestedAction]:
    msg = user_message.lower()
    actions: list[SuggestedAction] = []

    if _matches(msg, "credit") or context.upcoming_obligations > (
        context.upcoming_inflows
    ):
        actions.append(
            SuggestedAction(label="Ver oferta de crédito", target="credit")
        )

    if _matches(msg, "score"):
        actions.append(
            SuggestedAction(label="Ver minha pontuação", target="score")
        )

    if _matches(msg, "marketplace"):
        actions.append(
            SuggestedAction(label="Abrir marketplace", target="marketplace")
        )

    if _matches(msg, "insight"):
        actions.append(
            SuggestedAction(label="Ver alerta de fluxo", target="insight")
        )

    if not actions and _matches(msg, "dashboard"):
        actions.append(
            SuggestedAction(label="Voltar ao dashboard", target="dashboard")
        )

    return actions[:2]


def _matches(message: str, key: str) -> bool:
    return any(k in message for k in _KEYWORDS[key])

/**
 * Maps backend error codes → friendly Portuguese sentences.
 *
 * The backend already returns structured `{ code, message }` envelopes,
 * but the message is engineer-shaped ("invalid_input: principal must be
 * positive"). The user-facing surface should never see those — this
 * helper renders something the entrepreneur can act on.
 *
 * Unknown codes fall through to a generic "let's try again" line so we
 * never leak raw codes when a new error path appears.
 */

import { ApiError } from "@/api/client";

const FRIENDLY_BY_CODE: Record<string, string> = {
  invalid_input:
    "Algumas informações ficaram fora do esperado. Confira e tente de novo.",
  unauthorized: "Sua sessão expirou. Faça login novamente.",
  forbidden: "Esta ação não está disponível para o seu perfil.",
  persona_not_found: "Não conseguimos identificar sua conta. Tente recarregar a página.",
  wallet_not_linked:
    "Sua carteira ainda não está conectada à blockchain. Volte ao painel e refaça o cadastro.",
  self_hire_forbidden: "Você não pode contratar a si mesma — escolha outra empreendedora.",
  ai_service_error:
    "A assistente está temporariamente indisponível. Tente novamente em alguns segundos.",
  solana_rpc_error:
    "A rede da blockchain está instável. Aguarde um momento e tente de novo.",
  marketplace_service_unconfigured:
    "O marketplace está em manutenção. Volte em instantes.",
  loan_service_unconfigured:
    "O serviço de crédito está em manutenção. Volte em instantes.",
  score_service_unconfigured:
    "O cálculo de pontuação está em manutenção. Volte em instantes.",
  rate_limited: "Muitas tentativas seguidas. Aguarde um minuto e tente novamente.",
};

const GENERIC_FALLBACK =
  "Algo não saiu como esperávamos. Pode tentar de novo em instantes?";

export function friendlyError(err: unknown): string {
  if (err instanceof ApiError) {
    const mapped = FRIENDLY_BY_CODE[err.code];
    if (mapped) return mapped;
  }
  return GENERIC_FALLBACK;
}

/**
 * Behavioral score boundary.
 *
 * `ScoreService` hides the AI HTTP call and the on-chain attest/fetch behind
 * a single interface so the HTTP routes never touch Anchor or the AI service
 * directly. This keeps the routes trivially testable with a mock and lets the
 * real Solana glue evolve independently.
 *
 * The on-chain `Score` PDA is keyed by `HMAC-SHA256(SCORE_HMAC_PEPPER, key)`
 * — so the raw key (CNPJ in production, persona UUID during the MVP) never
 * appears on-chain. See BLUEPRINT §2.5.
 */

export type ScoreBreakdown = {
  discipline: number;
  organization: number;
  cashFlow: number;
  engagement: number;
};

export type OnChainScore = {
  total: number;
  breakdown: ScoreBreakdown;
  lastUpdatedAt: number;
  attestor: string;
  onChainAddress: string;
};

export type AttestedScore = OnChainScore & {
  signature: string;
};

export type ScoreLookupParams = {
  personaId: string;
};

export interface ScoreService {
  fetchOnChainForPersona(params: ScoreLookupParams): Promise<OnChainScore | null>;
  attestForPersona(params: ScoreLookupParams): Promise<AttestedScore>;
}

export class ScoreServiceError extends Error {
  override readonly name = "ScoreServiceError";
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status = 502) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export class UnconfiguredScoreService implements ScoreService {
  async fetchOnChainForPersona(): Promise<OnChainScore | null> {
    throw new ScoreServiceError(
      "score_service_unconfigured",
      "ScoreService not configured — set SOLANA_RPC_URL + SOLANA_PAYER_SECRET_KEY + SCORE_HMAC_PEPPER",
    );
  }

  async attestForPersona(): Promise<AttestedScore> {
    throw new ScoreServiceError(
      "score_service_unconfigured",
      "ScoreService not configured — set SOLANA_RPC_URL + SOLANA_PAYER_SECRET_KEY + SCORE_HMAC_PEPPER",
    );
  }
}

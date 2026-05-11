/**
 * Public Score-as-a-Service boundary.
 *
 * Distinct from `ScoreService` (which is persona-keyed and runs the AI →
 * attest pipeline) because the public API is consumed by third-party
 * lenders who only know a CNPJ. They never see persona UUIDs and never
 * trigger attestations — they only read whatever the EmpowerFI backend
 * has already attested on-chain.
 *
 * The PDA is keyed by `HMAC-SHA256(SCORE_HMAC_PEPPER, cnpj_digits)` so the
 * raw CNPJ never appears on-chain. See BLUEPRINT §2.5.
 */

import {
  cnpjHmac,
  fetchScore,
  scorePda,
  type SolanaClient,
} from "./solana/index.js";

export type PublicScoreResponse = {
  totalScore: number;
  breakdown: {
    discipline: number;
    organization: number;
    cashFlow: number;
    engagement: number;
  };
  lastUpdatedAt: number;
  attestor: string;
  onChainAddress: string;
};

export interface PublicScoreService {
  /**
   * Look up an on-chain score by raw 14-digit CNPJ. Returns `null` if no
   * score has been attested for the corresponding HMAC.
   */
  lookupByCnpj(cnpjDigits: string): Promise<PublicScoreResponse | null>;
}

export class PublicScoreServiceError extends Error {
  override readonly name = "PublicScoreServiceError";
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status = 502) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export class OrchestratedPublicScoreService implements PublicScoreService {
  constructor(
    private readonly opts: {
      client: SolanaClient;
      hmacPepper: string;
    },
  ) {}

  async lookupByCnpj(cnpjDigits: string): Promise<PublicScoreResponse | null> {
    if (!/^\d{14}$/.test(cnpjDigits)) {
      // Defence in depth: the route Zod-validates the input but the service
      // shouldn't trust it. Throw a typed error the route maps to 422.
      throw new PublicScoreServiceError(
        "invalid_cnpj",
        "CNPJ must be 14 digits",
        422,
      );
    }

    const hmac = cnpjHmac(cnpjDigits, this.opts.hmacPepper);
    let result;
    try {
      result = await fetchScore(this.opts.client, hmac);
    } catch (err) {
      throw new PublicScoreServiceError(
        "solana_rpc_error",
        err instanceof Error ? err.message : "fetch_score failed",
      );
    }
    if (result === null) return null;
    const [pda] = scorePda(this.opts.client.programIds.score, hmac);
    return {
      totalScore: result.totalScore,
      breakdown: {
        discipline: result.disciplineScore,
        organization: result.organizationScore,
        cashFlow: result.cashFlowScore,
        engagement: result.engagementScore,
      },
      lastUpdatedAt: result.lastUpdatedAt,
      attestor: result.attestor,
      onChainAddress: pda.toBase58(),
    };
  }
}

export class UnconfiguredPublicScoreService implements PublicScoreService {
  async lookupByCnpj(): Promise<PublicScoreResponse | null> {
    throw new PublicScoreServiceError(
      "score_service_unconfigured",
      "PublicScoreService not configured — set SOLANA_RPC_URL + SOLANA_PAYER_SECRET_KEY + SCORE_HMAC_PEPPER",
    );
  }
}

import { z } from "zod";

import {
  attestScore,
  cnpjHmac,
  fetchScore,
  scorePda,
  type SolanaClient,
} from "./solana/index.js";
import {
  ScoreServiceError,
  type AttestedScore,
  type OnChainScore,
  type ScoreLookupParams,
  type ScoreService,
} from "./score_service.js";

/**
 * Real `ScoreService`: orchestrates AI score calculation → on-chain attest →
 * read-back from the on-chain PDA. The persona's CNPJ-equivalent identifier
 * is its UUID (MVP placeholder; real Open Finance CNPJ post-hackathon).
 */
export class OrchestratedScoreService implements ScoreService {
  constructor(
    private readonly opts: {
      client: SolanaClient;
      aiServiceUrl: string;
      hmacPepper: string;
      fetchImpl?: typeof fetch;
    },
  ) {}

  async fetchOnChainForPersona(
    params: ScoreLookupParams,
  ): Promise<OnChainScore | null> {
    const hmac = this.deriveHmac(params);
    let result;
    try {
      result = await fetchScore(this.opts.client, hmac);
    } catch (err) {
      throw new ScoreServiceError(
        "solana_rpc_error",
        err instanceof Error ? err.message : "fetch_score failed",
      );
    }
    if (result === null) return null;
    const [pda] = scorePda(this.opts.client.programIds.score, hmac);
    return {
      total: result.totalScore,
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

  async attestForPersona(params: ScoreLookupParams): Promise<AttestedScore> {
    const breakdown = await this.requestAiBreakdown(params.personaId);
    const hmac = this.deriveHmac(params);

    let signature: string;
    let scorePdaAddress: string;
    try {
      const r = await attestScore(this.opts.client, {
        cnpjHmac: hmac,
        total: breakdown.total,
        breakdown: {
          discipline: breakdown.breakdown.discipline,
          organization: breakdown.breakdown.organization,
          cashFlow: breakdown.breakdown.cashFlow,
          engagement: breakdown.breakdown.engagement,
        },
      });
      signature = r.signature;
      scorePdaAddress = r.score;
    } catch (err) {
      throw new ScoreServiceError(
        "attest_score_failed",
        err instanceof Error ? err.message : "attest_score failed",
      );
    }

    return {
      total: breakdown.total,
      breakdown: breakdown.breakdown,
      lastUpdatedAt: Math.floor(Date.now() / 1000),
      attestor: this.opts.client.payer.publicKey.toBase58(),
      onChainAddress: scorePdaAddress,
      signature,
    };
  }

  private deriveHmac(params: ScoreLookupParams): Uint8Array {
    // Prefer real CNPJ digits when present — that's what the public
    // Score-as-a-Service API HMACs over, and is the only way the dashboard
    // and the third-party lender API land on the same on-chain PDA.
    if (params.cnpjDigits && /^\d{14}$/.test(params.cnpjDigits)) {
      return cnpjHmac(params.cnpjDigits, this.opts.hmacPepper);
    }
    // MVP fallback: HMAC the persona UUID. Pass raw bytes to skip the
    // wrapper's 14-digit check.
    return cnpjHmac(Buffer.from(params.personaId, "utf8"), this.opts.hmacPepper);
  }

  private async requestAiBreakdown(personaId: string): Promise<{
    total: number;
    breakdown: {
      discipline: number;
      organization: number;
      cashFlow: number;
      engagement: number;
    };
  }> {
    const fetchImpl = this.opts.fetchImpl ?? globalThis.fetch;
    const url = `${this.opts.aiServiceUrl.replace(/\/$/, "")}/api/v1/score/calculate`;
    let res: Response;
    try {
      res = await fetchImpl(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ persona_id: personaId }),
      });
    } catch (err) {
      throw new ScoreServiceError(
        "ai_service_unavailable",
        err instanceof Error ? err.message : "AI service unreachable",
      );
    }
    if (!res.ok) {
      throw new ScoreServiceError(
        "ai_service_error",
        `AI service returned HTTP ${res.status}`,
      );
    }
    const json = (await res.json()) as unknown;
    const parsed = aiScoreSchema.safeParse(json);
    if (!parsed.success) {
      throw new ScoreServiceError(
        "ai_service_error",
        "AI score response failed schema validation",
      );
    }
    return {
      total: parsed.data.total,
      breakdown: {
        discipline: parsed.data.breakdown.discipline,
        organization: parsed.data.breakdown.organization,
        cashFlow: parsed.data.breakdown.cash_flow,
        engagement: parsed.data.breakdown.engagement,
      },
    };
  }
}

const aiScoreSchema = z.object({
  persona_id: z.string(),
  total: z.number().int().min(0).max(1000),
  breakdown: z.object({
    discipline: z.number().int().min(0).max(250),
    organization: z.number().int().min(0).max(250),
    cash_flow: z.number().int().min(0).max(250),
    engagement: z.number().int().min(0).max(250),
  }),
});

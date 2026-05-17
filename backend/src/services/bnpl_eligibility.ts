/**
 * BNPL eligibility boundary. Reads the persona's on-chain behavioural score
 * and maps it to a pricing tier. Returns an explicit `ineligible` envelope
 * (rather than throwing) when the persona has no attested score yet — that's
 * a normal UX state the frontend renders as "complete the onboarding to
 * unlock parcelado".
 */

import { tierFromTotalScore, type ScoreTier } from "./bnpl_pricing.js";
import type { ScoreService } from "./score_service.js";

export type EligibilityParams = {
  personaId: string;
  cnpjDigits: string | null;
};

export type Eligibility =
  | { eligible: true; tier: ScoreTier; totalScore: number }
  | {
      eligible: false;
      reason: "no_score_on_chain" | "score_service_error" | "score_service_unconfigured";
      message: string;
    };

export interface BnplEligibilityService {
  evaluate(params: EligibilityParams): Promise<Eligibility>;
}

export class ScoreBackedEligibilityService implements BnplEligibilityService {
  constructor(private readonly scores: ScoreService) {}

  async evaluate(params: EligibilityParams): Promise<Eligibility> {
    let onChain;
    try {
      onChain = await this.scores.fetchOnChainForPersona({
        personaId: params.personaId,
        cnpjDigits: params.cnpjDigits,
      });
    } catch (err) {
      const code =
        err instanceof Error && "code" in err && typeof (err as { code: unknown }).code === "string"
          ? (err as { code: string }).code
          : "score_service_error";
      if (code === "score_service_unconfigured") {
        return {
          eligible: false,
          reason: "score_service_unconfigured",
          message: "Score service is not configured on this environment",
        };
      }
      return {
        eligible: false,
        reason: "score_service_error",
        message: err instanceof Error ? err.message : "score lookup failed",
      };
    }
    if (!onChain) {
      return {
        eligible: false,
        reason: "no_score_on_chain",
        message: "Persona has no attested behavioural score yet",
      };
    }
    return {
      eligible: true,
      tier: tierFromTotalScore(onChain.total),
      totalScore: onChain.total,
    };
  }
}

/**
 * Demo / test fallback: always returns the same tier. Wired in by `server.ts`
 * when `SCORE_HMAC_PEPPER` is missing, so a developer running the backend
 * without the Solana env can still exercise the BNPL flow end-to-end.
 */
export class FixedTierEligibilityService implements BnplEligibilityService {
  constructor(private readonly tier: ScoreTier = "B") {}

  async evaluate(): Promise<Eligibility> {
    return { eligible: true, tier: this.tier, totalScore: 720 };
  }
}

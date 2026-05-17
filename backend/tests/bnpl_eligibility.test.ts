import { describe, expect, it, vi } from "vitest";

import {
  FixedTierEligibilityService,
  ScoreBackedEligibilityService,
} from "../src/services/bnpl_eligibility.js";
import { ScoreServiceError, type ScoreService } from "../src/services/score_service.js";

const ELIGIBILITY_PARAMS = {
  personaId: "11111111-1111-1111-1111-111111111111",
  cnpjDigits: null,
};

describe("ScoreBackedEligibilityService", () => {
  it("maps an attested score to a tier", async () => {
    const scores: ScoreService = {
      fetchOnChainForPersona: vi.fn().mockResolvedValue({
        total: 760,
        breakdown: { discipline: 200, organization: 180, cashFlow: 200, engagement: 180 },
        lastUpdatedAt: 1714000000,
        attestor: "AttestorPubkey",
        onChainAddress: "ScorePdaPubkey",
      }),
      attestForPersona: vi.fn(),
    };
    const svc = new ScoreBackedEligibilityService(scores);
    const result = await svc.evaluate(ELIGIBILITY_PARAMS);
    expect(result).toEqual({ eligible: true, tier: "B", totalScore: 760 });
  });

  it("returns ineligible when no score is on-chain yet", async () => {
    const scores: ScoreService = {
      fetchOnChainForPersona: vi.fn().mockResolvedValue(null),
      attestForPersona: vi.fn(),
    };
    const svc = new ScoreBackedEligibilityService(scores);
    const result = await svc.evaluate(ELIGIBILITY_PARAMS);
    expect(result.eligible).toBe(false);
    if (!result.eligible) {
      expect(result.reason).toBe("no_score_on_chain");
    }
  });

  it("unwraps score_service_unconfigured into a typed ineligibility", async () => {
    const scores: ScoreService = {
      fetchOnChainForPersona: vi
        .fn()
        .mockRejectedValue(new ScoreServiceError("score_service_unconfigured", "boom")),
      attestForPersona: vi.fn(),
    };
    const svc = new ScoreBackedEligibilityService(scores);
    const result = await svc.evaluate(ELIGIBILITY_PARAMS);
    expect(result.eligible).toBe(false);
    if (!result.eligible) {
      expect(result.reason).toBe("score_service_unconfigured");
    }
  });
});

describe("FixedTierEligibilityService", () => {
  it("always returns its configured tier", async () => {
    const svc = new FixedTierEligibilityService("C");
    const result = await svc.evaluate();
    expect(result).toEqual({ eligible: true, tier: "C", totalScore: 720 });
  });
});

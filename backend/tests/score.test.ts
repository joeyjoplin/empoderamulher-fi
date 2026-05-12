import { describe, expect, it, vi } from "vitest";

import { createApp } from "../src/app.js";
import type { InsightsService } from "../src/services/insights.js";
import type { LoanRepository, LoanService } from "../src/services/loans.js";
import { InMemoryPersonaService } from "../src/services/persona.js";
import type {
  AttestedScore,
  OnChainScore,
  ScoreService,
} from "../src/services/score_service.js";
import type { Persona } from "../src/types/domain.js";

type ErrorBody = { error: { code: string; message?: string } };
type DataBody<T> = { data: T };

const MARIA: Persona = {
  id: "0e6c7f0b-7c3a-5f3a-9c4f-1f5b4d2e6a11",
  name: "Maria Silva",
  businessType: "confeiteira",
  city: "São Paulo",
  monthlyRevenueAvg: "4500.00",
  stage: 2,
  walletPubkey: "BcZmHLn41QZcvEvnmQkbqYz1Jo6iRdy4U3Y8BcwaCZNX",
  cnpjDigits: null,
};

const FAKE_ON_CHAIN: OnChainScore = {
  total: 612,
  breakdown: {
    discipline: 158,
    organization: 142,
    cashFlow: 167,
    engagement: 145,
  },
  lastUpdatedAt: 1714579800,
  attestor: "AttestorPubkeyBase58",
  onChainAddress: "ScorePdaBase58",
};

function buildApp(score: ScoreService) {
  const insights: InsightsService = { getProactiveAlert: vi.fn() };
  const loans: LoanService = { requestAndDisburse: vi.fn() };
  const repo: LoanRepository = { save: vi.fn() };
  return createApp({
    personaService: new InMemoryPersonaService([MARIA]),
    insightsService: insights,
    loanService: loans,
    loanRepository: repo,
    scoreService: score,
    publicScoreService: { lookupByCnpj: vi.fn() },
    publicScoreApiKeys: [],
    marketplaceService: { hireProvider: vi.fn() },
    marketplaceRepository: { save: vi.fn(), countHiresByBuyer: vi.fn() },
    impactRepository: { recentEvents: vi.fn().mockResolvedValue([]) },
    chatService: { sendMessage: vi.fn() },
    authMode: "mock",
  });
}

describe("GET /score/me", () => {
  it("returns 401 without X-Persona-Id", async () => {
    const score: ScoreService = {
      fetchOnChainForPersona: vi.fn(),
      attestForPersona: vi.fn(),
    };
    const app = buildApp(score);
    const res = await app.request("/score/me");
    expect(res.status).toBe(401);
    expect(score.fetchOnChainForPersona).not.toHaveBeenCalled();
  });

  it("returns 200 with the on-chain score for the authenticated persona", async () => {
    const fetchOnChainForPersona = vi.fn().mockResolvedValue(FAKE_ON_CHAIN);
    const score: ScoreService = {
      fetchOnChainForPersona,
      attestForPersona: vi.fn(),
    };
    const app = buildApp(score);
    const res = await app.request("/score/me", {
      headers: { "X-Persona-Id": MARIA.id },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as DataBody<OnChainScore>;
    expect(body.data).toEqual(FAKE_ON_CHAIN);
    expect(fetchOnChainForPersona).toHaveBeenCalledWith({
      personaId: MARIA.id,
      cnpjDigits: MARIA.cnpjDigits,
    });
  });

  it("returns 404 when no score has been attested yet", async () => {
    const score: ScoreService = {
      fetchOnChainForPersona: vi.fn().mockResolvedValue(null),
      attestForPersona: vi.fn(),
    };
    const app = buildApp(score);
    const res = await app.request("/score/me", {
      headers: { "X-Persona-Id": MARIA.id },
    });
    expect(res.status).toBe(404);
    const body = (await res.json()) as ErrorBody;
    expect(body.error.code).toBe("score_not_attested");
  });

  it("returns 502 when the on-chain fetch fails", async () => {
    const score: ScoreService = {
      fetchOnChainForPersona: vi
        .fn()
        .mockRejectedValue(
          Object.assign(new Error("rpc down"), { code: "solana_rpc_error" }),
        ),
      attestForPersona: vi.fn(),
    };
    const app = buildApp(score);
    const res = await app.request("/score/me", {
      headers: { "X-Persona-Id": MARIA.id },
    });
    expect(res.status).toBe(502);
    const body = (await res.json()) as ErrorBody;
    expect(body.error.code).toBe("solana_rpc_error");
  });
});

describe("POST /score/attest", () => {
  const FAKE_ATTEST: AttestedScore = {
    ...FAKE_ON_CHAIN,
    signature: "5xrSigAttest1111111111111111111111111111111111111111",
  };

  it("returns 401 without X-Persona-Id", async () => {
    const score: ScoreService = {
      fetchOnChainForPersona: vi.fn(),
      attestForPersona: vi.fn(),
    };
    const app = buildApp(score);
    const res = await app.request("/score/attest", { method: "POST" });
    expect(res.status).toBe(401);
    expect(score.attestForPersona).not.toHaveBeenCalled();
  });

  it("returns 200 with the attested score on the happy path", async () => {
    const attestForPersona = vi.fn().mockResolvedValue(FAKE_ATTEST);
    const score: ScoreService = {
      fetchOnChainForPersona: vi.fn(),
      attestForPersona,
    };
    const app = buildApp(score);
    const res = await app.request("/score/attest", {
      method: "POST",
      headers: { "X-Persona-Id": MARIA.id },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as DataBody<AttestedScore>;
    expect(body.data).toEqual(FAKE_ATTEST);
    expect(attestForPersona).toHaveBeenCalledWith({
      personaId: MARIA.id,
      cnpjDigits: MARIA.cnpjDigits,
    });
  });

  it("returns 502 when attestation fails", async () => {
    const score: ScoreService = {
      fetchOnChainForPersona: vi.fn(),
      attestForPersona: vi
        .fn()
        .mockRejectedValue(
          Object.assign(new Error("attest failed"), {
            code: "attest_score_failed",
          }),
        ),
    };
    const app = buildApp(score);
    const res = await app.request("/score/attest", {
      method: "POST",
      headers: { "X-Persona-Id": MARIA.id },
    });
    expect(res.status).toBe(502);
    const body = (await res.json()) as ErrorBody;
    expect(body.error.code).toBe("attest_score_failed");
  });
});

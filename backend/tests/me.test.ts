import { describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.js";
import { InMemoryPersonaService } from "../src/services/persona.js";
import type { Persona } from "../src/types/domain.js";

type ErrorBody = { error: { code: string; message?: string } };
type DataBody = { data: Persona };

const MARIA: Persona = {
  id: "0e6c7f0b-7c3a-5f3a-9c4f-1f5b4d2e6a11",
  name: "Maria Silva",
  businessType: "confeiteira",
  city: "São Paulo",
  monthlyRevenueAvg: "4500.00",
  stage: 2,
  walletPubkey: null,
  cnpjDigits: null,
};

function buildApp() {
  return createApp({
    personaService: new InMemoryPersonaService([MARIA]),
    insightsService: { getProactiveAlert: vi.fn() },
    loanService: { requestAndDisburse: vi.fn() },
    loanRepository: { save: vi.fn() },
    scoreService: {
      fetchOnChainForPersona: vi.fn(),
      attestForPersona: vi.fn(),
    },
    publicScoreService: { lookupByCnpj: vi.fn() },
    publicScoreApiKeys: [],
    marketplaceService: { hireProvider: vi.fn(), quoteBnpl: vi.fn(), hireBnpl: vi.fn(), recordInstallment: vi.fn() },
      bnplEligibility: { evaluate: vi.fn() },
    marketplaceRepository: { save: vi.fn(), countHiresByBuyer: vi.fn(), saveBnplPlan: vi.fn(), findBnplPlanById: vi.fn(), updateBnplPlan: vi.fn(), listBnplPlansByBuyer: vi.fn().mockResolvedValue([]) },
    impactRepository: { recentEvents: vi.fn().mockResolvedValue([]) },
    chatService: { sendMessage: vi.fn() },
    authMode: "mock",
  });
}

describe("GET /me (mock auth)", () => {
  it("returns 401 when X-Persona-Id header is missing", async () => {
    const app = buildApp();
    const res = await app.request("/me");
    expect(res.status).toBe(401);
    const body = (await res.json()) as ErrorBody;
    expect(body.error.code).toBe("missing_persona_id");
  });

  it("returns 401 when X-Persona-Id is not a valid UUID", async () => {
    const app = buildApp();
    const res = await app.request("/me", {
      headers: { "X-Persona-Id": "not-a-uuid" },
    });
    expect(res.status).toBe(401);
    const body = (await res.json()) as ErrorBody;
    expect(body.error.code).toBe("invalid_persona_id");
  });

  it("returns 404 when persona is not in the DB", async () => {
    const app = buildApp();
    const res = await app.request("/me", {
      headers: { "X-Persona-Id": "11111111-1111-1111-1111-111111111111" },
    });
    expect(res.status).toBe(404);
    const body = (await res.json()) as ErrorBody;
    expect(body.error.code).toBe("persona_not_found");
  });

  it("returns 200 with persona data when X-Persona-Id matches", async () => {
    const app = buildApp();
    const res = await app.request("/me", {
      headers: { "X-Persona-Id": MARIA.id },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as DataBody;
    expect(body.data).toEqual(MARIA);
  });

  it("propagates X-Request-Id header back on the response", async () => {
    const app = buildApp();
    const res = await app.request("/me", {
      headers: {
        "X-Persona-Id": MARIA.id,
        "X-Request-Id": "req-123",
      },
    });
    expect(res.headers.get("X-Request-Id")).toBe("req-123");
  });
});

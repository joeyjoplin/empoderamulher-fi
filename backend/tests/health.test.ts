import { describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.js";
import { InMemoryPersonaService } from "../src/services/persona.js";

describe("GET /health", () => {
  it("returns 200 with status ok", async () => {
    const app = createApp({
      personaService: new InMemoryPersonaService([]),
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
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });
});

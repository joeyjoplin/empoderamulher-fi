import { describe, expect, it, vi } from "vitest";

import { createApp } from "../src/app.js";
import type { InsightsService, ProactiveAlert } from "../src/services/insights.js";
import { InMemoryPersonaService } from "../src/services/persona.js";
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
  walletPubkey: null,
  cnpjDigits: null,
};

const ALERT_FOR_MARIA: ProactiveAlert = {
  alert: true,
  deficitAmount: 380,
  deficitWindowDays: 9,
  naturalLanguageAlert:
    "Maria, em 9 dias você terá um déficit de R$ 380 considerando suas próximas obrigações.",
  suggestions: [
    {
      type: "anticipation",
      estimatedCost: 18,
      availableAmount: 380,
    },
    {
      type: "supplier_renegotiation",
      supplierName: "Atacadão",
      feasibility: "high",
    },
    {
      type: "empowerfi_credit",
      amount: 380,
      monthlyRate: 0.04,
      vsOverdraftSavings: 20,
    },
  ],
};

function buildApp(insights: InsightsService) {
  return createApp({
    personaService: new InMemoryPersonaService([MARIA]),
    insightsService: insights,
    loanService: { requestAndDisburse: vi.fn() },
    loanRepository: { save: vi.fn() },
    scoreService: {
      fetchOnChainForPersona: vi.fn(),
      attestForPersona: vi.fn(),
    },
    publicScoreService: { lookupByCnpj: vi.fn() },
    publicScoreApiKeys: [],
    marketplaceService: { hireProvider: vi.fn() },
    marketplaceRepository: { save: vi.fn(), countHiresByBuyer: vi.fn() },
    impactRepository: { recentEvents: vi.fn().mockResolvedValue([]) },
    chatService: { sendMessage: vi.fn() },
    authMode: "mock",
  });
}

describe("GET /insights/proactive", () => {
  it("returns 401 when X-Persona-Id is missing", async () => {
    const insights: InsightsService = {
      getProactiveAlert: vi.fn(),
    };
    const app = buildApp(insights);
    const res = await app.request("/insights/proactive");
    expect(res.status).toBe(401);
    const body = (await res.json()) as ErrorBody;
    expect(body.error.code).toBe("missing_persona_id");
    expect(insights.getProactiveAlert).not.toHaveBeenCalled();
  });

  it("returns the proactive alert for the authenticated persona", async () => {
    const insights: InsightsService = {
      getProactiveAlert: vi.fn().mockResolvedValue(ALERT_FOR_MARIA),
    };
    const app = buildApp(insights);
    const res = await app.request("/insights/proactive", {
      headers: { "X-Persona-Id": MARIA.id },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as DataBody<ProactiveAlert>;
    expect(body.data).toEqual(ALERT_FOR_MARIA);
    expect(insights.getProactiveAlert).toHaveBeenCalledWith({
      personaId: MARIA.id,
      lookaheadDays: 9,
    });
  });

  it("returns 200 with alert=false when there is no projected deficit", async () => {
    const noAlert: ProactiveAlert = {
      alert: false,
      deficitAmount: 0,
      deficitWindowDays: 9,
      naturalLanguageAlert: "Tudo certo por aqui.",
      suggestions: [],
    };
    const insights: InsightsService = {
      getProactiveAlert: vi.fn().mockResolvedValue(noAlert),
    };
    const app = buildApp(insights);
    const res = await app.request("/insights/proactive", {
      headers: { "X-Persona-Id": MARIA.id },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as DataBody<ProactiveAlert>;
    expect(body.data.alert).toBe(false);
    expect(body.data.suggestions).toEqual([]);
  });

  it("returns 502 when the AI service is unreachable", async () => {
    const insights: InsightsService = {
      getProactiveAlert: vi
        .fn()
        .mockRejectedValue(
          Object.assign(new Error("ai service down"), {
            code: "ai_service_unavailable",
          }),
        ),
    };
    const app = buildApp(insights);
    const res = await app.request("/insights/proactive", {
      headers: { "X-Persona-Id": MARIA.id },
    });
    expect(res.status).toBe(502);
    const body = (await res.json()) as ErrorBody;
    expect(body.error.code).toBe("ai_service_unavailable");
  });
});

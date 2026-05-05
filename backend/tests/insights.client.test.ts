import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HttpInsightsService } from "../src/services/insights.js";

describe("HttpInsightsService.getProactiveAlert", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("POSTs to {AI_SERVICE_URL}/api/v1/insights/cash_flow_alert with the persona id and parses the response", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          alert: true,
          deficit_amount: "380",
          deficit_window_days: 9,
          natural_language_alert: "Maria, atenção…",
          suggestions: [
            {
              type: "anticipation",
              estimated_cost: "18",
              available_amount: "380",
            },
            {
              type: "supplier_renegotiation",
              supplier_name: "Atacadão",
              feasibility: "high",
            },
            {
              type: "empowerfi_credit",
              amount: "380",
              monthly_rate: 0.04,
              vs_overdraft_savings: "20",
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const svc = new HttpInsightsService({
      baseUrl: "https://ai.example",
      fetch: fetchMock,
    });
    const result = await svc.getProactiveAlert({
      personaId: "0e6c7f0b-7c3a-5f3a-9c4f-1f5b4d2e6a11",
      lookaheadDays: 9,
    });

    expect(result).toEqual({
      alert: true,
      deficitAmount: 380,
      deficitWindowDays: 9,
      naturalLanguageAlert: "Maria, atenção…",
      suggestions: [
        { type: "anticipation", estimatedCost: 18, availableAmount: 380 },
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
    });

    const call = fetchMock.mock.calls[0];
    expect(call?.[0]).toBe("https://ai.example/api/v1/insights/cash_flow_alert");
    const init = call?.[1] as RequestInit;
    expect(init.method).toBe("POST");
    const headers = new Headers(init.headers);
    expect(headers.get("content-type")).toBe("application/json");
    expect(JSON.parse(String(init.body))).toEqual({
      persona_id: "0e6c7f0b-7c3a-5f3a-9c4f-1f5b4d2e6a11",
      lookahead_days: 9,
    });
  });

  it("throws an ai_service_unavailable error when fetch rejects", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("network down"));
    const svc = new HttpInsightsService({
      baseUrl: "https://ai.example",
      fetch: fetchMock,
    });
    await expect(
      svc.getProactiveAlert({
        personaId: "0e6c7f0b-7c3a-5f3a-9c4f-1f5b4d2e6a11",
        lookaheadDays: 9,
      }),
    ).rejects.toMatchObject({ code: "ai_service_unavailable" });
  });

  it("throws ai_service_error when the AI service returns non-2xx", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: "boom" }), { status: 500 }),
    );
    const svc = new HttpInsightsService({
      baseUrl: "https://ai.example",
      fetch: fetchMock,
    });
    await expect(
      svc.getProactiveAlert({
        personaId: "0e6c7f0b-7c3a-5f3a-9c4f-1f5b4d2e6a11",
        lookaheadDays: 9,
      }),
    ).rejects.toMatchObject({ code: "ai_service_error" });
  });
});

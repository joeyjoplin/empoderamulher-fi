import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createApiClient } from "./client";
import { fetchImpactDashboard } from "./impact";

describe("fetchImpactDashboard", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("GETs /api/impact/dashboard and returns the unwrapped envelope", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: {
            metrics: {
              activeEntrepreneurs: 1247,
              interestSavedCents: 18432000,
              debtsRenegotiatedCents: 9250000,
              marketplaceTransactions: 318,
              monthOverMonth: {
                entrepreneurs: 8,
                interest: 12,
                debts: 15,
                marketplace: 22,
              },
              poolTotalCents: 240000000,
              yieldDistributedCents: 1864000,
              qualifiedInvestors: 47,
              cityDistribution: [],
            },
            recentTransactions: [
              {
                id: "Sig1:0",
                type: "marketplace_payment",
                description: "Pagamento de R$ 80,00 no marketplace",
                amountCents: 8000,
                signature: "Sig1",
                blockTime: "2026-05-12T12:00:00.000Z",
              },
            ],
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const client = createApiClient({ baseUrl: "https://api.example" });
    const result = await fetchImpactDashboard(client);

    expect(result.metrics.activeEntrepreneurs).toBe(1247);
    expect(result.recentTransactions).toHaveLength(1);
    expect(result.recentTransactions[0]?.signature).toBe("Sig1");

    const call = fetchMock.mock.calls[0];
    expect(String(call?.[0])).toContain("/api/impact/dashboard");
    expect((call?.[1] as RequestInit).method).toBe("GET");
  });
});

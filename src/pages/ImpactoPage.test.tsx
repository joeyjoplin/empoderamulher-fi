import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiClientProvider } from "@/api/ApiClientProvider";
import { createApiClient } from "@/api/client";
import { PersonaProvider } from "@/context/PersonaContext";

import ImpactoPage from "./ImpactoPage";

function renderPage() {
  const client = createApiClient({ baseUrl: "https://api.example" });
  return render(
    <PersonaProvider>
      <MemoryRouter>
        <ApiClientProvider value={client}>
          <ImpactoPage />
        </ApiClientProvider>
      </MemoryRouter>
    </PersonaProvider>,
  );
}

const SUCCESS_BODY = {
  data: {
    metrics: {
      activeEntrepreneurs: 1247,
      interestSavedCents: 18432000,
      debtsRenegotiatedCents: 9250000,
      marketplaceTransactions: 319,
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
        id: "SigPay:0",
        type: "marketplace_payment",
        description: "Pagamento de R$ 80,00 no marketplace",
        amountCents: 8000,
        signature: "5xrSigPay111111111111111111111111111111111111111111111111111",
        blockTime: new Date(Date.now() - 2 * 60_000).toISOString(),
      },
    ],
  },
};

describe("<ImpactoPage />", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the on-chain transaction list with a devnet Explorer link when the API returns data", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(SUCCESS_BODY), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    renderPage();

    await waitFor(() =>
      expect(
        screen.getByText("Pagamento de R$ 80,00 no marketplace"),
      ).toBeInTheDocument(),
    );
    const link = screen
      .getAllByRole("link")
      .find((a) => a.getAttribute("href")?.includes("explorer.solana.com/tx/"));
    expect(link?.getAttribute("href")).toBe(
      "https://explorer.solana.com/tx/5xrSigPay111111111111111111111111111111111111111111111111111?cluster=devnet",
    );
  });

  it("renders the empty-state copy when the indexer has no relevant events yet", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: { ...SUCCESS_BODY.data, recentTransactions: [] },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    renderPage();

    await waitFor(() =>
      expect(
        screen.getByText(/aguardando a próxima transação on-chain/i),
      ).toBeInTheDocument(),
    );
  });

  it("falls back to local mocked metrics if the dashboard endpoint fails", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network down"));

    renderPage();

    // Header always renders, regardless of API state.
    expect(screen.getByText("Impacto EmpowerFI")).toBeInTheDocument();
    // Mocked metrics still render via the FALLBACK_DASHBOARD constant.
    await waitFor(() => {
      expect(
        screen.getByText(/aguardando a próxima transação on-chain/i),
      ).toBeInTheDocument();
    });
  });
});

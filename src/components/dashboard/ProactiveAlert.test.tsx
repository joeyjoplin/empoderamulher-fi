import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiClientProvider } from "../../api/ApiClientProvider";
import { createApiClient } from "../../api/client";
import { ProactiveAlert } from "./ProactiveAlert";

function renderWithClient() {
  const client = createApiClient({
    baseUrl: "https://api.example",
    personaId: "0e6c7f0b-7c3a-5f3a-9c4f-1f5b4d2e6a11",
  });
  return render(
    <ApiClientProvider value={client}>
      <MemoryRouter>
        <ProactiveAlert />
      </MemoryRouter>
    </ApiClientProvider>,
  );
}

describe("<ProactiveAlert />", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the AI-generated alert message and three suggestions", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: {
            alert: true,
            deficitAmount: 380,
            deficitWindowDays: 9,
            naturalLanguageAlert:
              "Maria, em 9 dias você terá um déficit de R$ 380.",
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
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    renderWithClient();

    expect(
      await screen.findByText(/em 9 dias você terá um déficit de R\$ 380/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Antecipar recebíveis/i)).toBeInTheDocument();
    expect(screen.getByText(/Renegociar com .*Atacadão/i)).toBeInTheDocument();
    const creditLink = screen.getByRole("link", { name: /Crédito EmpowerFI/i });
    expect(creditLink).toBeInTheDocument();
    expect(creditLink.getAttribute("href")).toMatch(
      /\/insights\/credito\?.*amount=380.*monthlyRate=0\.04/,
    );
  });

  it("renders nothing when there is no projected deficit", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: {
            alert: false,
            deficitAmount: 0,
            deficitWindowDays: 9,
            naturalLanguageAlert: "Tudo certo.",
            suggestions: [],
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const { container } = renderWithClient();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await waitFor(() => expect(container.querySelector("article")).toBeNull());
  });
});

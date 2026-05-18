import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiClientProvider } from "../../api/ApiClientProvider";
import { createApiClient } from "../../api/client";
import { BnplActivePlansCard } from "./BnplActivePlansCard";

function renderCard() {
  const client = createApiClient({
    baseUrl: "https://api.example",
    personaId: "0e6c7f0b-7c3a-5f3a-9c4f-1f5b4d2e6a11",
  });
  return render(
    <ApiClientProvider value={client}>
      <MemoryRouter>
        <BnplActivePlansCard />
      </MemoryRouter>
    </ApiClientProvider>,
  );
}

const FUTURE_EPOCH = Math.floor(Date.now() / 1000) + 30 * 86_400;

function makePlan(
  overrides: Partial<{
    planId: string;
    status: "active" | "completed";
    paidInstallments: number;
    installmentCount: number;
    installmentCents: number;
    firstDueAt: number;
  }> = {},
) {
  return {
    planId: overrides.planId ?? "PlanPda111",
    requestAddress: "RequestPda111",
    buyerPersonaId: "0e6c7f0b-7c3a-5f3a-9c4f-1f5b4d2e6a11",
    providerPersonaId: "1f7d8e1c-8d4b-6e4b-0d5f-2e6c5d3f7b22",
    buyerPubkey: "BuyerPub",
    providerPubkey: "ProviderPub",
    nonce: "1",
    principalCents: 8_000,
    totalRepayableCents: 8_640,
    installmentCount: overrides.installmentCount ?? 2,
    installmentCents: overrides.installmentCents ?? 4_320,
    interestRateBps: 400,
    paidInstallments: overrides.paidInstallments ?? 0,
    status: overrides.status ?? "active",
    category: "supplies" as const,
    firstDueAt: overrides.firstDueAt ?? FUTURE_EPOCH,
    memo: "Insumos atelier",
    createdAt: "2026-05-17T00:00:00Z",
    signatures: { createPlan: "sigCreate", paySupplier: "sigPay", installments: [] },
  };
}

describe("<BnplActivePlansCard />", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders nothing when the buyer has no active plans", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: { plans: [] } }), { status: 200 }),
    );
    const { container } = renderCard();
    await waitFor(() => {
      // After the loading skeleton resolves, the card collapses to render nothing.
      expect(
        screen.queryByText(/Carregando seus parcelamentos/),
      ).not.toBeInTheDocument();
    });
    expect(container.textContent).toBe("");
  });

  it("renders the active plan with count badge + next-installment line", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: {
            plans: [
              makePlan({ installmentCount: 3, paidInstallments: 1, installmentCents: 2_987 }),
            ],
          },
        }),
        { status: 200 },
      ),
    );
    renderCard();

    await screen.findByText(/Parcelas BNPL/);
    expect(screen.getByText(/1 ativo$/)).toBeInTheDocument();
    expect(screen.getByText(/Próxima parcela/)).toBeInTheDocument();
    expect(screen.getByText(/Parcela 2\/3/)).toBeInTheDocument();
    expect(screen.getByText(/R\$\s*29,87/)).toBeInTheDocument();
  });

  it("filters out completed plans before counting/sorting", async () => {
    const sooner = FUTURE_EPOCH - 5 * 86_400;
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: {
            plans: [
              // Completed plan — must be ignored entirely.
              makePlan({ planId: "Plan-done", status: "completed", paidInstallments: 2 }),
              // Active plan, due later.
              makePlan({ planId: "Plan-later" }),
              // Active plan, due sooner → should be the "next" pick.
              makePlan({ planId: "Plan-sooner", firstDueAt: sooner }),
            ],
          },
        }),
        { status: 200 },
      ),
    );
    renderCard();
    await screen.findByText(/Parcelas BNPL/);
    // Badge counts only ACTIVE plans (2/3 here).
    expect(screen.getByText(/2 ativos$/)).toBeInTheDocument();
  });

  it("posts the next installment on the demo button click and refreshes", async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: { plans: [makePlan({ paidInstallments: 0 })] },
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              planId: "PlanPda111",
              installmentIndex: 0,
              paidInstallments: 1,
              installmentCount: 2,
              status: "active",
              signature: "sigInstall0",
            },
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: { plans: [makePlan({ paidInstallments: 1 })] },
          }),
          { status: 200 },
        ),
      );

    renderCard();
    const btn = await screen.findByRole("button", {
      name: /Demo: pagar próxima parcela/,
    });
    fireEvent.click(btn);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });
    const [, postInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(postInit.method).toBe("POST");
    const body = JSON.parse(postInit.body as string);
    expect(body).toEqual({ installmentIndex: 0 });
    // After re-fetch, the row reflects paid_installments: 1 → "Parcela 2/2".
    await screen.findByText(/Parcela 2\/2/);
  });
});

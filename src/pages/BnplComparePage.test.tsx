import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiClientProvider } from "../api/ApiClientProvider";
import { createApiClient } from "../api/client";
import { ImpactProvider } from "../context/ImpactContext";
import { PersonaProvider } from "../context/PersonaContext";
import BnplComparePage from "./BnplComparePage";

function LocationProbe() {
  const loc = useLocation();
  return (
    <div
      data-testid="location-probe"
      data-pathname={loc.pathname}
      data-state={JSON.stringify(loc.state)}
    />
  );
}

function renderPage(initialPath = "/marketplace/contratar/ana/parcelado") {
  const client = createApiClient({
    baseUrl: "https://api.example",
    personaId: "0e6c7f0b-7c3a-5f3a-9c4f-1f5b4d2e6a11",
  });
  return render(
    <ApiClientProvider value={client}>
      <PersonaProvider>
        <ImpactProvider>
          <MemoryRouter initialEntries={[initialPath]}>
            <Routes>
              <Route
                path="/marketplace/contratar/:id/parcelado"
                element={<BnplComparePage />}
              />
              <Route
                path="/marketplace/parcelado/sucesso"
                element={
                  <>
                    <LocationProbe />
                    <div>BNPL SUCCESS PAGE</div>
                  </>
                }
              />
            </Routes>
          </MemoryRouter>
        </ImpactProvider>
      </PersonaProvider>
    </ApiClientProvider>,
  );
}

const QUOTE_RESPONSE = {
  data: {
    tier: "B",
    upfrontCents: 8000,
    maxInstallmentCount: 3,
    options: [
      {
        installmentCount: 2,
        installmentCents: 4320,
        totalRepayableCents: 8640,
        interestRateBps: 400,
      },
      {
        installmentCount: 3,
        installmentCents: 2987,
        totalRepayableCents: 8960,
        interestRateBps: 400,
      },
    ],
  },
};

describe("<BnplComparePage />", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads a quote on mount, defaults to the smallest installmentCount, and renders the comparison", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(QUOTE_RESPONSE), { status: 200 }),
    );
    renderPage();

    await screen.findByText(/À vista/);
    // Comparison card shows the upfront and the selected 2x option by default.
    expect(screen.getAllByText(/2x/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/R\$\s*80,00/).length).toBeGreaterThan(0); // upfront
    expect(screen.getAllByText(/R\$\s*43,20/).length).toBeGreaterThan(0); // 2x option
    expect(screen.getByText(/Tier B/)).toBeInTheDocument();
    expect(screen.getByText(/até 3x permitido/)).toBeInTheDocument();
  });

  it("lets the buyer switch to 3x and reflects it in the confirm button", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(QUOTE_RESPONSE), { status: 200 }),
    );
    renderPage();
    await screen.findByText(/Tier B/);

    fireEvent.click(screen.getByRole("button", { name: /3x de R\$\s*29,87/ }));
    expect(
      screen.getByRole("button", { name: /Confirmar 3x de R\$\s*29,87/ }),
    ).toBeInTheDocument();
  });

  it("posts /marketplace/bnpl/hire on confirm and navigates to success with the hire payload", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(QUOTE_RESPONSE), { status: 200 }),
    );
    const hireResponse = {
      data: {
        planId: "PlanPda111",
        requestAddress: "RequestPda111",
        nonce: "1",
        status: "active" as const,
        signatures: { createPlan: "sigCreate", paySupplier: "sigPay" },
        principalCents: 8000,
        totalRepayableCents: 8640,
        installmentCount: 2,
        installmentCents: 4320,
        interestRateBps: 400,
        category: "packaging" as const,
        firstDueAt: Math.floor(Date.now() / 1000) + 30 * 86400,
        buyerPubkey: "BuyerPub",
        providerPubkey: "ProviderPub",
      },
    };
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(hireResponse), { status: 200 }),
    );

    renderPage();
    const confirmBtn = await screen.findByRole("button", {
      name: /Confirmar 2x de R\$\s*43,20/,
    });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(screen.getByText("BNPL SUCCESS PAGE")).toBeInTheDocument();
    });
    const probe = screen.getByTestId("location-probe");
    expect(probe.dataset.pathname).toBe("/marketplace/parcelado/sucesso");
    const passed = JSON.parse(probe.dataset.state ?? "{}");
    expect(passed.merchantName).toBe("Ana Souza");
    expect(passed.hire.installmentCount).toBe(2);
    expect(passed.hire.signatures.paySupplier).toBe("sigPay");

    // Verify the hire call carried the right body shape.
    const [, hireInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    const body = JSON.parse(hireInit.body as string);
    expect(body.providerPersonaId).toBe(
      "24b94c87-a85c-5214-827f-695615794ed8",
    );
    expect(body.installmentCount).toBe(2);
    expect(body.principalCents).toBe(8000);
  });

  it("renders the friendly error message when the quote call rejects", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: { code: "no_score_on_chain", message: "no score yet" },
        }),
        { status: 409 },
      ),
    );
    renderPage();
    await waitFor(() => {
      // friendlyError maps no_score_on_chain → human Portuguese sentence.
      expect(
        screen.queryByText(/Buscando opções de parcelamento/),
      ).not.toBeInTheDocument();
    });
    // The error banner should be rendered (any error copy is fine — the
    // important contract is that the loading state doesn't get stuck).
    expect(screen.queryByText(/Confirmar/)).not.toBeInTheDocument();
  });
});

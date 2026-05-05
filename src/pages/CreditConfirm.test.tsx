import { render, screen, waitFor } from "@testing-library/react";
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiClientProvider } from "../api/ApiClientProvider";
import { createApiClient } from "../api/client";
import { PersonaProvider } from "../context/PersonaContext";
import CreditConfirm from "./CreditConfirm";

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

function renderConfirm(initialEntry: string) {
  const client = createApiClient({
    baseUrl: "https://api.example",
    personaId: "0e6c7f0b-7c3a-5f3a-9c4f-1f5b4d2e6a11",
  });
  return render(
    <ApiClientProvider value={client}>
      <PersonaProvider>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route path="/credit/confirm" element={<CreditConfirm />} />
            <Route
              path="/credit/success"
              element={
                <>
                  <LocationProbe />
                  <div>SUCCESS PAGE</div>
                </>
              }
            />
          </Routes>
        </MemoryRouter>
      </PersonaProvider>
    </ApiClientProvider>,
  );
}

describe("<CreditConfirm />", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls POST /credit/request with the URL params and navigates to success on resolve", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: {
            loanId: "1714000000000",
            loanAddress: "LoanPdaAddressBase58",
            status: "disbursed",
            signatures: {
              request: "sigReq",
              approve: "sigApr",
              disburse: "sigDis",
            },
            principalCents: 38000,
            termMonths: 1,
            interestRateBps: 400,
            borrowerPubkey: "BorrowerKeyBase58",
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    renderConfirm("/credit/confirm?amount=380&termMonths=1&monthlyRate=0.04");

    await waitFor(() =>
      expect(screen.getByTestId("location-probe").getAttribute("data-pathname"))
        .toBe("/credit/success"),
    );

    const state = JSON.parse(
      screen.getByTestId("location-probe").getAttribute("data-state") ?? "null",
    );
    expect(state.loan.signatures.disburse).toBe("sigDis");
    expect(state.loan.principalCents).toBe(38000);

    const call = fetchMock.mock.calls[0];
    expect(JSON.parse(String((call?.[1] as RequestInit).body))).toEqual({
      amountCents: 38000,
      termMonths: 1,
      interestRateBps: 400,
    });
  });

  it("renders an error state when the backend fails", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: { code: "solana_rpc_error", message: "rpc down" },
        }),
        { status: 502, headers: { "content-type": "application/json" } },
      ),
    );

    renderConfirm("/credit/confirm?amount=380&termMonths=1&monthlyRate=0.04");

    expect(
      await screen.findByText(/algo deu errado/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/tentar novamente/i)).toBeInTheDocument();
  });
});

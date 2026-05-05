import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { PersonaProvider } from "../context/PersonaContext";
import CreditSuccess from "./CreditSuccess";
import type { DisbursedLoan } from "../api/credit";

const FAKE_LOAN: DisbursedLoan = {
  loanId: "1714000000000",
  loanAddress: "LoanPdaAddressBase58",
  status: "disbursed",
  signatures: {
    request: "sigReq",
    approve: "sigApr",
    disburse: "5xrSigDisburse",
  },
  principalCents: 38000,
  termMonths: 1,
  interestRateBps: 400,
  borrowerPubkey: "BorrowerKeyBase58",
};

function renderSuccess(state: unknown) {
  return render(
    <PersonaProvider>
      <MemoryRouter
        initialEntries={[{ pathname: "/credit/success", state }]}
      >
        <Routes>
          <Route path="/credit/success" element={<CreditSuccess />} />
        </Routes>
      </MemoryRouter>
    </PersonaProvider>,
  );
}

describe("<CreditSuccess />", () => {
  it("links the disburse signature to Solana Explorer (devnet)", () => {
    renderSuccess({ loan: FAKE_LOAN, amount: 380 });
    const link = screen.getByRole("link", { name: /transação na blockchain/i });
    expect(link.getAttribute("href")).toBe(
      "https://explorer.solana.com/tx/5xrSigDisburse?cluster=devnet",
    );
  });

  it("falls back to legacy mock copy when no loan state is present", () => {
    renderSuccess(null);
    expect(screen.getAllByText(/R\$\s*380,00/i).length).toBeGreaterThan(0);
    // Without a loan, the explorer link is absent.
    expect(
      screen.queryByRole("link", { name: /transação na blockchain/i }),
    ).toBeNull();
  });
});

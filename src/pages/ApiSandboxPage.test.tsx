import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ApiSandboxPage from "./ApiSandboxPage";

function renderPage() {
  return render(
    <MemoryRouter>
      <ApiSandboxPage />
    </MemoryRouter>,
  );
}

describe("<ApiSandboxPage />", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the score breakdown when the API returns 200", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: {
            total_score: 612,
            breakdown: {
              discipline: 158,
              organization: 142,
              cash_flow: 167,
              engagement: 145,
            },
            last_updated_at: 1714579800,
            attestor: "AttestorPubkeyBase58",
            on_chain_address: "ScorePdaBase58",
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /consultar pontuação/i }));

    await waitFor(() =>
      expect(screen.getByText("612")).toBeInTheDocument(),
    );
    expect(screen.getByText("Disciplina")).toBeInTheDocument();
    expect(screen.getByText("158")).toBeInTheDocument();
    // The PDA link points at the devnet explorer. Querying by href is more
    // robust than by accessible name (the visible text is shortened with
    // an ellipsis, so a substring match on the full pubkey would fail).
    const links = screen
      .getAllByRole("link")
      .filter((a) =>
        a
          .getAttribute("href")
          ?.includes("explorer.solana.com/address/ScorePdaBase58"),
      );
    expect(links).toHaveLength(1);
    expect(links[0]?.getAttribute("href")).toBe(
      "https://explorer.solana.com/address/ScorePdaBase58?cluster=devnet",
    );
  });

  it("renders the friendly 401 copy when the API key is rejected", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: { code: "invalid_api_key", message: "API key not recognised" },
        }),
        { status: 401, headers: { "content-type": "application/json" } },
      ),
    );

    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /consultar pontuação/i }));

    expect(
      await screen.findByText(/chave de api inválida/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/use uma das chaves demo/i),
    ).toBeInTheDocument();
  });

  it("renders the friendly 404 copy when no score exists for the CNPJ", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: {
            code: "score_not_attested",
            message: "no on-chain score found",
          },
        }),
        { status: 404, headers: { "content-type": "application/json" } },
      ),
    );

    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /consultar pontuação/i }));

    expect(
      await screen.findByText(/ainda não há pontuação on-chain/i),
    ).toBeInTheDocument();
  });

  it("rebuilds the cURL snippet when the CNPJ input changes", async () => {
    const { container } = renderPage();
    const cnpjInput = screen.getByLabelText("CNPJ") as HTMLInputElement;

    fireEvent.change(cnpjInput, { target: { value: "98765432000110" } });

    // The cURL is rendered inside <pre><code>…</code></pre> as a single text
    // node. Querying the <code> element by tag is more robust than text-node
    // matching across whitespace boundaries.
    await waitFor(() => {
      const code = container.querySelector("pre code");
      expect(code?.textContent ?? "").toContain(
        "/api/v1/score/98765432000110",
      );
    });
    const code = container.querySelector("pre code");
    expect(code?.textContent ?? "").toMatch(/Authorization: Bearer /);
  });
});

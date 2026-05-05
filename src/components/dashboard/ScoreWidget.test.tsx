import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiClientProvider } from "../../api/ApiClientProvider";
import { createApiClient } from "../../api/client";
import { ScoreWidget } from "./ScoreWidget";

function renderWidget() {
  const client = createApiClient({
    baseUrl: "https://api.example",
    personaId: "0e6c7f0b-7c3a-5f3a-9c4f-1f5b4d2e6a11",
  });
  return render(
    <ApiClientProvider value={client}>
      <MemoryRouter>
        <ScoreWidget />
      </MemoryRouter>
    </ApiClientProvider>,
  );
}

describe("<ScoreWidget />", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the on-chain total once loaded", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: {
            total: 612,
            breakdown: {
              discipline: 158,
              organization: 142,
              cashFlow: 167,
              engagement: 145,
            },
            lastUpdatedAt: 1714579800,
            attestor: "AttestorPubkeyBase58",
            onChainAddress: "ScorePdaBase58",
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    renderWidget();
    await waitFor(() =>
      expect(screen.getByTestId("score-total")).toHaveTextContent("612"),
    );
  });

  it("shows the not-attested fallback when the backend returns 404", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: { code: "score_not_attested", message: "no Score PDA" },
        }),
        { status: 404, headers: { "content-type": "application/json" } },
      ),
    );

    renderWidget();
    expect(
      await screen.findByText(/score em construção/i),
    ).toBeInTheDocument();
  });
});

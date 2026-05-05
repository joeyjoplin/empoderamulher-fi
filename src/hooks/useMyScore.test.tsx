import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiClientProvider } from "../api/ApiClientProvider";
import { createApiClient } from "../api/client";
import { useMyScore } from "./useMyScore";

describe("useMyScore", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function wrapper(children: ReactNode) {
    const client = createApiClient({
      baseUrl: "https://api.example",
      personaId: "0e6c7f0b-7c3a-5f3a-9c4f-1f5b4d2e6a11",
    });
    return <ApiClientProvider value={client}>{children}</ApiClientProvider>;
  }

  it("transitions from loading to success with the on-chain score", async () => {
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

    const { result } = renderHook(() => useMyScore(), {
      wrapper: ({ children }) => wrapper(children),
    });
    expect(result.current.status).toBe("loading");
    await waitFor(() => expect(result.current.status).toBe("success"));
    if (result.current.status === "success") {
      expect(result.current.data.total).toBe(612);
    }
  });

  it("transitions to error state when the backend returns 404", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: { code: "score_not_attested", message: "no Score PDA" },
        }),
        { status: 404, headers: { "content-type": "application/json" } },
      ),
    );

    const { result } = renderHook(() => useMyScore(), {
      wrapper: ({ children }) => wrapper(children),
    });
    await waitFor(() => expect(result.current.status).toBe("error"));
    if (result.current.status === "error") {
      expect(result.current.error.code).toBe("score_not_attested");
    }
  });
});

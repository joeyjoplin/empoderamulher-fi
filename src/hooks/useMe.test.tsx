import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiClientProvider } from "../api/ApiClientProvider";
import { createApiClient } from "../api/client";
import { useMe } from "./useMe";
import type { ReactNode } from "react";

describe("useMe", () => {
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

  it("transitions from loading to data", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: {
            id: "0e6c7f0b-7c3a-5f3a-9c4f-1f5b4d2e6a11",
            name: "Maria Silva",
            businessType: "confeiteira",
            city: "São Paulo",
            monthlyRevenueAvg: "4500.00",
            stage: 2,
            walletPubkey: null,
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const { result } = renderHook(() => useMe(), {
      wrapper: ({ children }) => wrapper(children),
    });
    expect(result.current.status).toBe("loading");

    await waitFor(() => expect(result.current.status).toBe("success"));
    if (result.current.status === "success") {
      expect(result.current.data.name).toBe("Maria Silva");
    }
  });

  it("transitions to error state when the backend returns an error envelope", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: { code: "persona_not_found", message: "missing" },
        }),
        { status: 404, headers: { "content-type": "application/json" } },
      ),
    );

    const { result } = renderHook(() => useMe(), {
      wrapper: ({ children }) => wrapper(children),
    });

    await waitFor(() => expect(result.current.status).toBe("error"));
    if (result.current.status === "error") {
      expect(result.current.error.code).toBe("persona_not_found");
    }
  });
});

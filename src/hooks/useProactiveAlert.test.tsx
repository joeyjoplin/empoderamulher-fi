import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiClientProvider } from "../api/ApiClientProvider";
import { createApiClient } from "../api/client";
import { useProactiveAlert } from "./useProactiveAlert";

describe("useProactiveAlert", () => {
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

  it("transitions from loading to success with the alert payload", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: {
            alert: true,
            deficitAmount: 380,
            deficitWindowDays: 9,
            naturalLanguageAlert: "Maria, em 9 dias…",
            suggestions: [
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

    const { result } = renderHook(() => useProactiveAlert(), {
      wrapper: ({ children }) => wrapper(children),
    });
    expect(result.current.status).toBe("loading");

    await waitFor(() => expect(result.current.status).toBe("success"));
    if (result.current.status === "success") {
      expect(result.current.data.alert).toBe(true);
      expect(result.current.data.deficitAmount).toBe(380);
    }
  });

  it("transitions to error state when the backend returns an error envelope", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: { code: "ai_service_unavailable", message: "down" },
        }),
        { status: 502, headers: { "content-type": "application/json" } },
      ),
    );

    const { result } = renderHook(() => useProactiveAlert(), {
      wrapper: ({ children }) => wrapper(children),
    });

    await waitFor(() => expect(result.current.status).toBe("error"));
    if (result.current.status === "error") {
      expect(result.current.error.code).toBe("ai_service_unavailable");
    }
  });
});

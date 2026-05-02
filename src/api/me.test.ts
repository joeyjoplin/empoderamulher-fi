import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createApiClient } from "./client";
import { getMe } from "./me";

describe("getMe", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls /me and returns the typed Persona", async () => {
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
    const client = createApiClient({
      baseUrl: "https://api.example",
      personaId: "0e6c7f0b-7c3a-5f3a-9c4f-1f5b4d2e6a11",
    });
    const me = await getMe(client);
    expect(me.name).toBe("Maria Silva");
    expect(me.businessType).toBe("confeiteira");

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(init.headers).get("X-Persona-Id")).toBe(
      "0e6c7f0b-7c3a-5f3a-9c4f-1f5b4d2e6a11",
    );
  });
});

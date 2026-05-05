import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createApiClient } from "./client";
import { getProactiveAlert } from "./insights";

describe("getProactiveAlert", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls /insights/proactive with X-Persona-Id and unwraps the data envelope", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: {
            alert: true,
            deficitAmount: 380,
            deficitWindowDays: 9,
            naturalLanguageAlert: "Maria, atenção…",
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

    const client = createApiClient({
      baseUrl: "https://api.example",
      personaId: "0e6c7f0b-7c3a-5f3a-9c4f-1f5b4d2e6a11",
    });
    const alert = await getProactiveAlert(client);
    expect(alert.alert).toBe(true);
    expect(alert.deficitAmount).toBe(380);
    expect(alert.suggestions[0]).toMatchObject({
      type: "empowerfi_credit",
      amount: 380,
    });

    const call = fetchMock.mock.calls[0];
    expect(String(call?.[0])).toContain("/insights/proactive");
    const init = call?.[1] as RequestInit;
    expect(init.method).toBe("GET");
    expect(new Headers(init.headers).get("X-Persona-Id")).toBe(
      "0e6c7f0b-7c3a-5f3a-9c4f-1f5b4d2e6a11",
    );
  });
});

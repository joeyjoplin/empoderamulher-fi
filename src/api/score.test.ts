import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createApiClient } from "./client";
import { attestMyScore, getMyScore } from "./score";

describe("getMyScore", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls /score/me with X-Persona-Id and returns the typed score", async () => {
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

    const client = createApiClient({
      baseUrl: "https://api.example",
      personaId: "0e6c7f0b-7c3a-5f3a-9c4f-1f5b4d2e6a11",
    });
    const score = await getMyScore(client);
    expect(score.total).toBe(612);
    expect(score.breakdown.discipline).toBe(158);
    expect(score.onChainAddress).toBe("ScorePdaBase58");

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(init.method).toBe("GET");
    expect(new Headers(init.headers).get("X-Persona-Id")).toBe(
      "0e6c7f0b-7c3a-5f3a-9c4f-1f5b4d2e6a11",
    );
  });
});

describe("attestMyScore", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("POSTs to /score/attest and returns the attested score with signature", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: {
            total: 632,
            breakdown: {
              discipline: 158,
              organization: 142,
              cashFlow: 167,
              engagement: 165,
            },
            lastUpdatedAt: 1714579999,
            attestor: "AttestorPubkeyBase58",
            onChainAddress: "ScorePdaBase58",
            signature: "5xrSigAttest",
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const client = createApiClient({
      baseUrl: "https://api.example",
      personaId: "0e6c7f0b-7c3a-5f3a-9c4f-1f5b4d2e6a11",
    });
    const result = await attestMyScore(client);
    expect(result.signature).toBe("5xrSigAttest");
    expect(result.total).toBe(632);

    const call = fetchMock.mock.calls[0];
    expect(String(call?.[0])).toContain("/score/attest");
    expect((call?.[1] as RequestInit).method).toBe("POST");
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { buildCurlSnippet, lookupScore } from "./scoreSaaS";

describe("lookupScore", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns kind=ok with the snake_case payload on a 200 response", async () => {
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

    const r = await lookupScore({
      cnpjDigits: "12345678000190",
      apiKey: "lender_demo_a1b2c3d4ef",
    });

    expect(r.kind).toBe("ok");
    if (r.kind !== "ok") return;
    expect(r.data.total_score).toBe(612);
    expect(r.data.breakdown.cash_flow).toBe(167);
    expect(r.data.on_chain_address).toBe("ScorePdaBase58");

    const call = fetchMock.mock.calls[0];
    expect(String(call?.[0])).toContain("/api/v1/score/12345678000190");
    const init = call?.[1] as RequestInit;
    expect(new Headers(init.headers).get("Authorization")).toBe(
      "Bearer lender_demo_a1b2c3d4ef",
    );
    // Critical: no X-Persona-Id on the partner-lender flow.
    expect(new Headers(init.headers).get("X-Persona-Id")).toBeNull();
  });

  it("returns kind=err with the backend code on a 401 response", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: { code: "invalid_api_key", message: "API key not recognised" },
        }),
        { status: 401, headers: { "content-type": "application/json" } },
      ),
    );
    const r = await lookupScore({
      cnpjDigits: "12345678000190",
      apiKey: "lender_demo_unknown",
    });
    expect(r.kind).toBe("err");
    if (r.kind !== "err") return;
    expect(r.status).toBe(401);
    expect(r.code).toBe("invalid_api_key");
  });
});

describe("buildCurlSnippet", () => {
  it("includes the Authorization header and the supplied CNPJ in the URL", () => {
    const snippet = buildCurlSnippet({
      cnpjDigits: "98765432000110",
      apiKey: "lender_demo_xyz",
    });
    expect(snippet).toContain("/api/v1/score/98765432000110");
    expect(snippet).toContain("Authorization: Bearer lender_demo_xyz");
  });
});

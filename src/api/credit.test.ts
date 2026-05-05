import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createApiClient } from "./client";
import { requestCredit } from "./credit";

describe("requestCredit", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("POSTs to /credit/request with the expected body and returns the disbursed loan", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: {
            loanId: "1714000000000",
            loanAddress: "LoanPdaAddressBase58",
            status: "disbursed",
            signatures: {
              request: "sigReq",
              approve: "sigApr",
              disburse: "sigDis",
            },
            principalCents: 38000,
            termMonths: 1,
            interestRateBps: 400,
            borrowerPubkey: "BorrowerKeyBase58",
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const client = createApiClient({
      baseUrl: "https://api.example",
      personaId: "0e6c7f0b-7c3a-5f3a-9c4f-1f5b4d2e6a11",
    });
    const result = await requestCredit(client, {
      amountCents: 38000,
      termMonths: 1,
      interestRateBps: 400,
    });

    expect(result.status).toBe("disbursed");
    expect(result.signatures.disburse).toBe("sigDis");
    expect(result.loanAddress).toBe("LoanPdaAddressBase58");

    const call = fetchMock.mock.calls[0];
    expect(String(call?.[0])).toContain("/credit/request");
    const init = call?.[1] as RequestInit;
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({
      amountCents: 38000,
      termMonths: 1,
      interestRateBps: 400,
    });
    expect(new Headers(init.headers).get("X-Persona-Id")).toBe(
      "0e6c7f0b-7c3a-5f3a-9c4f-1f5b4d2e6a11",
    );
  });
});

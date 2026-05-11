import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createApiClient } from "./client";
import { hireProvider } from "./marketplace";

describe("hireProvider", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("POSTs to /marketplace/hire with the expected body and returns the completed hire", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: {
            requestAddress: "RequestPdaBase58",
            nonce: "1714000000123",
            status: "paid",
            signatures: {
              create: "sigCreate",
              pay: "sigPay",
            },
            amountCents: 8000,
            category: "packaging",
            buyerPubkey: "BuyerPubkeyBase58",
            providerPubkey: "ProviderPubkeyBase58",
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const client = createApiClient({
      baseUrl: "https://api.example",
      personaId: "3149a890-d1b4-5da8-a033-4de0049901a6",
    });
    const result = await hireProvider(client, {
      providerPersonaId: "24b94c87-a85c-5214-827f-695615794ed8",
      amountCents: 8000,
      category: "packaging",
      memo: "Embalagens artesanais — Kit 50 unidades",
    });

    expect(result.status).toBe("paid");
    expect(result.signatures.pay).toBe("sigPay");
    expect(result.signatures.create).toBe("sigCreate");
    expect(result.requestAddress).toBe("RequestPdaBase58");

    const call = fetchMock.mock.calls[0];
    expect(String(call?.[0])).toContain("/marketplace/hire");
    const init = call?.[1] as RequestInit;
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({
      providerPersonaId: "24b94c87-a85c-5214-827f-695615794ed8",
      amountCents: 8000,
      category: "packaging",
      memo: "Embalagens artesanais — Kit 50 unidades",
    });
    expect(new Headers(init.headers).get("X-Persona-Id")).toBe(
      "3149a890-d1b4-5da8-a033-4de0049901a6",
    );
  });
});

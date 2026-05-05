import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HttpChatService } from "../src/services/chat.js";

describe("HttpChatService.sendMessage", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("POSTs to {AI_SERVICE_URL}/api/v1/chat and parses the response", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          response: "Maria, …",
          suggested_actions: [
            { label: "Ver oferta de crédito", target: "credit" },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const svc = new HttpChatService({
      baseUrl: "https://ai.example",
      fetch: fetchMock,
    });
    const result = await svc.sendMessage({
      personaId: "0e6c7f0b-7c3a-5f3a-9c4f-1f5b4d2e6a11",
      message: "Preciso de um empréstimo",
      history: [{ role: "user", content: "oi" }],
    });

    expect(result).toEqual({
      response: "Maria, …",
      suggestedActions: [
        { label: "Ver oferta de crédito", target: "credit" },
      ],
    });

    const call = fetchMock.mock.calls[0];
    expect(call?.[0]).toBe("https://ai.example/api/v1/chat");
    const init = call?.[1] as RequestInit;
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({
      persona_id: "0e6c7f0b-7c3a-5f3a-9c4f-1f5b4d2e6a11",
      message: "Preciso de um empréstimo",
      history: [{ role: "user", content: "oi" }],
    });
  });

  it("throws persona_not_found when the AI service returns 404", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: "persona_not_found" }), {
        status: 404,
      }),
    );
    const svc = new HttpChatService({
      baseUrl: "https://ai.example",
      fetch: fetchMock,
    });
    await expect(
      svc.sendMessage({
        personaId: "0e6c7f0b-7c3a-5f3a-9c4f-1f5b4d2e6a11",
        message: "oi",
        history: [],
      }),
    ).rejects.toMatchObject({ code: "persona_not_found" });
  });

  it("throws ai_service_unavailable when fetch rejects", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("network down"));
    const svc = new HttpChatService({
      baseUrl: "https://ai.example",
      fetch: fetchMock,
    });
    await expect(
      svc.sendMessage({
        personaId: "0e6c7f0b-7c3a-5f3a-9c4f-1f5b4d2e6a11",
        message: "oi",
        history: [],
      }),
    ).rejects.toMatchObject({ code: "ai_service_unavailable" });
  });

  it("throws ai_service_error on schema mismatch", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ unexpected: true }), { status: 200 }),
    );
    const svc = new HttpChatService({
      baseUrl: "https://ai.example",
      fetch: fetchMock,
    });
    await expect(
      svc.sendMessage({
        personaId: "0e6c7f0b-7c3a-5f3a-9c4f-1f5b4d2e6a11",
        message: "oi",
        history: [],
      }),
    ).rejects.toMatchObject({ code: "ai_service_error" });
  });
});

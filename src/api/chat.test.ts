import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { sendChatMessage } from "./chat";
import { createApiClient } from "./client";

describe("sendChatMessage", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("POSTs to /chat with persona header and unwraps {data}", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: {
            response: "Maria, tudo bem por aqui.",
            suggestedActions: [
              { label: "Ver minha pontuação", target: "score" },
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
    const result = await sendChatMessage(client, {
      message: "Como está minha pontuação?",
      history: [{ role: "user", content: "oi" }],
    });

    expect(result.response).toBe("Maria, tudo bem por aqui.");
    expect(result.suggestedActions).toEqual([
      { label: "Ver minha pontuação", target: "score" },
    ]);

    const call = fetchMock.mock.calls[0];
    expect(String(call?.[0])).toContain("/chat");
    const init = call?.[1] as RequestInit;
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({
      message: "Como está minha pontuação?",
      history: [{ role: "user", content: "oi" }],
    });
    expect(new Headers(init.headers).get("X-Persona-Id")).toBe(
      "0e6c7f0b-7c3a-5f3a-9c4f-1f5b4d2e6a11",
    );
  });
});

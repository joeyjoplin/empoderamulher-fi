import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError, createApiClient } from "./client";

describe("createApiClient", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("builds the URL from baseUrl + path", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: { ok: true } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const client = createApiClient({ baseUrl: "https://api.example/" });
    await client.get("/me");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example/me",
      expect.any(Object),
    );
  });

  it("injects X-Persona-Id when configured", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: {} }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const client = createApiClient({
      baseUrl: "https://api.example",
      personaId: "11111111-1111-1111-1111-111111111111",
    });
    await client.get("/me");
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const headers = new Headers(init.headers);
    expect(headers.get("X-Persona-Id")).toBe(
      "11111111-1111-1111-1111-111111111111",
    );
  });

  it("returns the unwrapped `data` field on success", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: { name: "Maria" } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const client = createApiClient({ baseUrl: "https://api.example" });
    const result = await client.get<{ name: string }>("/me");
    expect(result).toEqual({ name: "Maria" });
  });

  it("throws ApiError with code+message when backend returns { error }", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: { code: "missing_persona_id", message: "X-Persona-Id required" },
        }),
        { status: 401, headers: { "content-type": "application/json" } },
      ),
    );
    const client = createApiClient({ baseUrl: "https://api.example" });
    await expect(client.get("/me")).rejects.toMatchObject({
      name: "ApiError",
      status: 401,
      code: "missing_persona_id",
    });
  });

  it("ApiError exposes status and code", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ error: { code: "persona_not_found" } }),
        { status: 404, headers: { "content-type": "application/json" } },
      ),
    );
    const client = createApiClient({ baseUrl: "https://api.example" });
    try {
      await client.get("/me");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const e = err as ApiError;
      expect(e.status).toBe(404);
      expect(e.code).toBe("persona_not_found");
    }
  });
});

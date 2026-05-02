import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { InMemoryPersonaService } from "../src/services/persona.js";

describe("GET /health", () => {
  it("returns 200 with status ok", async () => {
    const app = createApp({
      personaService: new InMemoryPersonaService([]),
      authMode: "mock",
    });
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });
});

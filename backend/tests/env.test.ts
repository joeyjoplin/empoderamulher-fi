import { describe, expect, it } from "vitest";
import { loadEnv } from "../src/config/env.js";

describe("loadEnv", () => {
  it("parses a valid env block with defaults", () => {
    const env = loadEnv({
      DATABASE_URL: "postgres://u:p@localhost:5432/empowerfi",
    });
    expect(env.PORT).toBe(3001);
    expect(env.AUTH_MODE).toBe("mock");
    expect(env.LOG_LEVEL).toBe("info");
  });

  it("throws when DATABASE_URL is missing", () => {
    expect(() => loadEnv({})).toThrow();
  });

  it("throws when AUTH_MODE is not one of the allowed values", () => {
    expect(() =>
      loadEnv({
        DATABASE_URL: "postgres://u:p@localhost:5432/empowerfi",
        AUTH_MODE: "bogus",
      }),
    ).toThrow();
  });

  it("coerces PORT from a string", () => {
    const env = loadEnv({
      DATABASE_URL: "postgres://u:p@localhost:5432/empowerfi",
      PORT: "4000",
    });
    expect(env.PORT).toBe(4000);
  });
});

/**
 * Tiny `Authorization: Bearer <key>` gate for the public Score-as-a-Service
 * sandbox (TASK 3.5.2). Production wants a real API-key store with rotation,
 * scopes, and metering — for the hackathon an in-memory allowlist seeded
 * from `SCORE_SAAS_DEMO_KEYS` is enough to demonstrate the wedge.
 *
 * On success the matched key is exposed via `c.var.apiKey` so downstream
 * handlers (and the rate-limit middleware) can attribute by key instead of
 * by IP.
 */

import type { MiddlewareHandler } from "hono";

export type ApiKeyVariables = {
  apiKey: string;
};

export type ApiKeyOptions = {
  /** Allowlist of accepted bearer tokens. Comparison is constant-time-ish (substring match avoided). */
  allowlist: readonly string[];
  /** Optional token prefix the gate enforces — keeps obviously wrong shapes out. */
  expectedPrefix?: string;
};

export function apiKey(
  options: ApiKeyOptions,
): MiddlewareHandler<{ Variables: ApiKeyVariables }> {
  const allowed = new Set(options.allowlist.filter((k) => k.length > 0));
  const prefix = options.expectedPrefix;

  return async (c, next) => {
    const auth = c.req.header("Authorization") ?? "";
    const match = /^Bearer\s+(.+)$/i.exec(auth);
    if (!match || !match[1]) {
      return c.json(
        {
          error: {
            code: "missing_api_key",
            message: "Authorization: Bearer <key> header required",
          },
        },
        401,
      );
    }
    const token = match[1].trim();
    if (prefix && !token.startsWith(prefix)) {
      return c.json(
        {
          error: {
            code: "invalid_api_key",
            message: `API key must start with '${prefix}'`,
          },
        },
        401,
      );
    }
    if (!allowed.has(token)) {
      return c.json(
        {
          error: {
            code: "invalid_api_key",
            message: "API key not recognised",
          },
        },
        401,
      );
    }

    c.set("apiKey", token);
    await next();
  };
}

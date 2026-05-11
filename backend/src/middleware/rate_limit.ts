/**
 * Per-key token-bucket rate limit middleware.
 *
 * Hackathon-grade: in-memory, single-process. Swap for Redis when the
 * service runs on more than one node. The bucket math is the standard
 * "fill linearly up to capacity, deduct one per request".
 */

import type { MiddlewareHandler } from "hono";

export type RateLimitOptions = {
  /** Max requests allowed within `windowMs`. */
  limit: number;
  /** Sliding window length, in milliseconds. */
  windowMs: number;
  /**
   * Function used to compute the bucket key for a request. Defaults to
   * `x-forwarded-for` first hop, falling back to a literal "anonymous"
   * bucket. Tests inject a deterministic key so they don't depend on the
   * underlying socket layer.
   */
  keyFn?: (req: Request) => string;
  /** Override `Date.now()` for deterministic tests. */
  now?: () => number;
};

type Bucket = { tokens: number; updatedAt: number };

export function rateLimit(options: RateLimitOptions): MiddlewareHandler {
  const buckets = new Map<string, Bucket>();
  const limit = options.limit;
  const windowMs = options.windowMs;
  const refillPerMs = limit / windowMs;
  const keyFn = options.keyFn ?? defaultKeyFn;
  const now = options.now ?? (() => Date.now());

  return async (c, next) => {
    const key = keyFn(c.req.raw);
    const t = now();
    const bucket = buckets.get(key) ?? { tokens: limit, updatedAt: t };
    const elapsed = t - bucket.updatedAt;
    const refilled = Math.min(limit, bucket.tokens + elapsed * refillPerMs);

    if (refilled < 1) {
      buckets.set(key, { tokens: refilled, updatedAt: t });
      const retryAfterMs = Math.ceil((1 - refilled) / refillPerMs);
      c.header("Retry-After", String(Math.ceil(retryAfterMs / 1000)));
      return c.json(
        {
          error: {
            code: "rate_limited",
            message: `rate limit exceeded (${limit} requests per ${Math.round(windowMs / 1000)}s)`,
          },
        },
        429,
      );
    }

    buckets.set(key, { tokens: refilled - 1, updatedAt: t });
    await next();
  };
}

function defaultKeyFn(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const xri = req.headers.get("x-real-ip");
  if (xri) return xri.trim();
  return "anonymous";
}

import { describe, expect, it, vi } from "vitest";

import { createApp } from "../src/app.js";
import { InMemoryPersonaService } from "../src/services/persona.js";
import {
  PublicScoreServiceError,
  type PublicScoreResponse,
  type PublicScoreService,
} from "../src/services/public_score_service.js";

type ErrorBody = { error: { code: string; message?: string } };
type DataBody<T> = { data: T };

const FAKE_RESULT: PublicScoreResponse = {
  totalScore: 612,
  breakdown: {
    discipline: 158,
    organization: 142,
    cashFlow: 167,
    engagement: 145,
  },
  lastUpdatedAt: 1714579800,
  attestor: "AttestorPubkeyBase58",
  onChainAddress: "ScorePdaBase58",
};

const VALID_KEY = "lender_demo_a1b2c3d4ef";
const OTHER_KEY = "lender_demo_9z8y7x6w5v";

function buildApp(opts: {
  publicScore: PublicScoreService;
  rateLimit?: { limit: number; windowMs: number; now?: () => number };
  apiKeys?: readonly string[];
}) {
  return createApp({
    personaService: new InMemoryPersonaService([]),
    insightsService: { getProactiveAlert: vi.fn() },
    loanService: { requestAndDisburse: vi.fn() },
    loanRepository: { save: vi.fn() },
    scoreService: {
      fetchOnChainForPersona: vi.fn(),
      attestForPersona: vi.fn(),
    },
    publicScoreService: opts.publicScore,
    publicScoreApiKeys: opts.apiKeys ?? [VALID_KEY, OTHER_KEY],
    marketplaceService: { hireProvider: vi.fn() },
    marketplaceRepository: { save: vi.fn(), countHiresByBuyer: vi.fn() },
    impactRepository: { recentEvents: vi.fn().mockResolvedValue([]) },
    chatService: { sendMessage: vi.fn() },
    authMode: "mock",
    publicScoreRateLimit: opts.rateLimit
      ? {
          limit: opts.rateLimit.limit,
          windowMs: opts.rateLimit.windowMs,
          // Stable key so the bucket is shared across requests in a test
          // when the per-API-key bucketing isn't what we're exercising.
          keyFn: () => "test-key",
          now: opts.rateLimit.now,
        }
      : { keyFn: () => "test-key" },
  });
}

const MARIA_CNPJ_DIGITS = "12345678000190";
// Dot/dash variant — `/` is excluded because it would be parsed as a URL
// path separator. Lenders pass 14 digits in the URL; separator-stripping
// still kicks in for any non-digit characters that don't break routing.
const MARIA_CNPJ_DOTTED = "12.345.678.0001-90";

const authHeader = { Authorization: `Bearer ${VALID_KEY}` };

describe("GET /api/v1/score/:cnpj", () => {
  it("returns 200 with the snake_case score envelope on the happy path", async () => {
    const lookupByCnpj = vi.fn().mockResolvedValue(FAKE_RESULT);
    const app = buildApp({ publicScore: { lookupByCnpj } });

    const res = await app.request(`/api/v1/score/${MARIA_CNPJ_DIGITS}`, {
      headers: authHeader,
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as DataBody<{
      total_score: number;
      breakdown: {
        discipline: number;
        organization: number;
        cash_flow: number;
        engagement: number;
      };
      last_updated_at: number;
      attestor: string;
      on_chain_address: string;
    }>;
    expect(body.data).toEqual({
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
    });
    expect(lookupByCnpj).toHaveBeenCalledWith(MARIA_CNPJ_DIGITS);
  });

  it("strips dot/dash separators from the CNPJ before lookup", async () => {
    const lookupByCnpj = vi.fn().mockResolvedValue(FAKE_RESULT);
    const app = buildApp({ publicScore: { lookupByCnpj } });
    const res = await app.request(`/api/v1/score/${MARIA_CNPJ_DOTTED}`, {
      headers: authHeader,
    });
    expect(res.status).toBe(200);
    expect(lookupByCnpj).toHaveBeenCalledWith(MARIA_CNPJ_DIGITS);
  });

  it("returns 404 when no Score PDA exists for the CNPJ's HMAC", async () => {
    const app = buildApp({
      publicScore: { lookupByCnpj: vi.fn().mockResolvedValue(null) },
    });
    const res = await app.request(`/api/v1/score/${MARIA_CNPJ_DIGITS}`, {
      headers: authHeader,
    });
    expect(res.status).toBe(404);
    const body = (await res.json()) as ErrorBody;
    expect(body.error.code).toBe("score_not_attested");
  });

  it("returns 422 for malformed CNPJ (wrong digit count)", async () => {
    const lookupByCnpj = vi.fn();
    const app = buildApp({ publicScore: { lookupByCnpj } });
    const res = await app.request("/api/v1/score/123abc", {
      headers: authHeader,
    });
    expect(res.status).toBe(422);
    const body = (await res.json()) as ErrorBody;
    expect(body.error.code).toBe("invalid_cnpj");
    expect(lookupByCnpj).not.toHaveBeenCalled();
  });

  it("returns 429 once the rate limit is exceeded", async () => {
    let clock = 0;
    const app = buildApp({
      publicScore: { lookupByCnpj: vi.fn().mockResolvedValue(FAKE_RESULT) },
      rateLimit: { limit: 2, windowMs: 60_000, now: () => clock },
    });

    const r1 = await app.request(`/api/v1/score/${MARIA_CNPJ_DIGITS}`, {
      headers: authHeader,
    });
    expect(r1.status).toBe(200);
    const r2 = await app.request(`/api/v1/score/${MARIA_CNPJ_DIGITS}`, {
      headers: authHeader,
    });
    expect(r2.status).toBe(200);
    const r3 = await app.request(`/api/v1/score/${MARIA_CNPJ_DIGITS}`, {
      headers: authHeader,
    });
    expect(r3.status).toBe(429);
    expect(r3.headers.get("Retry-After")).toBeTruthy();

    clock += 60_000;
    const r4 = await app.request(`/api/v1/score/${MARIA_CNPJ_DIGITS}`, {
      headers: authHeader,
    });
    expect(r4.status).toBe(200);
  });

  it("returns 502 when the on-chain RPC fails", async () => {
    const lookupByCnpj = vi
      .fn()
      .mockRejectedValue(
        new PublicScoreServiceError("solana_rpc_error", "rpc down"),
      );
    const app = buildApp({ publicScore: { lookupByCnpj } });
    const res = await app.request(`/api/v1/score/${MARIA_CNPJ_DIGITS}`, {
      headers: authHeader,
    });
    expect(res.status).toBe(502);
    const body = (await res.json()) as ErrorBody;
    expect(body.error.code).toBe("solana_rpc_error");
  });

  it("does not require X-Persona-Id (third-party lender flow)", async () => {
    const app = buildApp({
      publicScore: { lookupByCnpj: vi.fn().mockResolvedValue(FAKE_RESULT) },
    });
    // Authorization header is the only credential — no X-Persona-Id sent.
    const res = await app.request(`/api/v1/score/${MARIA_CNPJ_DIGITS}`, {
      headers: authHeader,
    });
    expect(res.status).toBe(200);
  });
});

describe("GET /api/v1/score/:cnpj — API key gate", () => {
  it("returns 401 when Authorization header is missing", async () => {
    const lookupByCnpj = vi.fn();
    const app = buildApp({ publicScore: { lookupByCnpj } });
    const res = await app.request(`/api/v1/score/${MARIA_CNPJ_DIGITS}`);
    expect(res.status).toBe(401);
    const body = (await res.json()) as ErrorBody;
    expect(body.error.code).toBe("missing_api_key");
    expect(lookupByCnpj).not.toHaveBeenCalled();
  });

  it("returns 401 for keys that don't carry the lender_demo_ prefix", async () => {
    const lookupByCnpj = vi.fn();
    const app = buildApp({ publicScore: { lookupByCnpj } });
    const res = await app.request(`/api/v1/score/${MARIA_CNPJ_DIGITS}`, {
      headers: { Authorization: "Bearer some_random_token" },
    });
    expect(res.status).toBe(401);
    const body = (await res.json()) as ErrorBody;
    expect(body.error.code).toBe("invalid_api_key");
    expect(lookupByCnpj).not.toHaveBeenCalled();
  });

  it("returns 401 for unknown lender_demo_ keys not in the allowlist", async () => {
    const lookupByCnpj = vi.fn();
    const app = buildApp({ publicScore: { lookupByCnpj } });
    const res = await app.request(`/api/v1/score/${MARIA_CNPJ_DIGITS}`, {
      headers: { Authorization: "Bearer lender_demo_unknown" },
    });
    expect(res.status).toBe(401);
    const body = (await res.json()) as ErrorBody;
    expect(body.error.code).toBe("invalid_api_key");
    expect(lookupByCnpj).not.toHaveBeenCalled();
  });
});

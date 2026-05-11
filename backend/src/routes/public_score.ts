/**
 * Public Score-as-a-Service endpoint.
 *
 * Mounted OUTSIDE the persona-auth-protected routes — third-party lenders
 * authenticate via CNPJ (and, in production, an API key issued at
 * onboarding). The hackathon version is per-IP rate-limited only; the API
 * key gate ships with TASK 3.5.2.
 *
 * Response uses snake_case field names — matches the third-party-friendly
 * JSON convention documented in the README's cURL example, and lets the
 * sandbox UI in 3.5.2 paste the raw JSON without renaming fields.
 */

import { Hono } from "hono";
import { z } from "zod";

import { rateLimit, type RateLimitOptions } from "../middleware/rate_limit.js";
import {
  PublicScoreServiceError,
  type PublicScoreService,
} from "../services/public_score_service.js";

const cnpjParamSchema = z
  .string()
  .transform((raw) => raw.replace(/\D/g, ""))
  .refine((digits) => digits.length === 14, {
    message: "CNPJ must have exactly 14 digits",
  });

export type PublicScoreRouteDeps = {
  service: PublicScoreService;
  rateLimitOptions?: Partial<RateLimitOptions>;
};

export function publicScoreRoute(deps: PublicScoreRouteDeps) {
  const app = new Hono();

  const limit = rateLimit({
    limit: deps.rateLimitOptions?.limit ?? 30,
    windowMs: deps.rateLimitOptions?.windowMs ?? 60_000,
    keyFn: deps.rateLimitOptions?.keyFn,
    now: deps.rateLimitOptions?.now,
  });

  app.get("/:cnpj", limit, async (c) => {
    const raw = c.req.param("cnpj");
    const parsed = cnpjParamSchema.safeParse(raw);
    if (!parsed.success) {
      return c.json(
        {
          error: {
            code: "invalid_cnpj",
            message: parsed.error.issues[0]?.message ?? "invalid CNPJ",
          },
        },
        422,
      );
    }

    try {
      const result = await deps.service.lookupByCnpj(parsed.data);
      if (result === null) {
        return c.json(
          {
            error: {
              code: "score_not_attested",
              message: "no on-chain score found for this CNPJ",
            },
          },
          404,
        );
      }
      return c.json({
        data: {
          total_score: result.totalScore,
          breakdown: {
            discipline: result.breakdown.discipline,
            organization: result.breakdown.organization,
            cash_flow: result.breakdown.cashFlow,
            engagement: result.breakdown.engagement,
          },
          last_updated_at: result.lastUpdatedAt,
          attestor: result.attestor,
          on_chain_address: result.onChainAddress,
        },
      });
    } catch (err) {
      if (err instanceof PublicScoreServiceError) {
        return c.json(
          { error: { code: err.code, message: err.message } },
          err.status as 422 | 502 | 503,
        );
      }
      const message = err instanceof Error ? err.message : "unknown error";
      return c.json(
        { error: { code: "score_service_error", message } },
        502,
      );
    }
  });

  return app;
}

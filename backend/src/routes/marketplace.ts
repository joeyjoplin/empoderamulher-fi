import { Hono } from "hono";
import { z } from "zod";

import type { AuthVariables } from "../middleware/auth.js";
import type { BnplEligibilityService } from "../services/bnpl_eligibility.js";
import {
  MarketplaceServiceError,
  type MarketplaceRepository,
  type MarketplaceService,
} from "../services/marketplace.js";

const hireSchema = z.object({
  providerPersonaId: z.string().uuid(),
  amountCents: z.number().int().positive(),
  category: z.enum(["supplies", "packaging", "services", "other"]),
  memo: z.string().min(1).max(200),
});

const bnplQuoteSchema = z.object({
  providerPersonaId: z.string().uuid(),
  principalCents: z.number().int().positive(),
});

const bnplHireSchema = z.object({
  providerPersonaId: z.string().uuid(),
  principalCents: z.number().int().positive(),
  installmentCount: z.number().int().min(2).max(6),
  category: z.enum(["supplies", "packaging", "services", "other"]),
  memo: z.string().min(1).max(200),
  /** Unix epoch seconds. Validated against the on-chain `first_due_at > now`. */
  firstDueAt: z.number().int().positive(),
});

const installmentSchema = z.object({
  installmentIndex: z.number().int().min(0).max(5),
});

export function marketplaceRoute(deps: {
  marketplace: MarketplaceService;
  marketplaceRepository: MarketplaceRepository;
  bnplEligibility: BnplEligibilityService;
}) {
  const app = new Hono<{ Variables: AuthVariables }>();

  app.post("/hire", async (c) => {
    const body = await safeJson(c.req.raw);
    const parsed = hireSchema.safeParse(body);
    if (!parsed.success) return invalidInput(c, parsed.error);

    const buyer = c.var.persona;
    if (parsed.data.providerPersonaId === buyer.id) {
      return c.json(
        {
          error: {
            code: "self_hire_forbidden",
            message: "buyer and provider must be different personas",
          },
        },
        409,
      );
    }

    let completed;
    try {
      completed = await deps.marketplace.hireProvider({
        buyerPersonaId: buyer.id,
        providerPersonaId: parsed.data.providerPersonaId,
        amountCents: parsed.data.amountCents,
        category: parsed.data.category,
        memo: parsed.data.memo,
      });
    } catch (err) {
      return marketplaceError(c, err);
    }

    await deps.marketplaceRepository.save({
      ...completed,
      buyerPersonaId: buyer.id,
      providerPersonaId: parsed.data.providerPersonaId,
      memo: parsed.data.memo,
      createdAt: new Date(),
    });

    return c.json({ data: completed });
  });

  app.get("/me/hires", async (c) => {
    const buyer = c.var.persona;
    const count = await deps.marketplaceRepository.countHiresByBuyer(buyer.id);
    return c.json({ data: { count } });
  });

  app.post("/bnpl/quote", async (c) => {
    const body = await safeJson(c.req.raw);
    const parsed = bnplQuoteSchema.safeParse(body);
    if (!parsed.success) return invalidInput(c, parsed.error);

    const buyer = c.var.persona;
    if (parsed.data.providerPersonaId === buyer.id) {
      return c.json(
        {
          error: {
            code: "self_hire_forbidden",
            message: "buyer and provider must be different personas",
          },
        },
        409,
      );
    }

    try {
      const quote = await deps.marketplace.quoteBnpl({
        buyerPersonaId: buyer.id,
        providerPersonaId: parsed.data.providerPersonaId,
        principalCents: parsed.data.principalCents,
      });
      return c.json({ data: quote });
    } catch (err) {
      return marketplaceError(c, err);
    }
  });

  app.post("/bnpl/hire", async (c) => {
    const body = await safeJson(c.req.raw);
    const parsed = bnplHireSchema.safeParse(body);
    if (!parsed.success) return invalidInput(c, parsed.error);

    const buyer = c.var.persona;
    if (parsed.data.providerPersonaId === buyer.id) {
      return c.json(
        {
          error: {
            code: "self_hire_forbidden",
            message: "buyer and provider must be different personas",
          },
        },
        409,
      );
    }

    try {
      const completed = await deps.marketplace.hireBnpl({
        buyerPersonaId: buyer.id,
        providerPersonaId: parsed.data.providerPersonaId,
        principalCents: parsed.data.principalCents,
        installmentCount: parsed.data.installmentCount,
        category: parsed.data.category,
        memo: parsed.data.memo,
        firstDueAt: parsed.data.firstDueAt,
      });
      return c.json({ data: completed });
    } catch (err) {
      return marketplaceError(c, err);
    }
  });

  app.post("/bnpl/:planId/installment", async (c) => {
    const planId = c.req.param("planId");
    const body = await safeJson(c.req.raw);
    const parsed = installmentSchema.safeParse(body);
    if (!parsed.success) return invalidInput(c, parsed.error);

    const buyer = c.var.persona;
    try {
      const recorded = await deps.marketplace.recordInstallment({
        buyerPersonaId: buyer.id,
        planId,
        installmentIndex: parsed.data.installmentIndex,
      });
      return c.json({ data: recorded });
    } catch (err) {
      return marketplaceError(c, err);
    }
  });

  app.get("/me/bnpl", async (c) => {
    const buyer = c.var.persona;
    const plans = await deps.marketplaceRepository.listBnplPlansByBuyer(buyer.id);
    return c.json({ data: { plans } });
  });

  return app;
}

async function safeJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

function invalidInput(
  c: { json: (b: unknown, s: number) => Response },
  err: z.ZodError,
): Response {
  return c.json(
    {
      error: {
        code: "invalid_input",
        message: err.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
      },
    },
    422,
  );
}

const BUSINESS_ERROR_CODES = new Set([
  "self_hire_forbidden",
  "no_score_on_chain",
  "score_service_unconfigured",
  "score_service_error",
  "invalid_installment_count",
  "first_due_in_past",
  "bnpl_plan_not_found",
  "unauthorized",
  "bnpl_already_complete",
  "invalid_installment_order",
]);

function marketplaceError(
  c: { json: (b: unknown, s: number) => Response },
  err: unknown,
): Response {
  const code =
    err instanceof MarketplaceServiceError
      ? err.code
      : err instanceof Error && "code" in err && typeof (err as { code: unknown }).code === "string"
        ? (err as { code: string }).code
        : "solana_rpc_error";
  const message =
    err instanceof Error ? err.message : "Solana orchestration failed";
  const status =
    code === "unauthorized"
      ? 403
      : code === "bnpl_plan_not_found"
        ? 404
        : BUSINESS_ERROR_CODES.has(code)
          ? 409
          : 502;
  return c.json({ error: { code, message } }, status);
}

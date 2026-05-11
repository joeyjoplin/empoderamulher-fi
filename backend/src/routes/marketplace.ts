import { Hono } from "hono";
import { z } from "zod";

import type { AuthVariables } from "../middleware/auth.js";
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

export function marketplaceRoute(deps: {
  marketplace: MarketplaceService;
  marketplaceRepository: MarketplaceRepository;
}) {
  const app = new Hono<{ Variables: AuthVariables }>();

  app.post("/hire", async (c) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      body = {};
    }

    const parsed = hireSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        {
          error: {
            code: "invalid_input",
            message: parsed.error.issues
              .map((i) => `${i.path.join(".")}: ${i.message}`)
              .join("; "),
          },
        },
        422,
      );
    }

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
      const code =
        err instanceof MarketplaceServiceError
          ? err.code
          : err instanceof Error && "code" in err && typeof err.code === "string"
            ? err.code
            : "solana_rpc_error";
      const message =
        err instanceof Error ? err.message : "Solana orchestration failed";
      return c.json({ error: { code, message } }, 502);
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

  return app;
}

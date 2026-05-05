import { Hono } from "hono";
import { z } from "zod";

import type { AuthVariables } from "../middleware/auth.js";
import {
  LoanServiceError,
  type LoanRepository,
  type LoanService,
} from "../services/loans.js";

const requestSchema = z.object({
  amountCents: z.number().int().positive(),
  termMonths: z.number().int().min(1).max(36),
  interestRateBps: z.number().int().min(0).max(10_000),
});

export function creditRoute(deps: {
  loans: LoanService;
  loanRepository: LoanRepository;
}) {
  const app = new Hono<{ Variables: AuthVariables }>();

  app.post("/request", async (c) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      body = {};
    }

    const parsed = requestSchema.safeParse(body);
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

    const persona = c.var.persona;
    if (!persona.walletPubkey) {
      return c.json(
        {
          error: {
            code: "wallet_not_linked",
            message: "Persona has no on-chain wallet linked",
          },
        },
        409,
      );
    }

    let disbursed;
    try {
      disbursed = await deps.loans.requestAndDisburse({
        personaId: persona.id,
        borrowerPubkey: persona.walletPubkey,
        amountCents: parsed.data.amountCents,
        termMonths: parsed.data.termMonths,
        interestRateBps: parsed.data.interestRateBps,
      });
    } catch (err) {
      const code =
        err instanceof LoanServiceError
          ? err.code
          : err instanceof Error && "code" in err && typeof err.code === "string"
            ? err.code
            : "solana_rpc_error";
      const message =
        err instanceof Error ? err.message : "Solana orchestration failed";
      return c.json({ error: { code, message } }, 502);
    }

    await deps.loanRepository.save({
      ...disbursed,
      personaId: persona.id,
      createdAt: new Date(),
    });

    return c.json({ data: disbursed });
  });

  return app;
}

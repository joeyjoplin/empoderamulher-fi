import { Hono } from "hono";

import type { AuthVariables } from "../middleware/auth.js";
import {
  ScoreServiceError,
  type ScoreService,
} from "../services/score_service.js";

export function scoreRoute(deps: { score: ScoreService }) {
  const app = new Hono<{ Variables: AuthVariables }>();

  app.get("/me", async (c) => {
    try {
      const result = await deps.score.fetchOnChainForPersona({
        personaId: c.var.persona.id,
      });
      if (!result) {
        return c.json(
          {
            error: {
              code: "score_not_attested",
              message: "no on-chain Score PDA found for this persona",
            },
          },
          404,
        );
      }
      return c.json({ data: result });
    } catch (err) {
      const { code, message } = extractError(err);
      return c.json({ error: { code, message } }, 502);
    }
  });

  app.post("/attest", async (c) => {
    try {
      const result = await deps.score.attestForPersona({
        personaId: c.var.persona.id,
      });
      return c.json({ data: result });
    } catch (err) {
      const { code, message } = extractError(err);
      return c.json({ error: { code, message } }, 502);
    }
  });

  return app;
}

function extractError(err: unknown): { code: string; message: string } {
  if (err instanceof ScoreServiceError) {
    return { code: err.code, message: err.message };
  }
  if (err instanceof Error) {
    const code =
      "code" in err && typeof err.code === "string"
        ? err.code
        : "score_service_error";
    return { code, message: err.message };
  }
  return { code: "score_service_error", message: "unknown error" };
}

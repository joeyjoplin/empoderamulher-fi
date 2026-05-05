import { Hono } from "hono";

import type { AuthVariables } from "../middleware/auth.js";
import {
  InsightsServiceError,
  type InsightsService,
} from "../services/insights.js";

const DEFAULT_LOOKAHEAD_DAYS = 9;

export function insightsRoute(deps: { insights: InsightsService }) {
  const app = new Hono<{ Variables: AuthVariables }>();

  app.get("/proactive", async (c) => {
    try {
      const alert = await deps.insights.getProactiveAlert({
        personaId: c.var.persona.id,
        lookaheadDays: DEFAULT_LOOKAHEAD_DAYS,
      });
      return c.json({ data: alert });
    } catch (err) {
      if (err instanceof InsightsServiceError) {
        return c.json(
          { error: { code: err.code, message: err.message } },
          502,
        );
      }
      const code =
        err instanceof Error && "code" in err && typeof err.code === "string"
          ? err.code
          : "ai_service_error";
      return c.json(
        { error: { code, message: err instanceof Error ? err.message : "AI error" } },
        502,
      );
    }
  });

  return app;
}

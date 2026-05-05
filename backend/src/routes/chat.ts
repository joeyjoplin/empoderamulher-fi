import { Hono } from "hono";
import { z } from "zod";

import type { AuthVariables } from "../middleware/auth.js";
import {
  ChatServiceError,
  type ChatService,
} from "../services/chat.js";

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1),
});

const requestSchema = z.object({
  message: z.string().min(1).max(4_000),
  history: z.array(messageSchema).max(50).default([]),
});

export function chatRoute(deps: { chat: ChatService }) {
  const app = new Hono<{ Variables: AuthVariables }>();

  app.post("/", async (c) => {
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

    try {
      const reply = await deps.chat.sendMessage({
        personaId: c.var.persona.id,
        message: parsed.data.message,
        history: parsed.data.history,
      });
      return c.json({ data: reply });
    } catch (err) {
      if (err instanceof ChatServiceError) {
        return c.json(
          { error: { code: err.code, message: err.message } },
          err.status as 404 | 502,
        );
      }
      return c.json(
        {
          error: {
            code: "ai_service_error",
            message: err instanceof Error ? err.message : "AI error",
          },
        },
        502,
      );
    }
  });

  return app;
}

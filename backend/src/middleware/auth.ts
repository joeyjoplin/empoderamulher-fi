import type { MiddlewareHandler } from "hono";
import { z } from "zod";

import type { PersonaService } from "../services/persona.js";
import type { AuthMode, Persona } from "../types/domain.js";

export type AuthVariables = {
  persona: Persona;
};

const uuidSchema = z.string().uuid();

export function authMiddleware(deps: {
  mode: AuthMode;
  personas: PersonaService;
}): MiddlewareHandler<{ Variables: AuthVariables }> {
  return async (c, next) => {
    if (deps.mode !== "mock") {
      return c.json(
        { error: { code: "auth_mode_unsupported", message: deps.mode } },
        501,
      );
    }

    const personaId = c.req.header("X-Persona-Id");
    if (!personaId) {
      return c.json(
        { error: { code: "missing_persona_id", message: "X-Persona-Id header required" } },
        401,
      );
    }

    const parsed = uuidSchema.safeParse(personaId);
    if (!parsed.success) {
      return c.json(
        { error: { code: "invalid_persona_id", message: "X-Persona-Id is not a UUID" } },
        401,
      );
    }

    const persona = await deps.personas.findById(parsed.data);
    if (persona === null) {
      return c.json(
        { error: { code: "persona_not_found", message: parsed.data } },
        404,
      );
    }

    c.set("persona", persona);
    await next();
  };
}

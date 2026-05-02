import { Hono } from "hono";
import { cors } from "hono/cors";
import pino, { type Logger } from "pino";

import { authMiddleware, type AuthVariables } from "./middleware/auth.js";
import { errorHandler } from "./middleware/error.js";
import { loggerMiddleware, type LoggerVariables } from "./middleware/logger.js";
import { healthRoute } from "./routes/health.js";
import { meRoute } from "./routes/me.js";
import type { PersonaService } from "./services/persona.js";
import type { AuthMode } from "./types/domain.js";

export type AppDeps = {
  personaService: PersonaService;
  authMode: AuthMode;
  logger?: Logger;
  corsAllowOrigins?: string;
};

export type AppVariables = AuthVariables & LoggerVariables;

export function createApp(deps: AppDeps) {
  const app = new Hono<{ Variables: AppVariables }>();
  const logger = deps.logger ?? pino({ level: "silent" });
  const allowOrigins = deps.corsAllowOrigins ?? "*";

  app.use(
    "*",
    cors({
      origin: allowOrigins === "*" ? "*" : allowOrigins.split(","),
    }),
  );
  app.use("*", loggerMiddleware(logger));
  app.onError(errorHandler(logger));

  app.route("/health", healthRoute);

  const protectedRoutes = new Hono<{ Variables: AppVariables }>();
  protectedRoutes.use(
    "*",
    authMiddleware({ mode: deps.authMode, personas: deps.personaService }),
  );
  protectedRoutes.route("/me", meRoute);

  app.route("/", protectedRoutes);

  return app;
}

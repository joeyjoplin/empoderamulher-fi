import { Hono } from "hono";
import { cors } from "hono/cors";
import pino, { type Logger } from "pino";

import { authMiddleware, type AuthVariables } from "./middleware/auth.js";
import { errorHandler } from "./middleware/error.js";
import { loggerMiddleware, type LoggerVariables } from "./middleware/logger.js";
import { chatRoute } from "./routes/chat.js";
import { creditRoute } from "./routes/credit.js";
import { healthRoute } from "./routes/health.js";
import { insightsRoute } from "./routes/insights.js";
import { meRoute } from "./routes/me.js";
import { scoreRoute } from "./routes/score.js";
import type { ChatService } from "./services/chat.js";
import type { InsightsService } from "./services/insights.js";
import type { LoanRepository, LoanService } from "./services/loans.js";
import type { PersonaService } from "./services/persona.js";
import type { ScoreService } from "./services/score_service.js";
import type { AuthMode } from "./types/domain.js";

export type AppDeps = {
  personaService: PersonaService;
  insightsService: InsightsService;
  loanService: LoanService;
  loanRepository: LoanRepository;
  scoreService: ScoreService;
  chatService: ChatService;
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
  protectedRoutes.route("/insights", insightsRoute({ insights: deps.insightsService }));
  protectedRoutes.route(
    "/credit",
    creditRoute({
      loans: deps.loanService,
      loanRepository: deps.loanRepository,
    }),
  );
  protectedRoutes.route("/score", scoreRoute({ score: deps.scoreService }));
  protectedRoutes.route("/chat", chatRoute({ chat: deps.chatService }));

  app.route("/", protectedRoutes);

  return app;
}

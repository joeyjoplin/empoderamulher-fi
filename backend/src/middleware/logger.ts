import { randomUUID } from "node:crypto";
import type { MiddlewareHandler } from "hono";
import pino, { type Logger } from "pino";

export type LoggerVariables = {
  requestId: string;
  logger: Logger;
};

export function createLogger(level: string): Logger {
  return pino({ level });
}

export function loggerMiddleware(
  rootLogger: Logger,
): MiddlewareHandler<{ Variables: LoggerVariables }> {
  return async (c, next) => {
    const requestId = c.req.header("X-Request-Id") ?? randomUUID();
    const logger = rootLogger.child({ requestId });
    c.set("requestId", requestId);
    c.set("logger", logger);
    c.header("X-Request-Id", requestId);

    const start = Date.now();
    await next();
    const duration = Date.now() - start;

    logger.info(
      {
        method: c.req.method,
        path: c.req.path,
        status: c.res.status,
        duration_ms: duration,
      },
      "request",
    );
  };
}

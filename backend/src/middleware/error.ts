import type { ErrorHandler } from "hono";
import type { Logger } from "pino";

export function errorHandler(rootLogger: Logger): ErrorHandler {
  return (err, c) => {
    const logger = (c.get("logger") as Logger | undefined) ?? rootLogger;
    logger.error({ err }, "unhandled error");
    return c.json(
      {
        error: {
          code: "internal_error",
          message: err.message ?? "Unexpected error",
        },
      },
      500,
    );
  };
}

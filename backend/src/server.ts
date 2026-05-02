import { serve } from "@hono/node-server";

import { createApp } from "./app.js";
import { loadEnv } from "./config/env.js";
import {
  DrizzlePersonaService,
  createDatabase,
  ping,
} from "./db/client.js";
import { createLogger } from "./middleware/logger.js";

async function main() {
  const env = loadEnv();
  const logger = createLogger(env.LOG_LEVEL);

  logger.info({ databaseUrl: env.DATABASE_URL.split("@")[1] }, "validating db connection");
  try {
    await ping(env.DATABASE_URL);
  } catch (err) {
    logger.fatal({ err }, "database ping failed at startup");
    process.exit(1);
  }

  const { db } = createDatabase(env.DATABASE_URL);
  const personaService = new DrizzlePersonaService(db);

  const app = createApp({
    personaService,
    authMode: env.AUTH_MODE,
    logger,
    corsAllowOrigins: env.CORS_ALLOW_ORIGINS,
  });

  logger.info({ port: env.PORT, authMode: env.AUTH_MODE }, "starting server");
  serve({ fetch: app.fetch, port: env.PORT });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

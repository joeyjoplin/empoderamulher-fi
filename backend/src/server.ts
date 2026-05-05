import { serve } from "@hono/node-server";

import { createApp } from "./app.js";
import { loadEnv } from "./config/env.js";
import {
  DrizzlePersonaService,
  createDatabase,
  ping,
} from "./db/client.js";
import { createLogger } from "./middleware/logger.js";
import { HttpChatService } from "./services/chat.js";
import { HttpInsightsService } from "./services/insights.js";
import {
  InMemoryLoanRepository,
  UnconfiguredLoanService,
  type LoanService,
} from "./services/loans.js";
import { OrchestratedScoreService } from "./services/orchestrated_score_service.js";
import {
  UnconfiguredScoreService,
  type ScoreService,
} from "./services/score_service.js";
import { createSolanaClient } from "./services/solana/index.js";
import { SolanaLoanService } from "./services/solana_loan_service.js";

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
  const insightsService = new HttpInsightsService({ baseUrl: env.AI_SERVICE_URL });
  const chatService = new HttpChatService({ baseUrl: env.AI_SERVICE_URL });

  let loanService: LoanService;
  let scoreService: ScoreService;
  if (env.SOLANA_RPC_URL && env.SOLANA_PAYER_SECRET_KEY) {
    const solanaClient = createSolanaClient({
      rpcUrl: env.SOLANA_RPC_URL,
      payerSecretKey: env.SOLANA_PAYER_SECRET_KEY,
    });
    loanService = new SolanaLoanService({
      client: solanaClient,
      airdropBorrower: env.SOLANA_AIRDROP_BORROWER,
    });
    logger.info(
      { rpcUrl: env.SOLANA_RPC_URL, airdrop: env.SOLANA_AIRDROP_BORROWER },
      "loan service: SolanaLoanService",
    );

    if (env.SCORE_HMAC_PEPPER) {
      scoreService = new OrchestratedScoreService({
        client: solanaClient,
        aiServiceUrl: env.AI_SERVICE_URL,
        hmacPepper: env.SCORE_HMAC_PEPPER,
      });
      logger.info("score service: OrchestratedScoreService");
    } else {
      scoreService = new UnconfiguredScoreService();
      logger.warn(
        "score service: unconfigured (set SCORE_HMAC_PEPPER to enable on-chain attest)",
      );
    }
  } else {
    loanService = new UnconfiguredLoanService();
    scoreService = new UnconfiguredScoreService();
    logger.warn(
      "loan + score services unconfigured (set SOLANA_RPC_URL + SOLANA_PAYER_SECRET_KEY)",
    );
  }
  const loanRepository = new InMemoryLoanRepository();

  const app = createApp({
    personaService,
    insightsService,
    loanService,
    loanRepository,
    scoreService,
    chatService,
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

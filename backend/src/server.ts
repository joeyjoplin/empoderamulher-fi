import { serve } from "@hono/node-server";

import { createApp } from "./app.js";
import { loadEnv } from "./config/env.js";
import {
  DrizzlePersonaService,
  createDatabase,
  ensureIndexerSchema,
  ping,
} from "./db/client.js";
import { createLogger } from "./middleware/logger.js";
import { HttpChatService } from "./services/chat.js";
import {
  ConnectionSignatureFetcher,
  DrizzleCursorStore,
  DrizzleEventStore,
  IndexerWorker,
} from "./services/indexer/index.js";
import { HttpInsightsService } from "./services/insights.js";
import {
  InMemoryLoanRepository,
  UnconfiguredLoanService,
  type LoanService,
} from "./services/loans.js";
import {
  InMemoryMarketplaceRepository,
  UnconfiguredMarketplaceService,
  type MarketplaceService,
} from "./services/marketplace.js";
import { OrchestratedScoreService } from "./services/orchestrated_score_service.js";
import { SolanaMarketplaceService } from "./services/solana_marketplace_service.js";
import {
  OrchestratedPublicScoreService,
  UnconfiguredPublicScoreService,
  type PublicScoreService,
} from "./services/public_score_service.js";
import {
  UnconfiguredScoreService,
  type ScoreService,
} from "./services/score_service.js";
import { createSolanaClient, PROGRAM_IDS } from "./services/solana/index.js";
import collateralPoolIdl from "./services/solana/idl/collateral_pool.json" with { type: "json" };
import loanOriginationIdl from "./services/solana/idl/loan_origination.json" with { type: "json" };
import marketplaceIdl from "./services/solana/idl/marketplace.json" with { type: "json" };
import rwaTokenIdl from "./services/solana/idl/rwa_token.json" with { type: "json" };
import scoreIdl from "./services/solana/idl/score.json" with { type: "json" };
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

  await ensureIndexerSchema(db);

  let loanService: LoanService;
  let scoreService: ScoreService;
  let publicScoreService: PublicScoreService = new UnconfiguredPublicScoreService();
  let marketplaceService: MarketplaceService = new UnconfiguredMarketplaceService();
  let indexer: IndexerWorker | null = null;
  if (env.SOLANA_RPC_URL && env.SOLANA_PAYER_SECRET_KEY) {
    const solanaClient = createSolanaClient({
      rpcUrl: env.SOLANA_RPC_URL,
      payerSecretKey: env.SOLANA_PAYER_SECRET_KEY,
    });
    loanService = new SolanaLoanService({
      client: solanaClient,
      airdropBorrower: env.SOLANA_AIRDROP_BORROWER,
    });
    marketplaceService = new SolanaMarketplaceService({
      client: solanaClient,
      airdropSigners: env.SOLANA_AIRDROP_BORROWER,
    });
    logger.info(
      { rpcUrl: env.SOLANA_RPC_URL, airdrop: env.SOLANA_AIRDROP_BORROWER },
      "loan + marketplace services: Solana orchestrators",
    );

    if (env.SCORE_HMAC_PEPPER) {
      scoreService = new OrchestratedScoreService({
        client: solanaClient,
        aiServiceUrl: env.AI_SERVICE_URL,
        hmacPepper: env.SCORE_HMAC_PEPPER,
      });
      publicScoreService = new OrchestratedPublicScoreService({
        client: solanaClient,
        hmacPepper: env.SCORE_HMAC_PEPPER,
      });
      logger.info("score service: OrchestratedScoreService (public + persona)");
    } else {
      scoreService = new UnconfiguredScoreService();
      logger.warn(
        "score service: unconfigured (set SCORE_HMAC_PEPPER to enable on-chain attest)",
      );
    }

    indexer = new IndexerWorker({
      programs: [
        {
          name: "rwa_token",
          programId: PROGRAM_IDS.rwaToken,
          idl: rwaTokenIdl as never,
        },
        {
          name: "collateral_pool",
          programId: PROGRAM_IDS.collateralPool,
          idl: collateralPoolIdl as never,
        },
        {
          name: "loan_origination",
          programId: PROGRAM_IDS.loanOrigination,
          idl: loanOriginationIdl as never,
        },
        {
          name: "score",
          programId: PROGRAM_IDS.score,
          idl: scoreIdl as never,
        },
        {
          name: "marketplace",
          programId: PROGRAM_IDS.marketplace,
          idl: marketplaceIdl as never,
        },
      ],
      fetcher: new ConnectionSignatureFetcher(solanaClient.connection),
      events: new DrizzleEventStore(db),
      cursors: new DrizzleCursorStore(db),
      logger,
      pollIntervalMs: env.INDEXER_POLL_INTERVAL_MS,
    });
    indexer.start();
  } else {
    loanService = new UnconfiguredLoanService();
    scoreService = new UnconfiguredScoreService();
    logger.warn(
      "loan + score services unconfigured (set SOLANA_RPC_URL + SOLANA_PAYER_SECRET_KEY)",
    );
    logger.warn("indexer worker disabled (no Solana client available)");
  }
  const loanRepository = new InMemoryLoanRepository();
  const marketplaceRepository = new InMemoryMarketplaceRepository();

  const app = createApp({
    personaService,
    insightsService,
    loanService,
    loanRepository,
    marketplaceService,
    marketplaceRepository,
    scoreService,
    publicScoreService,
    chatService,
    authMode: env.AUTH_MODE,
    logger,
    corsAllowOrigins: env.CORS_ALLOW_ORIGINS,
  });

  logger.info({ port: env.PORT, authMode: env.AUTH_MODE }, "starting server");
  serve({ fetch: app.fetch, port: env.PORT });

  const shutdown = async (signal: string) => {
    logger.info({ signal }, "shutting down");
    if (indexer) await indexer.stop();
    process.exit(0);
  };
  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

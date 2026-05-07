import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.string().min(1),
  AUTH_MODE: z.enum(["mock", "web3auth"]).default("mock"),
  AI_SERVICE_URL: z.string().url().default("http://localhost:8000"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),
  CORS_ALLOW_ORIGINS: z.string().default("*"),
  SCORE_HMAC_PEPPER: z.string().min(32).optional(),
  SOLANA_RPC_URL: z.string().url().optional(),
  SOLANA_PAYER_SECRET_KEY: z.string().min(1).optional(),
  SOLANA_AIRDROP_BORROWER: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  INDEXER_POLL_INTERVAL_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(10_000),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(input: NodeJS.ProcessEnv = process.env): Env {
  return envSchema.parse(input);
}

import {
  bigint,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const personas = pgTable("personas", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull(),
  businessType: text("business_type").notNull(),
  city: text("city"),
  monthlyRevenueAvg: numeric("monthly_revenue_avg", {
    precision: 12,
    scale: 2,
  }).notNull(),
  stage: integer("stage").notNull(),
  walletPubkey: text("wallet_pubkey"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

/**
 * On-chain events captured by the indexer worker. One row per (signature,
 * eventIndex). The `eventIndex` disambiguates multiple events emitted by the
 * same transaction so the unique index acts as the idempotency key when the
 * worker reprocesses an overlapping signature window after a restart.
 */
export const impactEvents = pgTable(
  "impact_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    programId: text("program_id").notNull(),
    programName: text("program_name").notNull(),
    eventName: text("event_name").notNull(),
    signature: text("signature").notNull(),
    slot: bigint("slot", { mode: "number" }).notNull(),
    blockTime: timestamp("block_time", { withTimezone: true }),
    eventIndex: integer("event_index").notNull(),
    payload: jsonb("payload").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("impact_events_signature_event_idx").on(
      table.signature,
      table.eventIndex,
    ),
    index("impact_events_program_block_idx").on(
      table.programName,
      table.blockTime,
    ),
  ],
);

/**
 * Per-program cursor for the indexer's polling loop. Stores the most recent
 * confirmed signature seen so the worker can ask `getSignaturesForAddress`
 * for everything newer on the next tick.
 */
export const indexerCursors = pgTable("indexer_cursors", {
  programId: text("program_id").primaryKey(),
  programName: text("program_name").notNull(),
  lastSignature: text("last_signature"),
  lastSlot: bigint("last_slot", { mode: "number" }),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

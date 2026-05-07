import { drizzle } from "drizzle-orm/postgres-js";
import { eq, sql } from "drizzle-orm";
import postgres from "postgres";

import type { PersonaService } from "../services/persona.js";
import type { Persona } from "../types/domain.js";
import { personas } from "./schema.js";

export type Database = ReturnType<typeof drizzle>;

/**
 * Idempotent bootstrap for the indexer-owned tables. The AI service uses
 * SQLAlchemy `create_all` for `personas` / `transactions`; this is the
 * equivalent for the backend's own tables. No migration framework yet —
 * acceptable for the hackathon, swap for drizzle-kit when scope allows.
 */
export async function ensureIndexerSchema(db: Database): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS impact_events (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      program_id text NOT NULL,
      program_name text NOT NULL,
      event_name text NOT NULL,
      signature text NOT NULL,
      slot bigint NOT NULL,
      block_time timestamptz,
      event_index integer NOT NULL,
      payload jsonb NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS impact_events_signature_event_idx
      ON impact_events (signature, event_index)
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS impact_events_program_block_idx
      ON impact_events (program_name, block_time)
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS indexer_cursors (
      program_id text PRIMARY KEY,
      program_name text NOT NULL,
      last_signature text,
      last_slot bigint,
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

export function createDatabase(databaseUrl: string): {
  db: Database;
  close: () => Promise<void>;
} {
  const client = postgres(databaseUrl, { max: 10 });
  const db = drizzle(client);
  return {
    db,
    close: () => client.end({ timeout: 5 }),
  };
}

export async function ping(
  databaseUrl: string,
  { timeoutMs = 3000 }: { timeoutMs?: number } = {},
): Promise<void> {
  const client = postgres(databaseUrl, { max: 1, connect_timeout: 3 });
  try {
    await Promise.race([
      client`SELECT 1`,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("db ping timeout")), timeoutMs),
      ),
    ]);
  } finally {
    await client.end({ timeout: 1 });
  }
}

export class DrizzlePersonaService implements PersonaService {
  constructor(private readonly db: Database) {}

  async findById(id: string): Promise<Persona | null> {
    const rows = await this.db
      .select()
      .from(personas)
      .where(eq(personas.id, id))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      businessType: row.businessType,
      city: row.city,
      monthlyRevenueAvg: row.monthlyRevenueAvg,
      stage: row.stage,
      walletPubkey: row.walletPubkey,
    };
  }
}

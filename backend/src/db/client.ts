import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import postgres from "postgres";

import type { PersonaService } from "../services/persona.js";
import type { Persona } from "../types/domain.js";
import { personas } from "./schema.js";

export type Database = ReturnType<typeof drizzle>;

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

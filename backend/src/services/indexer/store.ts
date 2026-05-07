/**
 * Persistence boundary for the indexer worker.
 *
 * Splitting `EventStore` and `CursorStore` keeps the worker's polling logic
 * trivially testable with in-memory fakes — no Postgres needed for unit
 * tests. The Drizzle implementations are thin and mirror what the worker
 * does in production.
 */

import { eq, sql } from "drizzle-orm";

import type { Database } from "../../db/client.js";
import { impactEvents, indexerCursors } from "../../db/schema.js";
import type { ParsedEvent } from "./events.js";

export type ImpactEventRow = {
  programId: string;
  programName: string;
  signature: string;
  slot: number;
  blockTime: Date | null;
} & ParsedEvent;

export interface EventStore {
  /**
   * Persist a batch of events. Implementations MUST be idempotent on
   * (signature, eventIndex): the worker reprocesses overlapping windows on
   * restart and must not double-write rows.
   */
  insertEvents(rows: ImpactEventRow[]): Promise<void>;
}

export type Cursor = {
  programName: string;
  lastSignature: string | null;
  lastSlot: number | null;
};

export interface CursorStore {
  load(programId: string): Promise<Cursor | null>;
  save(
    programId: string,
    cursor: { programName: string; lastSignature: string; lastSlot: number },
  ): Promise<void>;
}

export class DrizzleEventStore implements EventStore {
  constructor(private readonly db: Database) {}

  async insertEvents(rows: ImpactEventRow[]): Promise<void> {
    if (rows.length === 0) return;
    await this.db
      .insert(impactEvents)
      .values(
        rows.map((r) => ({
          programId: r.programId,
          programName: r.programName,
          eventName: r.eventName,
          signature: r.signature,
          slot: r.slot,
          blockTime: r.blockTime,
          eventIndex: r.eventIndex,
          payload: r.payload,
        })),
      )
      .onConflictDoNothing({
        target: [impactEvents.signature, impactEvents.eventIndex],
      });
  }
}

export class DrizzleCursorStore implements CursorStore {
  constructor(private readonly db: Database) {}

  async load(programId: string): Promise<Cursor | null> {
    const rows = await this.db
      .select()
      .from(indexerCursors)
      .where(eq(indexerCursors.programId, programId))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    return {
      programName: row.programName,
      lastSignature: row.lastSignature,
      lastSlot: row.lastSlot,
    };
  }

  async save(
    programId: string,
    cursor: { programName: string; lastSignature: string; lastSlot: number },
  ): Promise<void> {
    await this.db
      .insert(indexerCursors)
      .values({
        programId,
        programName: cursor.programName,
        lastSignature: cursor.lastSignature,
        lastSlot: cursor.lastSlot,
      })
      .onConflictDoUpdate({
        target: indexerCursors.programId,
        set: {
          programName: cursor.programName,
          lastSignature: cursor.lastSignature,
          lastSlot: cursor.lastSlot,
          updatedAt: sql`now()`,
        },
      });
  }
}

export class InMemoryEventStore implements EventStore {
  readonly rows: ImpactEventRow[] = [];

  async insertEvents(rows: ImpactEventRow[]): Promise<void> {
    for (const row of rows) {
      const dup = this.rows.some(
        (r) => r.signature === row.signature && r.eventIndex === row.eventIndex,
      );
      if (!dup) this.rows.push(row);
    }
  }
}

export class InMemoryCursorStore implements CursorStore {
  private readonly cursors = new Map<string, Cursor>();

  async load(programId: string): Promise<Cursor | null> {
    return this.cursors.get(programId) ?? null;
  }

  async save(
    programId: string,
    cursor: { programName: string; lastSignature: string; lastSlot: number },
  ): Promise<void> {
    this.cursors.set(programId, {
      programName: cursor.programName,
      lastSignature: cursor.lastSignature,
      lastSlot: cursor.lastSlot,
    });
  }
}

/**
 * Read-side wrapper over `impact_events`. The dashboard route only needs
 * "the last N relevant events", so the repository projects rows to a
 * minimal `ImpactEvent` shape — the route doesn't see Drizzle types.
 *
 * Splitting this out keeps the route trivially testable with an in-memory
 * fake (no Postgres needed for unit tests, mirroring the indexer's store
 * pattern in `services/indexer/store.ts`).
 */

import { desc } from "drizzle-orm";

import type { Database } from "../db/client.js";
import { impactEvents } from "../db/schema.js";

export type ImpactEvent = {
  programName: string;
  eventName: string;
  signature: string;
  eventIndex: number;
  blockTime: Date | null;
  payload: Record<string, unknown>;
};

export interface ImpactRepository {
  /**
   * Newest-first slice of events captured by the indexer. Callers filter
   * + project further; the repository stays storage-shaped.
   */
  recentEvents(limit: number): Promise<ImpactEvent[]>;
}

export class DrizzleImpactRepository implements ImpactRepository {
  constructor(private readonly db: Database) {}

  async recentEvents(limit: number): Promise<ImpactEvent[]> {
    const rows = await this.db
      .select({
        programName: impactEvents.programName,
        eventName: impactEvents.eventName,
        signature: impactEvents.signature,
        eventIndex: impactEvents.eventIndex,
        blockTime: impactEvents.blockTime,
        payload: impactEvents.payload,
      })
      .from(impactEvents)
      .orderBy(desc(impactEvents.blockTime), desc(impactEvents.slot))
      .limit(limit);
    return rows.map((r) => ({
      programName: r.programName,
      eventName: r.eventName,
      signature: r.signature,
      eventIndex: r.eventIndex,
      blockTime: r.blockTime,
      payload: (r.payload ?? {}) as Record<string, unknown>,
    }));
  }
}

export class InMemoryImpactRepository implements ImpactRepository {
  constructor(private events: ImpactEvent[] = []) {}

  /** Newest-first slice; mirrors the SQL ordering used in production. */
  async recentEvents(limit: number): Promise<ImpactEvent[]> {
    return [...this.events]
      .sort((a, b) => {
        const ta = a.blockTime?.getTime() ?? 0;
        const tb = b.blockTime?.getTime() ?? 0;
        return tb - ta;
      })
      .slice(0, limit);
  }

  setEvents(events: ImpactEvent[]): void {
    this.events = events;
  }
}

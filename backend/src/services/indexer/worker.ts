/**
 * Polling indexer worker.
 *
 * Every `pollIntervalMs`, for each registered program:
 *   1. ask `getSignaturesForAddress` for everything newer than the saved cursor
 *   2. fetch the full transaction for each signature (oldest → newest)
 *   3. parse Anchor events from the log lines and persist them
 *   4. advance the cursor to the most recent processed signature
 *
 * Trade-offs (hackathon scope):
 *   - polls per-program with `getSignaturesForAddress`; production would
 *     use Geyser or Helius webhooks
 *   - reprocess of overlapping windows is safe because `EventStore` is
 *     idempotent on (signature, eventIndex)
 */

import type { Logger } from "pino";
import { PublicKey, type Connection, type Finality } from "@solana/web3.js";

import {
  parseProgramEvents,
  registerPrograms,
  type ProgramRegistration,
  type RegisteredProgram,
} from "./events.js";
import type {
  CursorStore,
  EventStore,
  ImpactEventRow,
} from "./store.js";

export type SignatureInfo = {
  signature: string;
  slot: number;
  blockTime: number | null;
};

export type FetchedTransaction = {
  signature: string;
  slot: number;
  blockTime: number | null;
  logs: string[];
};

/**
 * Narrow Solana RPC surface the worker needs. Lets unit tests drive the
 * worker with a simple fake instead of stubbing the whole `Connection`.
 */
export interface SignatureFetcher {
  getSignaturesForAddress(
    address: PublicKey,
    options: { until?: string; limit: number },
  ): Promise<SignatureInfo[]>;
  getTransactionLogs(signature: string): Promise<FetchedTransaction | null>;
}

export class ConnectionSignatureFetcher implements SignatureFetcher {
  constructor(
    private readonly connection: Connection,
    private readonly commitment: Finality = "confirmed",
  ) {}

  async getSignaturesForAddress(
    address: PublicKey,
    options: { until?: string; limit: number },
  ): Promise<SignatureInfo[]> {
    const sigs = await this.connection.getSignaturesForAddress(address, {
      until: options.until,
      limit: options.limit,
    });
    return sigs
      .filter((s) => s.err === null)
      .map((s) => ({
        signature: s.signature,
        slot: s.slot,
        blockTime: s.blockTime ?? null,
      }));
  }

  async getTransactionLogs(
    signature: string,
  ): Promise<FetchedTransaction | null> {
    const tx = await this.connection.getTransaction(signature, {
      commitment: this.commitment,
      maxSupportedTransactionVersion: 0,
    });
    if (!tx) return null;
    return {
      signature,
      slot: tx.slot,
      blockTime: tx.blockTime ?? null,
      logs: tx.meta?.logMessages ?? [],
    };
  }
}

export type IndexerWorkerConfig = {
  programs: ProgramRegistration[];
  fetcher: SignatureFetcher;
  events: EventStore;
  cursors: CursorStore;
  logger?: Logger;
  /** Polling interval between full passes. Default 10s, per BLUEPRINT §2.6. */
  pollIntervalMs?: number;
  /** Max signatures to pull per pass per program. Caps recovery work. */
  signaturesPerPass?: number;
};

export class IndexerWorker {
  private readonly registered: RegisteredProgram[];
  private readonly fetcher: SignatureFetcher;
  private readonly events: EventStore;
  private readonly cursors: CursorStore;
  private readonly logger: Logger | undefined;
  private readonly pollIntervalMs: number;
  private readonly signaturesPerPass: number;

  private timer: NodeJS.Timeout | null = null;
  private inFlight: Promise<void> | null = null;
  private stopping = false;

  constructor(config: IndexerWorkerConfig) {
    this.registered = registerPrograms(config.programs);
    this.fetcher = config.fetcher;
    this.events = config.events;
    this.cursors = config.cursors;
    this.logger = config.logger;
    this.pollIntervalMs = config.pollIntervalMs ?? 10_000;
    this.signaturesPerPass = config.signaturesPerPass ?? 100;
  }

  start(): void {
    if (this.timer !== null) return;
    this.logger?.info(
      {
        programs: this.registered.map((p) => p.name),
        pollIntervalMs: this.pollIntervalMs,
      },
      "indexer: starting",
    );
    const tick = async () => {
      if (this.stopping) return;
      this.inFlight = this.runOnce().catch((err) => {
        this.logger?.error({ err }, "indexer: pass failed");
      });
      await this.inFlight;
      this.inFlight = null;
      if (!this.stopping) {
        this.timer = setTimeout(tick, this.pollIntervalMs);
      }
    };
    this.timer = setTimeout(tick, 0);
  }

  async stop(): Promise<void> {
    this.stopping = true;
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.inFlight) {
      await this.inFlight.catch(() => undefined);
    }
    this.logger?.info("indexer: stopped");
  }

  /** Run one pass across all programs. Public so tests can drive it deterministically. */
  async runOnce(): Promise<void> {
    for (const program of this.registered) {
      await this.runProgram(program);
    }
  }

  private async runProgram(program: RegisteredProgram): Promise<void> {
    const cursor = await this.cursors.load(program.programId);
    const until = cursor?.lastSignature ?? undefined;
    const programPubkey = new PublicKey(program.programId);

    const sigs = await this.fetcher.getSignaturesForAddress(programPubkey, {
      until,
      limit: this.signaturesPerPass,
    });
    if (sigs.length === 0) return;

    // `getSignaturesForAddress` returns newest-first; process oldest-first
    // so the cursor advances monotonically and a partial failure resumes
    // cleanly on the next pass.
    const ordered = [...sigs].reverse();

    let latest: SignatureInfo | null = null;
    for (const sig of ordered) {
      const tx = await this.fetcher.getTransactionLogs(sig.signature);
      if (!tx) {
        this.logger?.warn(
          { signature: sig.signature, program: program.name },
          "indexer: tx not found, skipping",
        );
        continue;
      }
      const parsed = parseProgramEvents(program, tx.logs);
      if (parsed.length > 0) {
        const rows: ImpactEventRow[] = parsed.map((evt) => ({
          ...evt,
          programId: program.programId,
          programName: program.name,
          signature: tx.signature,
          slot: tx.slot,
          blockTime: tx.blockTime ? new Date(tx.blockTime * 1000) : null,
        }));
        await this.events.insertEvents(rows);
        this.logger?.info(
          {
            program: program.name,
            signature: tx.signature,
            count: parsed.length,
            events: parsed.map((p) => p.eventName),
          },
          "indexer: persisted events",
        );
      }
      latest = sig;
    }

    if (latest) {
      await this.cursors.save(program.programId, {
        programName: program.name,
        lastSignature: latest.signature,
        lastSlot: latest.slot,
      });
    }
  }
}

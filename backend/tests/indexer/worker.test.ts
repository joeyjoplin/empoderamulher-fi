import { describe, expect, it } from "vitest";
import { Keypair, PublicKey } from "@solana/web3.js";

import loanOriginationIdl from "../../src/services/solana/idl/loan_origination.json" with { type: "json" };
import {
  IndexerWorker,
  InMemoryCursorStore,
  InMemoryEventStore,
  type FetchedTransaction,
  type SignatureFetcher,
  type SignatureInfo,
} from "../../src/services/indexer/index.js";
import { PROGRAM_IDS } from "../../src/services/solana/index.js";

function encodeLoanDisbursedLog(args: {
  loanId: bigint;
  borrower: Buffer;
  disbursedAt: bigint;
}): string {
  const discriminator = Buffer.from([223, 190, 120, 135, 68, 98, 8, 248]);
  const loanId = Buffer.alloc(8);
  loanId.writeBigUInt64LE(args.loanId);
  const disbursedAt = Buffer.alloc(8);
  disbursedAt.writeBigInt64LE(args.disbursedAt);
  const payload = Buffer.concat([
    discriminator,
    loanId,
    args.borrower,
    disbursedAt,
  ]);
  return `Program data: ${payload.toString("base64")}`;
}

class FakeFetcher implements SignatureFetcher {
  /** Newest-first signature feeds, keyed by program-id. Worker pops items per call. */
  signatureCalls: { address: string; until: string | undefined }[] = [];
  txCalls: string[] = [];

  constructor(
    private readonly signatureFeed: Map<string, SignatureInfo[][]>,
    private readonly txByGuessedSignature: Map<
      string,
      FetchedTransaction | null
    >,
  ) {}

  async getSignaturesForAddress(
    address: PublicKey,
    options: { until?: string; limit: number },
  ): Promise<SignatureInfo[]> {
    this.signatureCalls.push({
      address: address.toBase58(),
      until: options.until,
    });
    const feed = this.signatureFeed.get(address.toBase58()) ?? [];
    return feed.shift() ?? [];
  }

  async getTransactionLogs(
    signature: string,
  ): Promise<FetchedTransaction | null> {
    this.txCalls.push(signature);
    return this.txByGuessedSignature.get(signature) ?? null;
  }
}

const programs = [
  {
    name: "loan_origination",
    programId: PROGRAM_IDS.loanOrigination,
    idl: loanOriginationIdl as never,
  },
];

describe("IndexerWorker", () => {
  it("processes oldest → newest, persists events, advances the cursor", async () => {
    const borrower = Keypair.generate();
    const sigOldest: SignatureInfo = {
      signature: "sigOLD",
      slot: 100,
      blockTime: 1000,
    };
    const sigNewest: SignatureInfo = {
      signature: "sigNEW",
      slot: 110,
      blockTime: 2000,
    };
    const fetcher = new FakeFetcher(
      // getSignaturesForAddress returns newest-first
      new Map([[PROGRAM_IDS.loanOrigination, [[sigNewest, sigOldest]]]]),
      new Map([
        [
          "sigOLD",
          {
            signature: "sigOLD",
            slot: 100,
            blockTime: 1000,
            logs: [
              encodeLoanDisbursedLog({
                loanId: 1n,
                borrower: borrower.publicKey.toBuffer(),
                disbursedAt: 1000n,
              }),
            ],
          },
        ],
        [
          "sigNEW",
          {
            signature: "sigNEW",
            slot: 110,
            blockTime: 2000,
            logs: [
              encodeLoanDisbursedLog({
                loanId: 2n,
                borrower: borrower.publicKey.toBuffer(),
                disbursedAt: 2000n,
              }),
            ],
          },
        ],
      ]),
    );
    const events = new InMemoryEventStore();
    const cursors = new InMemoryCursorStore();
    const worker = new IndexerWorker({ programs, fetcher, events, cursors });

    await worker.runOnce();

    expect(events.rows).toHaveLength(2);
    expect(events.rows.map((r) => r.signature)).toEqual(["sigOLD", "sigNEW"]);
    expect(events.rows.map((r) => r.payload.loan_id)).toEqual(["1", "2"]);
    expect(events.rows[0]?.programName).toBe("loan_origination");
    expect(events.rows[0]?.blockTime?.toISOString()).toBe(
      new Date(1000 * 1000).toISOString(),
    );

    const cursor = await cursors.load(PROGRAM_IDS.loanOrigination);
    expect(cursor?.lastSignature).toBe("sigNEW");
    expect(cursor?.lastSlot).toBe(110);
  });

  it("resumes from the saved cursor on the next pass", async () => {
    const fetcher = new FakeFetcher(
      new Map([
        [
          PROGRAM_IDS.loanOrigination,
          [
            [{ signature: "sigA", slot: 1, blockTime: 0 }],
            // Second pass returns nothing — only sigA was on chain at that point.
            [],
          ],
        ],
      ]),
      new Map([
        ["sigA", { signature: "sigA", slot: 1, blockTime: 0, logs: [] }],
      ]),
    );
    const events = new InMemoryEventStore();
    const cursors = new InMemoryCursorStore();
    const worker = new IndexerWorker({ programs, fetcher, events, cursors });

    await worker.runOnce();
    await worker.runOnce();

    expect(fetcher.signatureCalls).toEqual([
      { address: PROGRAM_IDS.loanOrigination, until: undefined },
      { address: PROGRAM_IDS.loanOrigination, until: "sigA" },
    ]);
  });

  it("is idempotent: reprocessing the same signature does not duplicate rows", async () => {
    const borrower = Keypair.generate();
    const sig: SignatureInfo = {
      signature: "sigDUP",
      slot: 7,
      blockTime: 500,
    };
    const tx: FetchedTransaction = {
      signature: "sigDUP",
      slot: 7,
      blockTime: 500,
      logs: [
        encodeLoanDisbursedLog({
          loanId: 9n,
          borrower: borrower.publicKey.toBuffer(),
          disbursedAt: 500n,
        }),
      ],
    };
    const fetcher = new FakeFetcher(
      new Map([[PROGRAM_IDS.loanOrigination, [[sig], [sig]]]]),
      new Map([["sigDUP", tx]]),
    );
    const events = new InMemoryEventStore();
    const cursors = new InMemoryCursorStore();
    const worker = new IndexerWorker({ programs, fetcher, events, cursors });

    await worker.runOnce();
    await worker.runOnce();

    expect(events.rows).toHaveLength(1);
  });

  it("skips signatures whose transaction can't be fetched without crashing", async () => {
    const fetcher = new FakeFetcher(
      new Map([
        [
          PROGRAM_IDS.loanOrigination,
          [[{ signature: "sigGHOST", slot: 1, blockTime: 0 }]],
        ],
      ]),
      new Map([["sigGHOST", null]]),
    );
    const events = new InMemoryEventStore();
    const cursors = new InMemoryCursorStore();
    const worker = new IndexerWorker({ programs, fetcher, events, cursors });

    await worker.runOnce();

    expect(events.rows).toHaveLength(0);
    // Cursor stays unset so the missing tx is retried on the next pass.
    expect(await cursors.load(PROGRAM_IDS.loanOrigination)).toBeNull();
  });

  it("does nothing when there are no new signatures", async () => {
    const fetcher = new FakeFetcher(
      new Map([[PROGRAM_IDS.loanOrigination, [[]]]]),
      new Map(),
    );
    const events = new InMemoryEventStore();
    const cursors = new InMemoryCursorStore();
    const worker = new IndexerWorker({ programs, fetcher, events, cursors });

    await worker.runOnce();

    expect(fetcher.txCalls).toEqual([]);
    expect(events.rows).toHaveLength(0);
    expect(await cursors.load(PROGRAM_IDS.loanOrigination)).toBeNull();
  });
});

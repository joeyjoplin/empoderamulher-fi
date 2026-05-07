import { describe, expect, it } from "vitest";
import { Keypair } from "@solana/web3.js";

import loanOriginationIdl from "../../src/services/solana/idl/loan_origination.json" with { type: "json" };
import {
  parseProgramEvents,
  registerPrograms,
  normalisePayload,
} from "../../src/services/indexer/events.js";
import { PROGRAM_IDS } from "../../src/services/solana/index.js";

/**
 * Borsh-encode a LoanDisbursed event by hand. The discriminator + field
 * layout below come straight from `loan_origination.json` so this fixture
 * acts as a contract test: if the IDL changes (event renamed, field added),
 * the parser test breaks loudly instead of silently skipping events.
 *
 * Event layout (LoanDisbursed):
 *   - discriminator: 8 bytes
 *   - loan_id: u64 LE     (8 bytes)
 *   - borrower: pubkey    (32 bytes)
 *   - disbursed_at: i64 LE (8 bytes)
 */
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

describe("parseProgramEvents", () => {
  const [program] = registerPrograms([
    {
      name: "loan_origination",
      programId: PROGRAM_IDS.loanOrigination,
      idl: loanOriginationIdl as never,
    },
  ]);

  it("ignores logs that don't match the Anchor 'Program data:' framing", () => {
    const events = parseProgramEvents(program!, [
      "Program 99SfPmytt5sJrmCfvpjiG1WdPMCY9b9iNd8KLVdmBLPU invoke [1]",
      "Program log: Instruction: DisburseLoan",
      "Program 99SfPmytt5sJrmCfvpjiG1WdPMCY9b9iNd8KLVdmBLPU success",
    ]);
    expect(events).toEqual([]);
  });

  it("decodes a real Anchor event payload and normalises BN/PublicKey", () => {
    const borrower = Keypair.generate();
    const log = encodeLoanDisbursedLog({
      loanId: 1714000000123n,
      borrower: borrower.publicKey.toBuffer(),
      disbursedAt: 1714579800n,
    });

    const events = parseProgramEvents(program!, [
      "Program 99SfPmytt5sJrmCfvpjiG1WdPMCY9b9iNd8KLVdmBLPU invoke [1]",
      log,
      "Program 99SfPmytt5sJrmCfvpjiG1WdPMCY9b9iNd8KLVdmBLPU success",
    ]);

    expect(events).toHaveLength(1);
    expect(events[0]?.eventName).toBe("LoanDisbursed");
    expect(events[0]?.eventIndex).toBe(0);
    // Field names are preserved as snake_case from the IDL — Anchor's raw
    // BorshEventCoder doesn't camelCase them. Storing as-is keeps the JSONB
    // payload consistent with the on-chain event contract.
    expect(events[0]?.payload).toEqual({
      loan_id: "1714000000123",
      borrower: borrower.publicKey.toBase58(),
      disbursed_at: "1714579800",
    });
  });

  it("indexes multiple events from the same transaction in order", () => {
    const a = encodeLoanDisbursedLog({
      loanId: 1n,
      borrower: Keypair.generate().publicKey.toBuffer(),
      disbursedAt: 1000n,
    });
    const b = encodeLoanDisbursedLog({
      loanId: 2n,
      borrower: Keypair.generate().publicKey.toBuffer(),
      disbursedAt: 2000n,
    });
    const events = parseProgramEvents(program!, [a, "Program log: noise", b]);
    expect(events.map((e) => e.eventIndex)).toEqual([0, 1]);
    expect(events.map((e) => e.payload.loan_id)).toEqual(["1", "2"]);
  });

  it("skips program-data lines that don't decode under this program's IDL", () => {
    // A "Program data:" line whose discriminator doesn't match any event.
    const garbage = `Program data: ${Buffer.from("not-an-event").toString("base64")}`;
    const events = parseProgramEvents(program!, [garbage]);
    expect(events).toEqual([]);
  });
});

describe("normalisePayload", () => {
  it("recursively walks nested objects and arrays", () => {
    const borrower = Keypair.generate();
    const out = normalisePayload({
      nested: { pubkey: borrower.publicKey },
      list: [borrower.publicKey, 42],
    });
    expect(out).toEqual({
      nested: { pubkey: borrower.publicKey.toBase58() },
      list: [borrower.publicKey.toBase58(), 42],
    });
  });
});

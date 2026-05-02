import { PublicKey } from "@solana/web3.js";
import { describe, expect, it } from "vitest";

import {
  PROGRAM_IDS,
  loanConfigPda,
  loanIdLeBytes,
  loanPda,
  lockRecordPda,
  poolPda,
  poolVaultPda,
  repaymentSchedulePda,
  tokenConfigPda,
} from "../../src/services/solana/pdas.js";

const RWA_TOKEN = new PublicKey(PROGRAM_IDS.rwaToken);
const COLLATERAL_POOL = new PublicKey(PROGRAM_IDS.collateralPool);
const LOAN_ORIGINATION = new PublicKey(PROGRAM_IDS.loanOrigination);

describe("loanIdLeBytes", () => {
  it("encodes a u64 in little-endian, 8 bytes", () => {
    const buf = loanIdLeBytes(1n);
    expect(buf.length).toBe(8);
    expect(buf[0]).toBe(1);
    expect(buf[7]).toBe(0);
  });

  it("encodes a larger u64 correctly", () => {
    const buf = loanIdLeBytes(0x0102030405060708n);
    expect([...buf]).toEqual([0x08, 0x07, 0x06, 0x05, 0x04, 0x03, 0x02, 0x01]);
  });
});

describe("PDA helpers — determinism + seed correctness", () => {
  it("tokenConfigPda matches manual derivation with [TOKEN_CONFIG_SEED]", () => {
    const [via, _bump] = tokenConfigPda(RWA_TOKEN);
    const [manual] = PublicKey.findProgramAddressSync(
      [Buffer.from("rwa_token_config")],
      RWA_TOKEN,
    );
    expect(via.toBase58()).toBe(manual.toBase58());
  });

  it("poolPda and poolVaultPda match collateral_pool seeds", () => {
    const [pool] = poolPda(COLLATERAL_POOL);
    const [poolManual] = PublicKey.findProgramAddressSync(
      [Buffer.from("pool")],
      COLLATERAL_POOL,
    );
    const [vault] = poolVaultPda(COLLATERAL_POOL);
    const [vaultManual] = PublicKey.findProgramAddressSync(
      [Buffer.from("pool_vault")],
      COLLATERAL_POOL,
    );
    expect(pool.toBase58()).toBe(poolManual.toBase58());
    expect(vault.toBase58()).toBe(vaultManual.toBase58());
  });

  it("lockRecordPda includes loan_id_le_bytes", () => {
    const [via] = lockRecordPda(COLLATERAL_POOL, 42n);
    const [manual] = PublicKey.findProgramAddressSync(
      [Buffer.from("lock"), loanIdLeBytes(42n)],
      COLLATERAL_POOL,
    );
    expect(via.toBase58()).toBe(manual.toBase58());
  });

  it("loanConfigPda matches [LOAN_CONFIG_SEED]", () => {
    const [via] = loanConfigPda(LOAN_ORIGINATION);
    const [manual] = PublicKey.findProgramAddressSync(
      [Buffer.from("loan_config")],
      LOAN_ORIGINATION,
    );
    expect(via.toBase58()).toBe(manual.toBase58());
  });

  it("loanPda includes [LOAN_SEED, borrower, loan_id_le]", () => {
    const borrower = PublicKey.unique();
    const [via] = loanPda(LOAN_ORIGINATION, borrower, 7n);
    const [manual] = PublicKey.findProgramAddressSync(
      [Buffer.from("loan"), borrower.toBuffer(), loanIdLeBytes(7n)],
      LOAN_ORIGINATION,
    );
    expect(via.toBase58()).toBe(manual.toBase58());
  });

  it("repaymentSchedulePda includes [SCHEDULE_SEED, borrower, loan_id_le]", () => {
    const borrower = PublicKey.unique();
    const [via] = repaymentSchedulePda(LOAN_ORIGINATION, borrower, 9n);
    const [manual] = PublicKey.findProgramAddressSync(
      [Buffer.from("schedule"), borrower.toBuffer(), loanIdLeBytes(9n)],
      LOAN_ORIGINATION,
    );
    expect(via.toBase58()).toBe(manual.toBase58());
  });

  it("derived addresses are stable across calls", () => {
    const [a] = poolPda(COLLATERAL_POOL);
    const [b] = poolPda(COLLATERAL_POOL);
    expect(a.toBase58()).toBe(b.toBase58());
  });
});

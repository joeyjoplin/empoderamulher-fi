import { PublicKey } from "@solana/web3.js";

// Program IDs declared in smartcontracts/Anchor.toml. Hard-coded here so PDA
// derivations work without an Anchor provider.
export const PROGRAM_IDS = {
  rwaToken: "CwVqgcBCZtGPYtCrvkFfLpBwhEXLvsb8Cr3KMsiyK655",
  collateralPool: "9DqYSPMWaPBhoJ883KfgiaCiTgCWcZ9qhz4GBQ4CNrTw",
  loanOrigination: "99SfPmytt5sJrmCfvpjiG1WdPMCY9b9iNd8KLVdmBLPU",
} as const;

const TOKEN_CONFIG_SEED = Buffer.from("rwa_token_config");
const POOL_SEED = Buffer.from("pool");
const POOL_VAULT_SEED = Buffer.from("pool_vault");
const LOCK_SEED = Buffer.from("lock");
const LOAN_CONFIG_SEED = Buffer.from("loan_config");
const LOAN_SEED = Buffer.from("loan");
const SCHEDULE_SEED = Buffer.from("schedule");

/**
 * Encode a u64 loan id as 8 little-endian bytes.
 * Mirrors `loan_id.to_le_bytes()` in the on-chain program seed derivation.
 */
export function loanIdLeBytes(loanId: bigint): Buffer {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(loanId);
  return buf;
}

export function tokenConfigPda(rwaTokenProgramId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([TOKEN_CONFIG_SEED], rwaTokenProgramId);
}

export function poolPda(collateralPoolProgramId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([POOL_SEED], collateralPoolProgramId);
}

export function poolVaultPda(
  collateralPoolProgramId: PublicKey,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [POOL_VAULT_SEED],
    collateralPoolProgramId,
  );
}

export function lockRecordPda(
  collateralPoolProgramId: PublicKey,
  loanId: bigint,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [LOCK_SEED, loanIdLeBytes(loanId)],
    collateralPoolProgramId,
  );
}

export function loanConfigPda(
  loanOriginationProgramId: PublicKey,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [LOAN_CONFIG_SEED],
    loanOriginationProgramId,
  );
}

export function loanPda(
  loanOriginationProgramId: PublicKey,
  borrower: PublicKey,
  loanId: bigint,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [LOAN_SEED, borrower.toBuffer(), loanIdLeBytes(loanId)],
    loanOriginationProgramId,
  );
}

export function repaymentSchedulePda(
  loanOriginationProgramId: PublicKey,
  borrower: PublicKey,
  loanId: bigint,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SCHEDULE_SEED, borrower.toBuffer(), loanIdLeBytes(loanId)],
    loanOriginationProgramId,
  );
}

import { PublicKey } from "@solana/web3.js";

// Program IDs declared in smartcontracts/Anchor.toml. Hard-coded here so PDA
// derivations work without an Anchor provider.
export const PROGRAM_IDS = {
  rwaToken: "CwVqgcBCZtGPYtCrvkFfLpBwhEXLvsb8Cr3KMsiyK655",
  collateralPool: "9DqYSPMWaPBhoJ883KfgiaCiTgCWcZ9qhz4GBQ4CNrTw",
  loanOrigination: "99SfPmytt5sJrmCfvpjiG1WdPMCY9b9iNd8KLVdmBLPU",
  score: "HiFPcEVC89FHAYTRS5gHMDRGCS8YBMpKrTTcXVqLKP5d",
} as const;

const TOKEN_CONFIG_SEED = Buffer.from("rwa_token_config");
const POOL_SEED = Buffer.from("pool");
const POOL_VAULT_SEED = Buffer.from("pool_vault");
const LOCK_SEED = Buffer.from("lock");
const LOAN_CONFIG_SEED = Buffer.from("loan_config");
const LOAN_SEED = Buffer.from("loan");
const SCHEDULE_SEED = Buffer.from("schedule");
const SCORE_CONFIG_SEED = Buffer.from("score_config");
const SCORE_SEED = Buffer.from("score");

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

export function scoreConfigPda(
  scoreProgramId: PublicKey,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([SCORE_CONFIG_SEED], scoreProgramId);
}

export function scorePda(
  scoreProgramId: PublicKey,
  cnpjHmac: Uint8Array,
): [PublicKey, number] {
  if (cnpjHmac.length !== 32) {
    throw new Error("cnpjHmac must be exactly 32 bytes (HMAC-SHA256 output)");
  }
  return PublicKey.findProgramAddressSync(
    [SCORE_SEED, Buffer.from(cnpjHmac)],
    scoreProgramId,
  );
}

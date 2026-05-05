import { createHmac } from "node:crypto";
import { PublicKey, SystemProgram } from "@solana/web3.js";

import type { SolanaClient } from "./client.js";
import { scoreConfigPda, scorePda } from "./pdas.js";

export type TxResult = { signature: string };

/**
 * Derive the privacy-preserving CNPJ key used as the on-chain seed.
 *
 * The raw CNPJ never appears on-chain. We use HMAC-SHA256 (not plain SHA-256)
 * because the CNPJ space is finite (~10⁹ active values) and would otherwise be
 * brute-forceable. The pepper lives in `SCORE_HMAC_PEPPER` and must never leak.
 *
 * Both `cnpj` and `pepper` may be passed as strings (utf-8) or raw bytes.
 */
export function cnpjHmac(cnpj: string | Uint8Array, pepper: string | Uint8Array): Uint8Array {
  const cnpjBytes = typeof cnpj === "string" ? cnpjDigits(cnpj) : cnpj;
  const pepperBytes = typeof pepper === "string" ? Buffer.from(pepper, "utf8") : pepper;
  return createHmac("sha256", pepperBytes).update(cnpjBytes).digest();
}

function cnpjDigits(cnpj: string): Buffer {
  const digits = cnpj.replace(/\D/g, "");
  if (digits.length !== 14) {
    throw new Error(`CNPJ must have exactly 14 digits, got ${digits.length}`);
  }
  return Buffer.from(digits, "utf8");
}

export type ScoreBreakdown = {
  discipline: number;
  organization: number;
  cashFlow: number;
  engagement: number;
};

export type InitializeScoreConfigParams = {
  attestor: PublicKey;
};

export type InitializeScoreConfigResult = TxResult & {
  config: string;
};

export async function initializeScoreConfig(
  client: SolanaClient,
  params: InitializeScoreConfigParams,
): Promise<InitializeScoreConfigResult> {
  const [config] = scoreConfigPda(client.programIds.score);

  const signature = await client.programs.score.methods
    .initializeScoreConfig(params.attestor)
    .accountsPartial({
      authority: client.payer.publicKey,
      config,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return { signature, config: config.toBase58() };
}

export type AttestScoreParams = {
  cnpjHmac: Uint8Array;
  total: number;
  breakdown: ScoreBreakdown;
};

export type AttestScoreResult = TxResult & {
  score: string;
};

export async function attestScore(
  client: SolanaClient,
  params: AttestScoreParams,
): Promise<AttestScoreResult> {
  if (params.cnpjHmac.length !== 32) {
    throw new Error("cnpjHmac must be exactly 32 bytes");
  }
  const [config] = scoreConfigPda(client.programIds.score);
  const [score] = scorePda(client.programIds.score, params.cnpjHmac);

  const signature = await client.programs.score.methods
    .attestScore(Array.from(params.cnpjHmac), params.total, {
      discipline: params.breakdown.discipline,
      organization: params.breakdown.organization,
      cashFlow: params.breakdown.cashFlow,
      engagement: params.breakdown.engagement,
    })
    .accountsPartial({
      attestor: client.payer.publicKey,
      config,
      score,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return { signature, score: score.toBase58() };
}

export type FetchScoreResult = {
  cnpjHmac: Uint8Array;
  totalScore: number;
  disciplineScore: number;
  organizationScore: number;
  cashFlowScore: number;
  engagementScore: number;
  lastUpdatedAt: number;
  attestor: string;
};

export async function fetchScore(
  client: SolanaClient,
  cnpjHmacBytes: Uint8Array,
): Promise<FetchScoreResult | null> {
  const [score] = scorePda(client.programIds.score, cnpjHmacBytes);
  try {
    const account = await client.programs.score.account.score.fetch(score);
    return {
      cnpjHmac: new Uint8Array(account.cnpjHmac),
      totalScore: account.totalScore,
      disciplineScore: account.disciplineScore,
      organizationScore: account.organizationScore,
      cashFlowScore: account.cashFlowScore,
      engagementScore: account.engagementScore,
      lastUpdatedAt: account.lastUpdatedAt.toNumber(),
      attestor: account.attestor.toBase58(),
    };
  } catch (err) {
    if (err instanceof Error && /Account does not exist/i.test(err.message)) {
      return null;
    }
    throw err;
  }
}

export type RevokeScoreParams = {
  cnpjHmac: Uint8Array;
  recipient?: PublicKey;
};

export async function revokeScore(
  client: SolanaClient,
  params: RevokeScoreParams,
): Promise<TxResult> {
  if (params.cnpjHmac.length !== 32) {
    throw new Error("cnpjHmac must be exactly 32 bytes");
  }
  const [config] = scoreConfigPda(client.programIds.score);
  const [score] = scorePda(client.programIds.score, params.cnpjHmac);

  const signature = await client.programs.score.methods
    .revokeScore(Array.from(params.cnpjHmac))
    .accountsPartial({
      attestor: client.payer.publicKey,
      config,
      score,
      recipient: params.recipient ?? client.payer.publicKey,
    })
    .rpc();

  return { signature };
}

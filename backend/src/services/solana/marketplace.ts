/**
 * Typed wrappers for the marketplace Anchor program. Mirrors the same
 * pattern as `loan.ts` — domain types in / TxResult out, no Anchor IDL
 * leakage to the rest of the backend.
 */

import BN from "bn.js";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";

import type { SolanaClient } from "./client.js";

export type TxResult = { signature: string };

export type PaymentCategory = "supplies" | "packaging" | "services" | "other";

const PAYMENT_SEED = Buffer.from("payment");
const BNPL_SEED = Buffer.from("bnpl");

/**
 * Encode a u64 nonce as 8 little-endian bytes — mirrors `nonce.to_le_bytes()`
 * in the on-chain seed derivation.
 */
export function nonceLeBytes(nonce: bigint): Buffer {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(nonce);
  return buf;
}

export function paymentRequestPda(
  marketplaceProgramId: PublicKey,
  buyer: PublicKey,
  provider: PublicKey,
  nonce: bigint,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [PAYMENT_SEED, buyer.toBuffer(), provider.toBuffer(), nonceLeBytes(nonce)],
    marketplaceProgramId,
  );
}

export function bnplPlanPda(
  marketplaceProgramId: PublicKey,
  paymentRequest: PublicKey,
  buyer: PublicKey,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [BNPL_SEED, paymentRequest.toBuffer(), buyer.toBuffer()],
    marketplaceProgramId,
  );
}

/**
 * Anchor's IDL coder serialises Rust enums as `{ variant: {} }` on the wire.
 * Centralised here so callers pass a string and never have to remember the
 * shape.
 */
function encodeCategory(
  category: PaymentCategory,
): { supplies: Record<string, never> }
  | { packaging: Record<string, never> }
  | { services: Record<string, never> }
  | { other: Record<string, never> } {
  switch (category) {
    case "supplies":
      return { supplies: {} };
    case "packaging":
      return { packaging: {} };
    case "services":
      return { services: {} };
    case "other":
      return { other: {} };
  }
}

export type CreatePaymentRequestParams = {
  providerSigner: Keypair;
  buyer: PublicKey;
  nonce: bigint;
  amount: bigint;
  category: PaymentCategory;
  memo: string;
};

export type CreatePaymentRequestResult = TxResult & {
  request: string;
};

export async function createPaymentRequest(
  client: SolanaClient,
  params: CreatePaymentRequestParams,
): Promise<CreatePaymentRequestResult> {
  const [request] = paymentRequestPda(
    client.programIds.marketplace,
    params.buyer,
    params.providerSigner.publicKey,
    params.nonce,
  );

  const signature = await client.programs.marketplace.methods
    .createPaymentRequest(
      new BN(params.nonce.toString()),
      new BN(params.amount.toString()),
      encodeCategory(params.category),
      params.memo,
    )
    .accountsPartial({
      provider: params.providerSigner.publicKey,
      buyer: params.buyer,
      request,
      systemProgram: SystemProgram.programId,
    })
    .signers([params.providerSigner])
    .rpc();

  return { signature, request: request.toBase58() };
}

export type PayRequestParams = {
  buyerSigner: Keypair;
  provider: PublicKey;
  nonce: bigint;
  /**
   * When this `pay_request` settles the supplier-upfront leg of a BNPL plan,
   * pass the plan PDA so the program emits `PaymentCompleted { bnpl: true }`.
   * Direct-pay callers leave this undefined — the wrapper passes `null` to
   * Anchor so it doesn't try to auto-derive a PDA that doesn't exist.
   */
  bnplPlan?: PublicKey | null;
};

export async function payRequest(
  client: SolanaClient,
  params: PayRequestParams,
): Promise<TxResult> {
  const [request] = paymentRequestPda(
    client.programIds.marketplace,
    params.buyerSigner.publicKey,
    params.provider,
    params.nonce,
  );

  const signature = await client.programs.marketplace.methods
    .payRequest(new BN(params.nonce.toString()))
    .accountsPartial({
      buyer: params.buyerSigner.publicKey,
      request,
      bnplPlan: params.bnplPlan ?? null,
    })
    .signers([params.buyerSigner])
    .rpc();

  return { signature };
}

export type CreateBnplRequestParams = {
  buyerSigner: Keypair;
  provider: PublicKey;
  nonce: bigint;
  principalAmount: bigint;
  totalRepayable: bigint;
  installmentCount: number;
  installmentAmount: bigint;
  firstDueAt: bigint;
  category: PaymentCategory;
  memo: string;
};

export type CreateBnplRequestResult = TxResult & {
  request: string;
  plan: string;
};

export async function createBnplRequest(
  client: SolanaClient,
  params: CreateBnplRequestParams,
): Promise<CreateBnplRequestResult> {
  const [request] = paymentRequestPda(
    client.programIds.marketplace,
    params.buyerSigner.publicKey,
    params.provider,
    params.nonce,
  );
  const [plan] = bnplPlanPda(
    client.programIds.marketplace,
    request,
    params.buyerSigner.publicKey,
  );

  const signature = await client.programs.marketplace.methods
    .createBnplRequest(
      new BN(params.nonce.toString()),
      new BN(params.principalAmount.toString()),
      new BN(params.totalRepayable.toString()),
      params.installmentCount,
      new BN(params.installmentAmount.toString()),
      new BN(params.firstDueAt.toString()),
      encodeCategory(params.category),
      params.memo,
    )
    .accountsPartial({
      buyer: params.buyerSigner.publicKey,
      provider: params.provider,
      request,
      plan,
      systemProgram: SystemProgram.programId,
    })
    .signers([params.buyerSigner])
    .rpc();

  return {
    signature,
    request: request.toBase58(),
    plan: plan.toBase58(),
  };
}

export type RecordInstallmentParams = {
  buyerSigner: Keypair;
  provider: PublicKey;
  nonce: bigint;
  installmentIndex: number;
};

export async function recordInstallment(
  client: SolanaClient,
  params: RecordInstallmentParams,
): Promise<TxResult> {
  const [request] = paymentRequestPda(
    client.programIds.marketplace,
    params.buyerSigner.publicKey,
    params.provider,
    params.nonce,
  );
  const [plan] = bnplPlanPda(
    client.programIds.marketplace,
    request,
    params.buyerSigner.publicKey,
  );

  const signature = await client.programs.marketplace.methods
    .recordInstallment(new BN(params.nonce.toString()), params.installmentIndex)
    .accountsPartial({
      buyer: params.buyerSigner.publicKey,
      request,
      plan,
    })
    .signers([params.buyerSigner])
    .rpc();

  return { signature };
}

export type CancelRequestParams = {
  cancellerSigner: Keypair;
  buyer: PublicKey;
  provider: PublicKey;
  nonce: bigint;
};

export async function cancelRequest(
  client: SolanaClient,
  params: CancelRequestParams,
): Promise<TxResult> {
  const [request] = paymentRequestPda(
    client.programIds.marketplace,
    params.buyer,
    params.provider,
    params.nonce,
  );

  const signature = await client.programs.marketplace.methods
    .cancelRequest(new BN(params.nonce.toString()))
    .accountsPartial({
      canceller: params.cancellerSigner.publicKey,
      request,
    })
    .signers([params.cancellerSigner])
    .rpc();

  return { signature };
}

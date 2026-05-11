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

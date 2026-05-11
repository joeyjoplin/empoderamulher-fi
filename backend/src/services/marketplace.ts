/**
 * Marketplace orchestration boundary.
 *
 * Mirrors `LoanService` in spirit: hides the on-chain `create →
 * pay` happy path behind a single async call so the HTTP route never
 * touches Anchor / Web3.js directly. The route just sees `hireProvider`
 * and a typed result with both transaction signatures.
 */

import type { PaymentCategory } from "./solana/marketplace.js";

export type HireSignatures = {
  create: string;
  pay: string;
};

export type CompletedHire = {
  /** PDA of the on-chain `PaymentRequest` account. */
  requestAddress: string;
  /** Decimal string — bigint nonce used to derive the PDA seed. */
  nonce: string;
  status: "paid";
  signatures: HireSignatures;
  amountCents: number;
  category: PaymentCategory;
  /** On-chain pubkey the backend signed as the buyer (ephemeral in MVP). */
  buyerPubkey: string;
  /** On-chain pubkey the backend signed as the provider (ephemeral in MVP). */
  providerPubkey: string;
};

export type HireProviderParams = {
  buyerPersonaId: string;
  providerPersonaId: string;
  amountCents: number;
  category: PaymentCategory;
  memo: string;
};

export interface MarketplaceService {
  hireProvider(params: HireProviderParams): Promise<CompletedHire>;
}

export type HireRecord = CompletedHire & {
  buyerPersonaId: string;
  providerPersonaId: string;
  memo: string;
  createdAt: Date;
};

export interface MarketplaceRepository {
  save(record: HireRecord): Promise<void>;
  /** Total `paid` hires this persona has originated. Drives the dashboard counter. */
  countHiresByBuyer(buyerPersonaId: string): Promise<number>;
}

export class InMemoryMarketplaceRepository implements MarketplaceRepository {
  readonly records: HireRecord[] = [];

  async save(record: HireRecord): Promise<void> {
    this.records.push(record);
  }

  async countHiresByBuyer(buyerPersonaId: string): Promise<number> {
    return this.records.filter((r) => r.buyerPersonaId === buyerPersonaId)
      .length;
  }
}

export class MarketplaceServiceError extends Error {
  override readonly name = "MarketplaceServiceError";
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

/** Throws on every call — installed when Solana env vars are missing. */
export class UnconfiguredMarketplaceService implements MarketplaceService {
  async hireProvider(): Promise<CompletedHire> {
    throw new MarketplaceServiceError(
      "marketplace_service_unconfigured",
      "MarketplaceService not configured — set SOLANA_RPC_URL + SOLANA_PAYER_SECRET_KEY",
    );
  }
}

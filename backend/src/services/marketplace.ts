/**
 * Marketplace orchestration boundary.
 *
 * Mirrors `LoanService` in spirit: hides the on-chain `create →
 * pay` happy path behind a single async call so the HTTP route never
 * touches Anchor / Web3.js directly. The route just sees `hireProvider`
 * and a typed result with both transaction signatures.
 *
 * For BNPL (TASK 4.2) the same boundary grows three more methods:
 * `quoteBnpl` (off-chain pricing), `hireBnpl` (on-chain create plan +
 * pay supplier upfront), and `recordInstallment` (record-only, idempotent
 * by `(planId, installmentIndex)`).
 */

import type { BnplQuoteOption, ScoreTier } from "./bnpl_pricing.js";
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

export type QuoteBnplParams = {
  buyerPersonaId: string;
  providerPersonaId: string;
  principalCents: number;
};

export type BnplQuote = {
  tier: ScoreTier;
  upfrontCents: number;
  maxInstallmentCount: number;
  options: BnplQuoteOption[];
};

export type HireBnplParams = {
  buyerPersonaId: string;
  providerPersonaId: string;
  principalCents: number;
  installmentCount: number;
  category: PaymentCategory;
  memo: string;
  /**
   * Unix epoch seconds when the first installment is due. Must be in the
   * future — the on-chain handler rejects anything `<= now`.
   */
  firstDueAt: number;
};

export type CompletedBnplHire = {
  planId: string;
  requestAddress: string;
  nonce: string;
  status: "active";
  signatures: { createPlan: string; paySupplier: string };
  principalCents: number;
  totalRepayableCents: number;
  installmentCount: number;
  installmentCents: number;
  interestRateBps: number;
  category: PaymentCategory;
  firstDueAt: number;
  buyerPubkey: string;
  providerPubkey: string;
};

export type RecordInstallmentParams = {
  buyerPersonaId: string;
  planId: string;
  installmentIndex: number;
};

export type RecordedInstallment = {
  planId: string;
  installmentIndex: number;
  paidInstallments: number;
  installmentCount: number;
  status: "active" | "completed";
  signature: string;
};

export interface MarketplaceService {
  hireProvider(params: HireProviderParams): Promise<CompletedHire>;
  quoteBnpl(params: QuoteBnplParams): Promise<BnplQuote>;
  hireBnpl(params: HireBnplParams): Promise<CompletedBnplHire>;
  recordInstallment(params: RecordInstallmentParams): Promise<RecordedInstallment>;
}

export type HireRecord = CompletedHire & {
  buyerPersonaId: string;
  providerPersonaId: string;
  memo: string;
  createdAt: Date;
};

export type BnplPlanRecord = {
  planId: string;
  requestAddress: string;
  buyerPersonaId: string;
  providerPersonaId: string;
  buyerPubkey: string;
  providerPubkey: string;
  /**
   * Base58 secret key the backend signed with. Kept ONLY so the buyer can
   * sign follow-up installments — never returned over the API. Will be
   * replaced by real wallet-side signing after Web3Auth lands properly.
   */
  buyerSecretKey: string;
  nonce: string;
  principalCents: number;
  totalRepayableCents: number;
  installmentCount: number;
  installmentCents: number;
  interestRateBps: number;
  paidInstallments: number;
  status: "active" | "completed";
  category: PaymentCategory;
  firstDueAt: number;
  memo: string;
  createdAt: Date;
  /** Signatures collected across the lifetime of the plan. */
  signatures: {
    createPlan: string;
    paySupplier: string;
    installments: string[];
  };
};

export type PublicBnplPlan = Omit<BnplPlanRecord, "buyerSecretKey">;

export interface MarketplaceRepository {
  save(record: HireRecord): Promise<void>;
  /** Total `paid` hires this persona has originated. Drives the dashboard counter. */
  countHiresByBuyer(buyerPersonaId: string): Promise<number>;
  saveBnplPlan(plan: BnplPlanRecord): Promise<void>;
  /** Internal: needed to load the buyer's signing key for installments. */
  findBnplPlanById(planId: string): Promise<BnplPlanRecord | null>;
  updateBnplPlan(plan: BnplPlanRecord): Promise<void>;
  listBnplPlansByBuyer(buyerPersonaId: string): Promise<PublicBnplPlan[]>;
}

export class InMemoryMarketplaceRepository implements MarketplaceRepository {
  readonly records: HireRecord[] = [];
  readonly bnplPlans: BnplPlanRecord[] = [];

  async save(record: HireRecord): Promise<void> {
    this.records.push(record);
  }

  async countHiresByBuyer(buyerPersonaId: string): Promise<number> {
    return this.records.filter((r) => r.buyerPersonaId === buyerPersonaId)
      .length;
  }

  async saveBnplPlan(plan: BnplPlanRecord): Promise<void> {
    this.bnplPlans.push(plan);
  }

  async findBnplPlanById(planId: string): Promise<BnplPlanRecord | null> {
    return this.bnplPlans.find((p) => p.planId === planId) ?? null;
  }

  async updateBnplPlan(plan: BnplPlanRecord): Promise<void> {
    const idx = this.bnplPlans.findIndex((p) => p.planId === plan.planId);
    if (idx === -1) {
      this.bnplPlans.push(plan);
      return;
    }
    this.bnplPlans[idx] = plan;
  }

  async listBnplPlansByBuyer(buyerPersonaId: string): Promise<PublicBnplPlan[]> {
    return this.bnplPlans
      .filter((p) => p.buyerPersonaId === buyerPersonaId)
      .map(stripBuyerSecret);
  }
}

export function stripBuyerSecret(plan: BnplPlanRecord): PublicBnplPlan {
  const { buyerSecretKey: _buyerSecretKey, ...rest } = plan;
  return rest;
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
  async quoteBnpl(): Promise<BnplQuote> {
    throw new MarketplaceServiceError(
      "marketplace_service_unconfigured",
      "MarketplaceService not configured — set SOLANA_RPC_URL + SOLANA_PAYER_SECRET_KEY",
    );
  }
  async hireBnpl(): Promise<CompletedBnplHire> {
    throw new MarketplaceServiceError(
      "marketplace_service_unconfigured",
      "MarketplaceService not configured — set SOLANA_RPC_URL + SOLANA_PAYER_SECRET_KEY",
    );
  }
  async recordInstallment(): Promise<RecordedInstallment> {
    throw new MarketplaceServiceError(
      "marketplace_service_unconfigured",
      "MarketplaceService not configured — set SOLANA_RPC_URL + SOLANA_PAYER_SECRET_KEY",
    );
  }
}

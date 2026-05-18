import type { ApiClient } from "./client";
import type { MarketplaceCategory } from "@/data/impactData";

export type HireSignatures = {
  create: string;
  pay: string;
};

export type CompletedHire = {
  requestAddress: string;
  nonce: string;
  status: "paid";
  signatures: HireSignatures;
  amountCents: number;
  category: MarketplaceCategory;
  buyerPubkey: string;
  providerPubkey: string;
};

export type HireProviderParams = {
  providerPersonaId: string;
  amountCents: number;
  category: MarketplaceCategory;
  memo: string;
};

export function hireProvider(
  client: ApiClient,
  params: HireProviderParams,
): Promise<CompletedHire> {
  return client.post<CompletedHire>("/marketplace/hire", params);
}

export function fetchHireCount(client: ApiClient): Promise<{ count: number }> {
  return client.get<{ count: number }>("/marketplace/me/hires");
}

export type ScoreTier = "A" | "B" | "C" | "D";

export type BnplQuoteOption = {
  installmentCount: number;
  installmentCents: number;
  totalRepayableCents: number;
  interestRateBps: number;
};

export type BnplQuote = {
  tier: ScoreTier;
  upfrontCents: number;
  maxInstallmentCount: number;
  options: BnplQuoteOption[];
};

export type FetchBnplQuoteParams = {
  providerPersonaId: string;
  principalCents: number;
};

export function fetchBnplQuote(
  client: ApiClient,
  params: FetchBnplQuoteParams,
): Promise<BnplQuote> {
  return client.post<BnplQuote>("/marketplace/bnpl/quote", params);
}

export type HireBnplParams = {
  providerPersonaId: string;
  principalCents: number;
  installmentCount: number;
  category: MarketplaceCategory;
  memo: string;
  /** Unix epoch seconds. Must be in the future. */
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
  category: MarketplaceCategory;
  firstDueAt: number;
  buyerPubkey: string;
  providerPubkey: string;
};

export function hireBnplProvider(
  client: ApiClient,
  params: HireBnplParams,
): Promise<CompletedBnplHire> {
  return client.post<CompletedBnplHire>("/marketplace/bnpl/hire", params);
}

export type RecordedInstallment = {
  planId: string;
  installmentIndex: number;
  paidInstallments: number;
  installmentCount: number;
  status: "active" | "completed";
  signature: string;
};

export function recordBnplInstallment(
  client: ApiClient,
  planId: string,
  installmentIndex: number,
): Promise<RecordedInstallment> {
  return client.post<RecordedInstallment>(
    `/marketplace/bnpl/${planId}/installment`,
    { installmentIndex },
  );
}

export type PublicBnplPlan = {
  planId: string;
  requestAddress: string;
  buyerPersonaId: string;
  providerPersonaId: string;
  buyerPubkey: string;
  providerPubkey: string;
  nonce: string;
  principalCents: number;
  totalRepayableCents: number;
  installmentCount: number;
  installmentCents: number;
  interestRateBps: number;
  paidInstallments: number;
  status: "active" | "completed";
  category: MarketplaceCategory;
  firstDueAt: number;
  memo: string;
  createdAt: string;
  signatures: {
    createPlan: string;
    paySupplier: string;
    installments: string[];
  };
};

export function fetchMyBnplPlans(
  client: ApiClient,
): Promise<{ plans: PublicBnplPlan[] }> {
  return client.get<{ plans: PublicBnplPlan[] }>("/marketplace/me/bnpl");
}

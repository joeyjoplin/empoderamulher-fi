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

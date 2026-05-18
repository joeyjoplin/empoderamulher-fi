import type { ApiClient } from "./client";

export type ImpactTransactionType =
  | "loan_disbursed"
  | "marketplace_payment"
  | "marketplace_bnpl_supplier_paid"
  | "marketplace_bnpl_installment_paid"
  | "marketplace_bnpl_completed";

export type ImpactTransaction = {
  id: string;
  type: ImpactTransactionType;
  description: string;
  /**
   * Cents for events that carry a monetary value. `null` for
   * `marketplace_bnpl_installment_paid`, which only records a progress
   * counter on-chain.
   */
  amountCents: number | null;
  signature: string;
  blockTime: string | null;
};

export type ImpactCity = {
  city: string;
  count: number;
  lat: number;
  lng: number;
};

export type ImpactDashboard = {
  metrics: {
    activeEntrepreneurs: number;
    interestSavedCents: number;
    debtsRenegotiatedCents: number;
    marketplaceTransactions: number;
    monthOverMonth: {
      entrepreneurs: number;
      interest: number;
      debts: number;
      marketplace: number;
    };
    poolTotalCents: number;
    yieldDistributedCents: number;
    qualifiedInvestors: number;
    cityDistribution: ImpactCity[];
  };
  recentTransactions: ImpactTransaction[];
};

export function fetchImpactDashboard(
  client: ApiClient,
): Promise<ImpactDashboard> {
  return client.get<ImpactDashboard>("/api/impact/dashboard");
}

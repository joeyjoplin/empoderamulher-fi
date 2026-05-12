import type { ApiClient } from "./client";

export type ImpactTransactionType = "loan_disbursed" | "marketplace_payment";

export type ImpactTransaction = {
  id: string;
  type: ImpactTransactionType;
  description: string;
  amountCents: number;
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

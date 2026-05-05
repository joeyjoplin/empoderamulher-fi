import type { ApiClient } from "./client";

export type AnticipationSuggestion = {
  type: "anticipation";
  estimatedCost: number;
  availableAmount: number;
};

export type SupplierRenegotiationSuggestion = {
  type: "supplier_renegotiation";
  supplierName: string;
  feasibility: "low" | "medium" | "high";
};

export type EmpowerfiCreditSuggestion = {
  type: "empowerfi_credit";
  amount: number;
  monthlyRate: number;
  vsOverdraftSavings: number;
};

export type ProactiveAlertSuggestion =
  | AnticipationSuggestion
  | SupplierRenegotiationSuggestion
  | EmpowerfiCreditSuggestion;

export type ProactiveAlert = {
  alert: boolean;
  deficitAmount: number;
  deficitWindowDays: number;
  naturalLanguageAlert: string;
  suggestions: ProactiveAlertSuggestion[];
};

export function getProactiveAlert(client: ApiClient): Promise<ProactiveAlert> {
  return client.get<ProactiveAlert>("/insights/proactive");
}

import type { ApiClient } from "./client";

export type LoanSignatures = {
  request: string;
  approve: string;
  disburse: string;
};

export type DisbursedLoan = {
  loanId: string;
  loanAddress: string;
  status: "disbursed";
  signatures: LoanSignatures;
  principalCents: number;
  termMonths: number;
  interestRateBps: number;
  borrowerPubkey: string;
};

export type RequestCreditParams = {
  amountCents: number;
  termMonths: number;
  interestRateBps: number;
};

export function requestCredit(
  client: ApiClient,
  params: RequestCreditParams,
): Promise<DisbursedLoan> {
  return client.post<DisbursedLoan>("/credit/request", params);
}

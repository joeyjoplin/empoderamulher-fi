/**
 * Loan orchestration boundary.
 *
 * `LoanService` hides the on-chain happy path (request → approve → disburse)
 * behind a single async call so the HTTP route never touches Anchor / Web3.js
 * directly. This makes the route trivially testable with a mock and lets the
 * real Solana glue evolve independently.
 *
 * `LoanRepository` persists each disbursed loan + its tx signatures so the
 * indexer worker (TASK 2.6) can reconcile on-chain events with off-chain rows.
 */

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

export type RequestAndDisburseParams = {
  personaId: string;
  borrowerPubkey: string;
  amountCents: number;
  termMonths: number;
  interestRateBps: number;
};

export interface LoanService {
  requestAndDisburse(params: RequestAndDisburseParams): Promise<DisbursedLoan>;
}

export type LoanRecord = DisbursedLoan & {
  personaId: string;
  createdAt: Date;
};

export interface LoanRepository {
  save(record: LoanRecord): Promise<void>;
}

export class InMemoryLoanRepository implements LoanRepository {
  readonly records: LoanRecord[] = [];

  async save(record: LoanRecord): Promise<void> {
    this.records.push(record);
  }
}

export class LoanServiceError extends Error {
  override readonly name = "LoanServiceError";
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

/**
 * Stub used as the default `LoanService` until the real Solana implementation
 * is wired up in `server.ts`. Throws so the route 502s if no real impl is
 * provided — surfaces misconfiguration immediately instead of silently
 * pretending the loan disbursed.
 */
export class UnconfiguredLoanService implements LoanService {
  async requestAndDisburse(): Promise<DisbursedLoan> {
    throw new LoanServiceError(
      "loan_service_unconfigured",
      "LoanService not configured — set up SolanaLoanService in server.ts",
    );
  }
}

import {
  Keypair,
  LAMPORTS_PER_SOL,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";

import {
  approveLoan,
  disburseLoan,
  loanPda,
  requestLoan,
  type SolanaClient,
} from "./solana/index.js";
import {
  LoanServiceError,
  type DisbursedLoan,
  type LoanService,
  type RequestAndDisburseParams,
} from "./loans.js";

export type SolanaLoanServiceOptions = {
  client: SolanaClient;
  /**
   * If `true` (devnet/localnet only), the service generates an ephemeral
   * borrower keypair per loan and requests an airdrop so it can pay rent on
   * the loan PDA. This trades on-chain identity (no persona ↔ wallet mapping)
   * for the ability to demo the full loop without preconfigured user wallets.
   */
  airdropBorrower?: boolean;
};

/**
 * Real on-chain implementation of `LoanService`. Orchestrates
 * `requestLoan → approveLoan → disburseLoan` via the Solana wrappers.
 *
 * Hackathon limitation: each request generates a fresh borrower keypair, so
 * the on-chain `borrower` field does not match `params.borrowerPubkey`. The
 * response echoes the actual on-chain key. Production needs the borrower to
 * sign client-side (Web3Auth / wallet adapter).
 *
 * Prerequisites (must run before the first request succeeds):
 *   - `solana-smoke.ts` (or equivalent setup) has initialized
 *     `LoanConfig` and `PoolState` on the target cluster.
 *   - `SOLANA_PAYER_SECRET_KEY` has SOL to pay fees + signs as authority.
 */
export class SolanaLoanService implements LoanService {
  constructor(private readonly opts: SolanaLoanServiceOptions) {}

  async requestAndDisburse(
    params: RequestAndDisburseParams,
  ): Promise<DisbursedLoan> {
    const client = this.opts.client;
    const borrower = Keypair.generate();

    if (this.opts.airdropBorrower) {
      try {
        const tx = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: client.payer.publicKey,
            toPubkey: borrower.publicKey,
            lamports: 0.05 * LAMPORTS_PER_SOL,
          }),
        );
        const { blockhash, lastValidBlockHeight } =
          await client.connection.getLatestBlockhash();
        tx.recentBlockhash = blockhash;
        tx.lastValidBlockHeight = lastValidBlockHeight;
        tx.feePayer = client.payer.publicKey;
        tx.sign(client.payer);
        const sig = await client.connection.sendRawTransaction(tx.serialize());
        await client.connection.confirmTransaction({
          signature: sig,
          blockhash,
          lastValidBlockHeight,
        });
      } catch (err) {
        throw new LoanServiceError(
          "borrower_funding_failed",
          err instanceof Error ? err.message : "borrower funding failed",
        );
      }
    }

    const loanId = BigInt(Date.now());

    let requestSig: string;
    try {
      const r = await requestLoan(client, {
        borrowerSigner: borrower,
        loanId,
        amount: BigInt(params.amountCents),
        termMonths: params.termMonths,
        interestRateBps: params.interestRateBps,
      });
      requestSig = r.signature;
    } catch (err) {
      throw new LoanServiceError(
        "request_loan_failed",
        err instanceof Error ? err.message : "request_loan failed",
      );
    }

    let approveSig: string;
    try {
      const r = await approveLoan(client, {
        borrower: borrower.publicKey,
        loanId,
      });
      approveSig = r.signature;
    } catch (err) {
      throw new LoanServiceError(
        "approve_loan_failed",
        err instanceof Error ? err.message : "approve_loan failed",
      );
    }

    let disburseSig: string;
    try {
      const r = await disburseLoan(client, {
        borrower: borrower.publicKey,
        loanId,
      });
      disburseSig = r.signature;
    } catch (err) {
      throw new LoanServiceError(
        "disburse_loan_failed",
        err instanceof Error ? err.message : "disburse_loan failed",
      );
    }

    const [loan] = loanPda(
      client.programIds.loanOrigination,
      borrower.publicKey,
      loanId,
    );

    return {
      loanId: loanId.toString(),
      loanAddress: loan.toBase58(),
      status: "disbursed",
      signatures: {
        request: requestSig,
        approve: approveSig,
        disburse: disburseSig,
      },
      principalCents: params.amountCents,
      termMonths: params.termMonths,
      interestRateBps: params.interestRateBps,
      borrowerPubkey: borrower.publicKey.toBase58(),
    };
  }
}

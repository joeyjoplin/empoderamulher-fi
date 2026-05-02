import BN from "bn.js";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";

import type { SolanaClient } from "./client.js";
import {
  loanConfigPda,
  loanPda,
  lockRecordPda,
  poolPda,
  repaymentSchedulePda,
} from "./pdas.js";

export type TxResult = { signature: string };

export type InitializeLoanConfigParams = Record<string, never>;

export type InitializeLoanConfigResult = TxResult & {
  loanConfig: string;
};

export async function initializeLoanConfig(
  client: SolanaClient,
  _params: InitializeLoanConfigParams = {},
): Promise<InitializeLoanConfigResult> {
  const [loanConfig] = loanConfigPda(client.programIds.loanOrigination);

  const signature = await client.programs.loanOrigination.methods
    .initializeLoanConfig()
    .accountsPartial({
      authority: client.payer.publicKey,
      loanConfig,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return { signature, loanConfig: loanConfig.toBase58() };
}

export type RequestLoanParams = {
  borrowerSigner: Keypair;
  loanId: bigint;
  amount: bigint;
  termMonths: number;
  interestRateBps: number;
};

export type RequestLoanResult = TxResult & {
  loan: string;
  repaymentSchedule: string;
};

export async function requestLoan(
  client: SolanaClient,
  params: RequestLoanParams,
): Promise<RequestLoanResult> {
  const [loanConfig] = loanConfigPda(client.programIds.loanOrigination);
  const [loan] = loanPda(
    client.programIds.loanOrigination,
    params.borrowerSigner.publicKey,
    params.loanId,
  );
  const [repaymentSchedule] = repaymentSchedulePda(
    client.programIds.loanOrigination,
    params.borrowerSigner.publicKey,
    params.loanId,
  );

  const signature = await client.programs.loanOrigination.methods
    .requestLoan(
      new BN(params.loanId.toString()),
      new BN(params.amount.toString()),
      params.termMonths,
      params.interestRateBps,
    )
    .accountsPartial({
      borrower: params.borrowerSigner.publicKey,
      loanConfig,
      loan,
      repaymentSchedule,
      systemProgram: SystemProgram.programId,
    })
    .signers([params.borrowerSigner])
    .rpc();

  return {
    signature,
    loan: loan.toBase58(),
    repaymentSchedule: repaymentSchedule.toBase58(),
  };
}

export type ApproveLoanParams = {
  borrower: PublicKey;
  loanId: bigint;
};

export async function approveLoan(
  client: SolanaClient,
  params: ApproveLoanParams,
): Promise<TxResult> {
  const [loanConfig] = loanConfigPda(client.programIds.loanOrigination);
  const [loan] = loanPda(
    client.programIds.loanOrigination,
    params.borrower,
    params.loanId,
  );
  const [poolState] = poolPda(client.programIds.collateralPool);
  const [lockRecord] = lockRecordPda(
    client.programIds.collateralPool,
    params.loanId,
  );

  const signature = await client.programs.loanOrigination.methods
    .approveLoan(new BN(params.loanId.toString()))
    .accountsPartial({
      authority: client.payer.publicKey,
      loanConfig,
      borrower: params.borrower,
      loan,
      poolState,
      lockRecord,
      collateralPoolProgram: client.programIds.collateralPool,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return { signature };
}

export type DisburseLoanParams = {
  borrower: PublicKey;
  loanId: bigint;
};

export async function disburseLoan(
  client: SolanaClient,
  params: DisburseLoanParams,
): Promise<TxResult> {
  const [loanConfig] = loanConfigPda(client.programIds.loanOrigination);
  const [loan] = loanPda(
    client.programIds.loanOrigination,
    params.borrower,
    params.loanId,
  );

  const signature = await client.programs.loanOrigination.methods
    .disburseLoan(new BN(params.loanId.toString()))
    .accountsPartial({
      authority: client.payer.publicKey,
      loanConfig,
      borrower: params.borrower,
      loan,
    })
    .rpc();

  return { signature };
}

export type RepayInstallmentParams = {
  borrowerSigner: Keypair;
  loanId: bigint;
  amount: bigint;
};

export async function repayInstallment(
  client: SolanaClient,
  params: RepayInstallmentParams,
): Promise<TxResult> {
  const [loan] = loanPda(
    client.programIds.loanOrigination,
    params.borrowerSigner.publicKey,
    params.loanId,
  );
  const [repaymentSchedule] = repaymentSchedulePda(
    client.programIds.loanOrigination,
    params.borrowerSigner.publicKey,
    params.loanId,
  );

  const signature = await client.programs.loanOrigination.methods
    .repayInstallment(
      new BN(params.loanId.toString()),
      new BN(params.amount.toString()),
    )
    .accountsPartial({
      borrower: params.borrowerSigner.publicKey,
      loan,
      repaymentSchedule,
    })
    .signers([params.borrowerSigner])
    .rpc();

  return { signature };
}

export type CloseLoanParams = {
  borrower: PublicKey;
  loanId: bigint;
};

export async function closeLoan(
  client: SolanaClient,
  params: CloseLoanParams,
): Promise<TxResult> {
  const [loanConfig] = loanConfigPda(client.programIds.loanOrigination);
  const [loan] = loanPda(
    client.programIds.loanOrigination,
    params.borrower,
    params.loanId,
  );
  const [poolState] = poolPda(client.programIds.collateralPool);
  const [lockRecord] = lockRecordPda(
    client.programIds.collateralPool,
    params.loanId,
  );

  const signature = await client.programs.loanOrigination.methods
    .closeLoan(new BN(params.loanId.toString()))
    .accountsPartial({
      authority: client.payer.publicKey,
      loanConfig,
      borrower: params.borrower,
      loan,
      poolState,
      lockRecord,
      collateralPoolProgram: client.programIds.collateralPool,
    })
    .rpc();

  return { signature };
}

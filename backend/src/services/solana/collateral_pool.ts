import BN from "bn.js";
import { TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";

import type { SolanaClient } from "./client.js";
import { poolPda, poolVaultPda } from "./pdas.js";

export type TxResult = { signature: string };

export type InitializePoolParams = {
  mint: PublicKey;
};

export type InitializePoolResult = TxResult & {
  poolState: string;
  vault: string;
};

export async function initializePool(
  client: SolanaClient,
  params: InitializePoolParams,
): Promise<InitializePoolResult> {
  const [poolState] = poolPda(client.programIds.collateralPool);
  const [vault] = poolVaultPda(client.programIds.collateralPool);

  const signature = await client.programs.collateralPool.methods
    .initializePool()
    .accountsPartial({
      authority: client.payer.publicKey,
      poolState,
      mint: params.mint,
      vault,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      rent: SYSVAR_RENT_PUBKEY,
    })
    .rpc();

  return {
    signature,
    poolState: poolState.toBase58(),
    vault: vault.toBase58(),
  };
}

export type DepositParams = {
  depositorSigner: Keypair;
  depositorAta: PublicKey;
  mint: PublicKey;
  amount: bigint;
};

export async function deposit(
  client: SolanaClient,
  params: DepositParams,
): Promise<TxResult> {
  const [poolState] = poolPda(client.programIds.collateralPool);
  const [vault] = poolVaultPda(client.programIds.collateralPool);

  const signature = await client.programs.collateralPool.methods
    .deposit(new BN(params.amount.toString()))
    .accountsPartial({
      depositor: params.depositorSigner.publicKey,
      poolState,
      mint: params.mint,
      vault,
      depositorAta: params.depositorAta,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
    })
    .signers([params.depositorSigner])
    .rpc();

  return { signature };
}

export type FetchPoolStateResult = {
  authority: string;
  mint: string;
  vault: string;
  totalDeposited: bigint;
  totalLocked: bigint;
};

export async function fetchPoolState(
  client: SolanaClient,
): Promise<FetchPoolStateResult> {
  const [poolState] = poolPda(client.programIds.collateralPool);
  const account = await client.programs.collateralPool.account.poolState.fetch(
    poolState,
  );
  return {
    authority: account.authority.toBase58(),
    mint: account.mint.toBase58(),
    vault: account.vault.toBase58(),
    totalDeposited: BigInt(account.totalDeposited.toString()),
    totalLocked: BigInt(account.totalLocked.toString()),
  };
}

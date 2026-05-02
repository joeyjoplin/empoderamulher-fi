import BN from "bn.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { Keypair, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";

import type { SolanaClient } from "./client.js";
import { tokenConfigPda } from "./pdas.js";

export type TxResult = { signature: string };

export type InitializeTokenConfigParams = {
  decimals: number;
};

export type InitializeTokenConfigResult = TxResult & {
  mint: string;
  tokenConfig: string;
};

/** Initializes the RWA Token-2022 mint with the program's TokenConfig PDA as authority. */
export async function initializeTokenConfig(
  client: SolanaClient,
  params: InitializeTokenConfigParams,
): Promise<InitializeTokenConfigResult> {
  const mint = Keypair.generate();
  const [tokenConfig] = tokenConfigPda(client.programIds.rwaToken);

  const signature = await client.programs.rwaToken.methods
    .initializeTokenConfig(params.decimals)
    .accountsPartial({
      authority: client.payer.publicKey,
      tokenConfig,
      mint: mint.publicKey,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      rent: SYSVAR_RENT_PUBKEY,
    })
    .signers([mint])
    .rpc();

  return {
    signature,
    mint: mint.publicKey.toBase58(),
    tokenConfig: tokenConfig.toBase58(),
  };
}

export type MintRwaParams = {
  mint: PublicKey;
  recipient: PublicKey;
  amount: bigint;
};

/** Mints RWA tokens to `recipient`'s ATA. Creates the ATA if missing. */
export async function mintRwa(
  client: SolanaClient,
  params: MintRwaParams,
): Promise<TxResult & { recipientAta: string }> {
  const [tokenConfig] = tokenConfigPda(client.programIds.rwaToken);
  const recipientAta = getAssociatedTokenAddressSync(
    params.mint,
    params.recipient,
    false,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );

  const ataInfo = await client.connection.getAccountInfo(recipientAta);
  const preInstructions = ataInfo
    ? []
    : [
        createAssociatedTokenAccountInstruction(
          client.payer.publicKey,
          recipientAta,
          params.recipient,
          params.mint,
          TOKEN_2022_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID,
        ),
      ];

  const signature = await client.programs.rwaToken.methods
    .mintRwa(new BN(params.amount.toString()))
    .accountsPartial({
      authority: client.payer.publicKey,
      tokenConfig,
      mint: params.mint,
      recipientAta,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
    })
    .preInstructions(preInstructions)
    .rpc();

  return { signature, recipientAta: recipientAta.toBase58() };
}

export type BurnRwaParams = {
  mint: PublicKey;
  ownerAta: PublicKey;
  ownerSigner: Keypair;
  amount: bigint;
};

export async function burnRwa(
  client: SolanaClient,
  params: BurnRwaParams,
): Promise<TxResult> {
  const [tokenConfig] = tokenConfigPda(client.programIds.rwaToken);

  const signature = await client.programs.rwaToken.methods
    .burnRwa(new BN(params.amount.toString()))
    .accountsPartial({
      owner: params.ownerSigner.publicKey,
      tokenConfig,
      mint: params.mint,
      fromAta: params.ownerAta,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
    })
    .signers([params.ownerSigner])
    .rpc();

  return { signature };
}

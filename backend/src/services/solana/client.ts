import * as anchor from "@coral-xyz/anchor";
import type { Idl } from "@coral-xyz/anchor";
import {
  Connection,
  Keypair,
  PublicKey,
  type Commitment,
} from "@solana/web3.js";
import bs58 from "bs58";

import collateralPoolIdl from "./idl/collateral_pool.json" with { type: "json" };
import loanOriginationIdl from "./idl/loan_origination.json" with { type: "json" };
import rwaTokenIdl from "./idl/rwa_token.json" with { type: "json" };
import scoreIdl from "./idl/score.json" with { type: "json" };
import type { CollateralPool } from "./idl/collateral_pool.js";
import type { LoanOrigination } from "./idl/loan_origination.js";
import type { RwaToken } from "./idl/rwa_token.js";
import type { Score } from "./idl/score.js";
import { PROGRAM_IDS } from "./pdas.js";

export type SolanaClientConfig = {
  rpcUrl: string;
  /**
   * Base58-encoded payer secret key (64 bytes). The same key is used as
   * the program authority across rwa_token, collateral_pool, and
   * loan_origination during the hackathon.
   */
  payerSecretKey: string;
  commitment?: Commitment;
};

export type SolanaClient = {
  connection: Connection;
  provider: anchor.AnchorProvider;
  payer: Keypair;
  programs: {
    rwaToken: anchor.Program<RwaToken>;
    collateralPool: anchor.Program<CollateralPool>;
    loanOrigination: anchor.Program<LoanOrigination>;
    score: anchor.Program<Score>;
  };
  programIds: {
    rwaToken: PublicKey;
    collateralPool: PublicKey;
    loanOrigination: PublicKey;
    score: PublicKey;
  };
};

export function createSolanaClient(config: SolanaClientConfig): SolanaClient {
  const connection = new Connection(config.rpcUrl, config.commitment ?? "confirmed");
  const payer = Keypair.fromSecretKey(bs58.decode(config.payerSecretKey));
  const wallet = new anchor.Wallet(payer);
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: config.commitment ?? "confirmed",
  });

  const rwaToken = new anchor.Program<RwaToken>(
    rwaTokenIdl as Idl as RwaToken,
    provider,
  );
  const collateralPool = new anchor.Program<CollateralPool>(
    collateralPoolIdl as Idl as CollateralPool,
    provider,
  );
  const loanOrigination = new anchor.Program<LoanOrigination>(
    loanOriginationIdl as Idl as LoanOrigination,
    provider,
  );
  const score = new anchor.Program<Score>(
    scoreIdl as Idl as Score,
    provider,
  );

  return {
    connection,
    provider,
    payer,
    programs: { rwaToken, collateralPool, loanOrigination, score },
    programIds: {
      rwaToken: new PublicKey(PROGRAM_IDS.rwaToken),
      collateralPool: new PublicKey(PROGRAM_IDS.collateralPool),
      loanOrigination: new PublicKey(PROGRAM_IDS.loanOrigination),
      score: new PublicKey(PROGRAM_IDS.score),
    },
  };
}

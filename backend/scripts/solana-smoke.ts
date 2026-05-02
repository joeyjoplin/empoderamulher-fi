/**
 * Integration smoke test for the Solana wrappers.
 *
 * Runs the full happy path end-to-end against a running validator:
 *   initialize_token_config → mint RWA to investor → initialize_pool →
 *   deposit → initialize_loan_config → request_loan → approve_loan →
 *   disburse_loan → repay (×2) → close_loan
 *
 * Idempotent: if singleton PDAs (TokenConfig, PoolState, LoanConfig) already
 * exist on the cluster from a prior run, this script reuses them and skips
 * their init steps. Loan-specific PDAs are keyed by a per-run timestamp
 * loan_id so they're unique each time.
 *
 * Prerequisites:
 *   - solana-test-validator running OR --rpc-url pointing at devnet
 *   - smartcontracts/ built and deployed: `anchor build && anchor deploy`
 *   - SOLANA_PAYER_SECRET_KEY env var (base58, 64-byte secret) with SOL on cluster
 *
 * Usage:
 *   SOLANA_PAYER_SECRET_KEY=<base58> npm run smoke:solana
 */

import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";

import {
  approveLoan,
  closeLoan,
  createSolanaClient,
  deposit,
  disburseLoan,
  fetchPoolState,
  initializeLoanConfig,
  initializePool,
  initializeTokenConfig,
  loanConfigPda,
  mintRwa,
  poolPda,
  repayInstallment,
  requestLoan,
  tokenConfigPda,
  type SolanaClient,
} from "../src/services/solana/index.js";

async function ensureTokenConfig(client: SolanaClient): Promise<PublicKey> {
  const [tokenConfig] = tokenConfigPda(client.programIds.rwaToken);
  const info = await client.connection.getAccountInfo(tokenConfig);
  if (info === null) {
    const init = await initializeTokenConfig(client, { decimals: 6 });
    console.log("initializeTokenConfig:", init);
    return new PublicKey(init.mint);
  }
  const cfg =
    await client.programs.rwaToken.account.tokenConfig.fetch(tokenConfig);
  console.log("tokenConfig already exists; reusing mint:", cfg.mint.toBase58());
  return cfg.mint;
}

async function ensurePool(
  client: SolanaClient,
  mint: PublicKey,
): Promise<void> {
  const [pool] = poolPda(client.programIds.collateralPool);
  const info = await client.connection.getAccountInfo(pool);
  if (info === null) {
    const result = await initializePool(client, { mint });
    console.log("initializePool:", result);
    return;
  }
  console.log("pool already exists; skipping init");
}

async function ensureLoanConfig(client: SolanaClient): Promise<void> {
  const [loanConfig] = loanConfigPda(client.programIds.loanOrigination);
  const info = await client.connection.getAccountInfo(loanConfig);
  if (info === null) {
    const result = await initializeLoanConfig(client);
    console.log("initializeLoanConfig:", result);
    return;
  }
  console.log("loanConfig already exists; skipping init");
}

async function main() {
  const rpcUrl = process.env.SOLANA_RPC_URL ?? "http://localhost:8899";
  const payerSecretKey = process.env.SOLANA_PAYER_SECRET_KEY;
  if (!payerSecretKey) {
    throw new Error("Set SOLANA_PAYER_SECRET_KEY (base58 64-byte secret).");
  }

  const client = createSolanaClient({ rpcUrl, payerSecretKey });
  const { connection, payer } = client;
  console.log("payer:", payer.publicKey.toBase58());
  console.log(
    "balance:",
    (await connection.getBalance(payer.publicKey)) / LAMPORTS_PER_SOL,
    "SOL",
  );

  // 1. Ensure RWA mint exists and grab its address.
  const mint = await ensureTokenConfig(client);

  // 2. Mint to investor.
  const investor = Keypair.generate();
  const investorAirdrop = await connection.requestAirdrop(
    investor.publicKey,
    2 * LAMPORTS_PER_SOL,
  );
  const latest1 = await connection.getLatestBlockhash();
  await connection.confirmTransaction({
    signature: investorAirdrop,
    ...latest1,
  });

  const minted = await mintRwa(client, {
    mint,
    recipient: investor.publicKey,
    amount: 100_000_000n, // 100 RWA
  });
  console.log("mintRwa:", minted);

  // 3. Init pool + deposit.
  await ensurePool(client, mint);

  const investorAta = getAssociatedTokenAddressSync(
    mint,
    investor.publicKey,
    false,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );
  const dep = await deposit(client, {
    depositorSigner: investor,
    depositorAta: investorAta,
    mint,
    amount: 100_000_000n,
  });
  console.log("deposit:", dep);
  console.log("pool state:", await fetchPoolState(client));

  // 4. Loan flow (loan_id is per-run, so its PDAs are always fresh).
  await ensureLoanConfig(client);

  const borrower = Keypair.generate();
  const borrowerAirdrop = await connection.requestAirdrop(
    borrower.publicKey,
    2 * LAMPORTS_PER_SOL,
  );
  const latest2 = await connection.getLatestBlockhash();
  await connection.confirmTransaction({
    signature: borrowerAirdrop,
    ...latest2,
  });

  const loanId = BigInt(Math.floor(Date.now() / 1000));
  const requested = await requestLoan(client, {
    borrowerSigner: borrower,
    loanId,
    amount: 1_000_000n,
    termMonths: 2,
    interestRateBps: 400,
  });
  console.log("requestLoan:", requested);

  const approved = await approveLoan(client, {
    borrower: borrower.publicKey,
    loanId,
  });
  console.log("approveLoan:", approved);

  const disbursed = await disburseLoan(client, {
    borrower: borrower.publicKey,
    loanId,
  });
  console.log("disburseLoan:", disbursed);

  for (let i = 0; i < 2; i++) {
    const r = await repayInstallment(client, {
      borrowerSigner: borrower,
      loanId,
      amount: 540_000n,
    });
    console.log(`repayInstallment[${i}]:`, r);
  }

  const closed = await closeLoan(client, {
    borrower: borrower.publicKey,
    loanId,
  });
  console.log("closeLoan:", closed);
  console.log("final pool state:", await fetchPoolState(client));
  console.log("\nSMOKE OK");
}

main().catch((err) => {
  console.error("\nSMOKE FAILED:", err);
  process.exit(1);
});

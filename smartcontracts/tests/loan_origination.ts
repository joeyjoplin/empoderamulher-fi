import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorError } from "@coral-xyz/anchor";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import {
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createMint,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  mintTo,
} from "@solana/spl-token";
import { assert, expect } from "chai";
import { LoanOrigination } from "../target/types/loan_origination";
import { CollateralPool } from "../target/types/collateral_pool";

const POOL_SEED = Buffer.from("pool");
const POOL_VAULT_SEED = Buffer.from("pool_vault");
const LOCK_SEED = Buffer.from("lock");
const LOAN_CONFIG_SEED = Buffer.from("loan_config");
const LOAN_SEED = Buffer.from("loan");
const SCHEDULE_SEED = Buffer.from("schedule");

function loanIdLeBytes(loanId: number | bigint): Buffer {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(loanId));
  return buf;
}

describe("loan_origination", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const loanProgram = anchor.workspace.LoanOrigination as Program<LoanOrigination>;
  const poolProgram = anchor.workspace.CollateralPool as Program<CollateralPool>;

  const authority = (provider.wallet as anchor.Wallet).payer;
  const borrower = Keypair.generate();
  const investor = Keypair.generate();

  let mint: PublicKey;
  const decimals = 6;
  const POOL_DEPOSIT = 100_000_000n; // 100 RWA at 6 decimals

  const [poolPda] = PublicKey.findProgramAddressSync(
    [POOL_SEED],
    poolProgram.programId,
  );
  const [vaultPda] = PublicKey.findProgramAddressSync(
    [POOL_VAULT_SEED],
    poolProgram.programId,
  );
  const [loanConfigPda] = PublicKey.findProgramAddressSync(
    [LOAN_CONFIG_SEED],
    loanProgram.programId,
  );

  function loanPda(borrowerKey: PublicKey, loanId: number) {
    return PublicKey.findProgramAddressSync(
      [LOAN_SEED, borrowerKey.toBuffer(), loanIdLeBytes(loanId)],
      loanProgram.programId,
    )[0];
  }

  function schedulePda(borrowerKey: PublicKey, loanId: number) {
    return PublicKey.findProgramAddressSync(
      [SCHEDULE_SEED, borrowerKey.toBuffer(), loanIdLeBytes(loanId)],
      loanProgram.programId,
    )[0];
  }

  function lockPda(loanId: number) {
    return PublicKey.findProgramAddressSync(
      [LOCK_SEED, loanIdLeBytes(loanId)],
      poolProgram.programId,
    )[0];
  }

  // Loan A — happy path: 1 RWA at 4% monthly, 2-month term
  const LOAN_A_ID = 1;
  const LOAN_A_AMOUNT = 1_000_000;
  const LOAN_A_RATE_BPS = 400;
  const LOAN_A_TERM = 2;
  const LOAN_A_INTEREST =
    (LOAN_A_AMOUNT * LOAN_A_RATE_BPS * LOAN_A_TERM) / 10_000;
  const LOAN_A_TOTAL_DUE = LOAN_A_AMOUNT + LOAN_A_INTEREST; // 1_080_000
  const LOAN_A_INSTALLMENT = LOAN_A_TOTAL_DUE / LOAN_A_TERM; // 540_000

  before(async () => {
    for (const k of [borrower, investor]) {
      const sig = await provider.connection.requestAirdrop(
        k.publicKey,
        2_000_000_000,
      );
      await provider.connection.confirmTransaction(sig);
    }

    mint = await createMint(
      provider.connection,
      authority,
      authority.publicKey,
      null,
      decimals,
      undefined,
      undefined,
      TOKEN_2022_PROGRAM_ID,
    );

    const investorAta = getAssociatedTokenAddressSync(
      mint,
      investor.publicKey,
      false,
      TOKEN_2022_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    );
    const tx = new anchor.web3.Transaction().add(
      createAssociatedTokenAccountInstruction(
        authority.publicKey,
        investorAta,
        investor.publicKey,
        mint,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID,
      ),
    );
    await provider.sendAndConfirm(tx);

    await mintTo(
      provider.connection,
      authority,
      mint,
      investorAta,
      authority,
      POOL_DEPOSIT,
      [],
      undefined,
      TOKEN_2022_PROGRAM_ID,
    );

    // The pool PDA is global to the program; init only if not already present
    // (the collateral_pool test suite shares the same validator).
    const existingPool = await provider.connection.getAccountInfo(poolPda);
    if (existingPool === null) {
      await poolProgram.methods
        .initializePool()
        .accounts({
          authority: authority.publicKey,
          poolState: poolPda,
          mint,
          vault: vaultPda,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .rpc();

      await poolProgram.methods
        .deposit(new anchor.BN(POOL_DEPOSIT.toString()))
        .accounts({
          depositor: investor.publicKey,
          poolState: poolPda,
          mint,
          vault: vaultPda,
          depositorAta: investorAta,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .signers([investor])
        .rpc();
    } else {
      // Pool already exists with a different mint; deposit into the existing
      // pool using its mint (we re-fetch and override our local `mint` so
      // subsequent ATAs/transfers line up).
      const pool = await poolProgram.account.poolState.fetch(poolPda);
      mint = pool.mint;
      const existingMintInvestorAta = getAssociatedTokenAddressSync(
        mint,
        investor.publicKey,
        false,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID,
      );
      const tx2 = new anchor.web3.Transaction().add(
        createAssociatedTokenAccountInstruction(
          authority.publicKey,
          existingMintInvestorAta,
          investor.publicKey,
          mint,
          TOKEN_2022_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID,
        ),
      );
      await provider.sendAndConfirm(tx2);
      await mintTo(
        provider.connection,
        authority,
        mint,
        existingMintInvestorAta,
        authority,
        POOL_DEPOSIT,
        [],
        undefined,
        TOKEN_2022_PROGRAM_ID,
      );
      await poolProgram.methods
        .deposit(new anchor.BN(POOL_DEPOSIT.toString()))
        .accounts({
          depositor: investor.publicKey,
          poolState: poolPda,
          mint,
          vault: pool.vault,
          depositorAta: existingMintInvestorAta,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .signers([investor])
        .rpc();
    }
  });

  it("initializes the loan config", async () => {
    await loanProgram.methods
      .initializeLoanConfig()
      .accounts({
        authority: authority.publicKey,
        loanConfig: loanConfigPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const cfg = await loanProgram.account.loanConfig.fetch(loanConfigPda);
    expect(cfg.authority.toBase58()).to.equal(authority.publicKey.toBase58());
  });

  it("borrower requests a loan and a repayment schedule is created (status=Pending)", async () => {
    await loanProgram.methods
      .requestLoan(
        new anchor.BN(LOAN_A_ID),
        new anchor.BN(LOAN_A_AMOUNT),
        LOAN_A_TERM,
        LOAN_A_RATE_BPS,
      )
      .accounts({
        borrower: borrower.publicKey,
        loanConfig: loanConfigPda,
        loan: loanPda(borrower.publicKey, LOAN_A_ID),
        repaymentSchedule: schedulePda(borrower.publicKey, LOAN_A_ID),
        systemProgram: SystemProgram.programId,
      })
      .signers([borrower])
      .rpc();

    const loan = await loanProgram.account.loan.fetch(
      loanPda(borrower.publicKey, LOAN_A_ID),
    );
    expect(loan.borrower.toBase58()).to.equal(borrower.publicKey.toBase58());
    expect(loan.amount.toString()).to.equal(LOAN_A_AMOUNT.toString());
    expect(loan.totalDue.toString()).to.equal(LOAN_A_TOTAL_DUE.toString());
    expect(loan.totalRepaid.toNumber()).to.equal(0);
    expect(loan.termMonths).to.equal(LOAN_A_TERM);
    expect(loan.interestRateBps).to.equal(LOAN_A_RATE_BPS);
    expect(loan.status).to.deep.equal({ pending: {} });
    expect(loan.disbursedAt.toNumber()).to.equal(0);

    const schedule = await loanProgram.account.repaymentSchedule.fetch(
      schedulePda(borrower.publicKey, LOAN_A_ID),
    );
    expect(schedule.installmentCount).to.equal(LOAN_A_TERM);
    expect(schedule.installmentsPaid).to.equal(0);
    expect(schedule.installmentAmount.toString()).to.equal(
      LOAN_A_INSTALLMENT.toString(),
    );
  });

  it("authority approves a loan and locks pool collateral via CPI", async () => {
    const poolBefore = await poolProgram.account.poolState.fetch(poolPda);

    await loanProgram.methods
      .approveLoan(new anchor.BN(LOAN_A_ID))
      .accounts({
        authority: authority.publicKey,
        loanConfig: loanConfigPda,
        loan: loanPda(borrower.publicKey, LOAN_A_ID),
        borrower: borrower.publicKey,
        poolState: poolPda,
        lockRecord: lockPda(LOAN_A_ID),
        collateralPoolProgram: poolProgram.programId,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const loan = await loanProgram.account.loan.fetch(
      loanPda(borrower.publicKey, LOAN_A_ID),
    );
    expect(loan.status).to.deep.equal({ approved: {} });

    const poolAfter = await poolProgram.account.poolState.fetch(poolPda);
    expect(
      poolAfter.totalLocked.sub(poolBefore.totalLocked).toString(),
    ).to.equal(LOAN_A_AMOUNT.toString());

    const lock = await poolProgram.account.lockRecord.fetch(lockPda(LOAN_A_ID));
    expect(lock.amount.toString()).to.equal(LOAN_A_AMOUNT.toString());
  });

  it("rejects approve_loan when caller is not the configured authority", async () => {
    const intruder = Keypair.generate();
    const sig = await provider.connection.requestAirdrop(
      intruder.publicKey,
      1_000_000_000,
    );
    await provider.connection.confirmTransaction(sig);

    // Pre-create a Pending loan with id=2 to attempt approving
    const LOAN_B_ID = 2;
    await loanProgram.methods
      .requestLoan(
        new anchor.BN(LOAN_B_ID),
        new anchor.BN(LOAN_A_AMOUNT),
        LOAN_A_TERM,
        LOAN_A_RATE_BPS,
      )
      .accounts({
        borrower: borrower.publicKey,
        loanConfig: loanConfigPda,
        loan: loanPda(borrower.publicKey, LOAN_B_ID),
        repaymentSchedule: schedulePda(borrower.publicKey, LOAN_B_ID),
        systemProgram: SystemProgram.programId,
      })
      .signers([borrower])
      .rpc();

    try {
      await loanProgram.methods
        .approveLoan(new anchor.BN(LOAN_B_ID))
        .accounts({
          authority: intruder.publicKey,
          loanConfig: loanConfigPda,
          loan: loanPda(borrower.publicKey, LOAN_B_ID),
          borrower: borrower.publicKey,
          poolState: poolPda,
          lockRecord: lockPda(LOAN_B_ID),
          collateralPoolProgram: poolProgram.programId,
          systemProgram: SystemProgram.programId,
        })
        .signers([intruder])
        .rpc();
      assert.fail("expected approve_loan by non-authority to fail");
    } catch (err) {
      const e = err as AnchorError;
      expect(e.error?.errorCode?.code).to.equal("Unauthorized");
    }
  });

  it("authority disburses an approved loan and stamps disbursed_at", async () => {
    await loanProgram.methods
      .disburseLoan(new anchor.BN(LOAN_A_ID))
      .accounts({
        authority: authority.publicKey,
        loanConfig: loanConfigPda,
        loan: loanPda(borrower.publicKey, LOAN_A_ID),
        borrower: borrower.publicKey,
      })
      .rpc();

    const loan = await loanProgram.account.loan.fetch(
      loanPda(borrower.publicKey, LOAN_A_ID),
    );
    expect(loan.status).to.deep.equal({ disbursed: {} });
    expect(loan.disbursedAt.toNumber()).to.be.greaterThan(0);
  });

  it("rejects disburse_loan when loan is not Approved", async () => {
    // Loan B is still Pending
    const LOAN_B_ID = 2;
    try {
      await loanProgram.methods
        .disburseLoan(new anchor.BN(LOAN_B_ID))
        .accounts({
          authority: authority.publicKey,
          loanConfig: loanConfigPda,
          loan: loanPda(borrower.publicKey, LOAN_B_ID),
          borrower: borrower.publicKey,
        })
        .rpc();
      assert.fail("expected disburse on a Pending loan to fail");
    } catch (err) {
      const e = err as AnchorError;
      expect(e.error?.errorCode?.code).to.equal("InvalidStatus");
    }
  });

  it("borrower can repay a partial installment", async () => {
    await loanProgram.methods
      .repayInstallment(
        new anchor.BN(LOAN_A_ID),
        new anchor.BN(LOAN_A_INSTALLMENT),
      )
      .accounts({
        borrower: borrower.publicKey,
        loan: loanPda(borrower.publicKey, LOAN_A_ID),
        repaymentSchedule: schedulePda(borrower.publicKey, LOAN_A_ID),
      })
      .signers([borrower])
      .rpc();

    const loan = await loanProgram.account.loan.fetch(
      loanPda(borrower.publicKey, LOAN_A_ID),
    );
    expect(loan.totalRepaid.toString()).to.equal(LOAN_A_INSTALLMENT.toString());
    expect(loan.status).to.deep.equal({ disbursed: {} });

    const schedule = await loanProgram.account.repaymentSchedule.fetch(
      schedulePda(borrower.publicKey, LOAN_A_ID),
    );
    expect(schedule.installmentsPaid).to.equal(1);
  });

  it("rejects a repayment that exceeds the remaining balance", async () => {
    try {
      await loanProgram.methods
        .repayInstallment(
          new anchor.BN(LOAN_A_ID),
          new anchor.BN(LOAN_A_TOTAL_DUE), // way more than remaining
        )
        .accounts({
          borrower: borrower.publicKey,
          loan: loanPda(borrower.publicKey, LOAN_A_ID),
          repaymentSchedule: schedulePda(borrower.publicKey, LOAN_A_ID),
        })
        .signers([borrower])
        .rpc();
      assert.fail("expected over-repayment to fail");
    } catch (err) {
      const e = err as AnchorError;
      expect(e.error?.errorCode?.code).to.equal("AmountExceedsRemaining");
    }
  });

  it("loan status flips to Repaid once total_repaid == total_due", async () => {
    await loanProgram.methods
      .repayInstallment(
        new anchor.BN(LOAN_A_ID),
        new anchor.BN(LOAN_A_INSTALLMENT),
      )
      .accounts({
        borrower: borrower.publicKey,
        loan: loanPda(borrower.publicKey, LOAN_A_ID),
        repaymentSchedule: schedulePda(borrower.publicKey, LOAN_A_ID),
      })
      .signers([borrower])
      .rpc();

    const loan = await loanProgram.account.loan.fetch(
      loanPda(borrower.publicKey, LOAN_A_ID),
    );
    expect(loan.totalRepaid.toString()).to.equal(LOAN_A_TOTAL_DUE.toString());
    expect(loan.status).to.deep.equal({ repaid: {} });
  });

  it("rejects close_loan when loan is not Repaid", async () => {
    // Loan B is still Pending — should reject
    const LOAN_B_ID = 2;
    try {
      await loanProgram.methods
        .closeLoan(new anchor.BN(LOAN_B_ID))
        .accounts({
          authority: authority.publicKey,
          loanConfig: loanConfigPda,
          loan: loanPda(borrower.publicKey, LOAN_B_ID),
          borrower: borrower.publicKey,
          poolState: poolPda,
          lockRecord: lockPda(LOAN_B_ID),
          collateralPoolProgram: poolProgram.programId,
        })
        .rpc();
      assert.fail("expected close on a non-Repaid loan to fail");
    } catch (err) {
      const e = err as AnchorError;
      expect(e.error?.errorCode?.code).to.equal("InvalidStatus");
    }
  });

  it("authority closes a fully-repaid loan and unlocks pool collateral via CPI", async () => {
    const poolBefore = await poolProgram.account.poolState.fetch(poolPda);

    await loanProgram.methods
      .closeLoan(new anchor.BN(LOAN_A_ID))
      .accounts({
        authority: authority.publicKey,
        loanConfig: loanConfigPda,
        loan: loanPda(borrower.publicKey, LOAN_A_ID),
        borrower: borrower.publicKey,
        poolState: poolPda,
        lockRecord: lockPda(LOAN_A_ID),
        collateralPoolProgram: poolProgram.programId,
      })
      .rpc();

    const loan = await loanProgram.account.loan.fetch(
      loanPda(borrower.publicKey, LOAN_A_ID),
    );
    expect(loan.status).to.deep.equal({ closed: {} });

    const poolAfter = await poolProgram.account.poolState.fetch(poolPda);
    expect(
      poolBefore.totalLocked.sub(poolAfter.totalLocked).toString(),
    ).to.equal(LOAN_A_AMOUNT.toString());

    // LockRecord closed
    const info = await provider.connection.getAccountInfo(lockPda(LOAN_A_ID));
    expect(info).to.equal(null);
  });
});

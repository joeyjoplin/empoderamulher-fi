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
  getAccount,
} from "@solana/spl-token";
import { assert, expect } from "chai";
import { CollateralPool } from "../target/types/collateral_pool";

const POOL_SEED = Buffer.from("pool");
const POOL_VAULT_SEED = Buffer.from("pool_vault");
const LOCK_SEED = Buffer.from("lock");

function loanIdLeBytes(loanId: number | bigint): Buffer {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(loanId));
  return buf;
}

describe("collateral_pool", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.CollateralPool as Program<CollateralPool>;
  const authority = (provider.wallet as anchor.Wallet).payer;

  let mint: PublicKey;
  const decimals = 6;

  const investor = Keypair.generate();
  let investorAta: PublicKey;

  const [poolPda] = PublicKey.findProgramAddressSync(
    [POOL_SEED],
    program.programId,
  );
  const [vaultPda] = PublicKey.findProgramAddressSync(
    [POOL_VAULT_SEED],
    program.programId,
  );

  const INITIAL_BALANCE = 10_000_000n; // 10 RWA at 6 decimals

  before(async () => {
    // Fund the investor wallet
    const sig = await provider.connection.requestAirdrop(
      investor.publicKey,
      2_000_000_000,
    );
    await provider.connection.confirmTransaction(sig);

    // Standalone Token-2022 mint with `authority` as the mint authority
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

    investorAta = getAssociatedTokenAddressSync(
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
      INITIAL_BALANCE,
      [],
      undefined,
      TOKEN_2022_PROGRAM_ID,
    );
  });

  it("initializes the pool with vault token account", async () => {
    await program.methods
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

    const pool = await program.account.poolState.fetch(poolPda);
    expect(pool.authority.toBase58()).to.equal(authority.publicKey.toBase58());
    expect(pool.mint.toBase58()).to.equal(mint.toBase58());
    expect(pool.vault.toBase58()).to.equal(vaultPda.toBase58());
    expect(pool.totalDeposited.toNumber()).to.equal(0);
    expect(pool.totalLocked.toNumber()).to.equal(0);

    const vault = await getAccount(
      provider.connection,
      vaultPda,
      undefined,
      TOKEN_2022_PROGRAM_ID,
    );
    expect(vault.mint.toBase58()).to.equal(mint.toBase58());
    expect(vault.owner.toBase58()).to.equal(poolPda.toBase58());
    expect(vault.amount.toString()).to.equal("0");
  });

  it("accepts a deposit and increases total_deposited + vault balance", async () => {
    const amount = new anchor.BN(5_000_000);

    await program.methods
      .deposit(amount)
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

    const pool = await program.account.poolState.fetch(poolPda);
    expect(pool.totalDeposited.toString()).to.equal(amount.toString());

    const vault = await getAccount(
      provider.connection,
      vaultPda,
      undefined,
      TOKEN_2022_PROGRAM_ID,
    );
    expect(vault.amount.toString()).to.equal(amount.toString());
  });

  it("locks collateral up to the available amount", async () => {
    const loanId = new anchor.BN(1);
    const amount = new anchor.BN(2_000_000);

    const [lockPda] = PublicKey.findProgramAddressSync(
      [LOCK_SEED, loanIdLeBytes(loanId.toNumber())],
      program.programId,
    );

    await program.methods
      .lockCollateral(loanId, amount)
      .accounts({
        authority: authority.publicKey,
        poolState: poolPda,
        lockRecord: lockPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const pool = await program.account.poolState.fetch(poolPda);
    expect(pool.totalLocked.toString()).to.equal(amount.toString());

    const lock = await program.account.lockRecord.fetch(lockPda);
    expect(lock.loanId.toString()).to.equal(loanId.toString());
    expect(lock.amount.toString()).to.equal(amount.toString());
  });

  it("rejects lock_collateral when caller is not the pool authority", async () => {
    const intruder = Keypair.generate();
    const sig = await provider.connection.requestAirdrop(
      intruder.publicKey,
      1_000_000_000,
    );
    await provider.connection.confirmTransaction(sig);

    const loanId = new anchor.BN(2);
    const [lockPda] = PublicKey.findProgramAddressSync(
      [LOCK_SEED, loanIdLeBytes(loanId.toNumber())],
      program.programId,
    );

    try {
      await program.methods
        .lockCollateral(loanId, new anchor.BN(100))
        .accounts({
          authority: intruder.publicKey,
          poolState: poolPda,
          lockRecord: lockPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([intruder])
        .rpc();
      assert.fail("expected lock by non-authority to fail");
    } catch (err) {
      const anchorErr = err as AnchorError;
      expect(anchorErr.error?.errorCode?.code).to.equal("Unauthorized");
    }
  });

  it("rejects lock_collateral when amount exceeds available collateral", async () => {
    const loanId = new anchor.BN(3);
    const [lockPda] = PublicKey.findProgramAddressSync(
      [LOCK_SEED, loanIdLeBytes(loanId.toNumber())],
      program.programId,
    );

    // pool: 5M deposited, 2M locked → 3M available. Try locking 4M.
    const tooMuch = new anchor.BN(4_000_000);

    try {
      await program.methods
        .lockCollateral(loanId, tooMuch)
        .accounts({
          authority: authority.publicKey,
          poolState: poolPda,
          lockRecord: lockPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      assert.fail("expected over-lock to fail");
    } catch (err) {
      const anchorErr = err as AnchorError;
      expect(anchorErr.error?.errorCode?.code).to.equal(
        "InsufficientAvailableCollateral",
      );
    }
  });

  it("unlocks collateral and reduces total_locked, closing the LockRecord", async () => {
    const loanId = new anchor.BN(1);
    const [lockPda] = PublicKey.findProgramAddressSync(
      [LOCK_SEED, loanIdLeBytes(loanId.toNumber())],
      program.programId,
    );

    const before = await program.account.poolState.fetch(poolPda);

    await program.methods
      .unlockCollateral(loanId)
      .accounts({
        authority: authority.publicKey,
        poolState: poolPda,
        lockRecord: lockPda,
      })
      .rpc();

    const after = await program.account.poolState.fetch(poolPda);
    expect(after.totalLocked.toString()).to.equal(
      before.totalLocked.sub(new anchor.BN(2_000_000)).toString(),
    );

    // LockRecord should be closed
    const info = await provider.connection.getAccountInfo(lockPda);
    expect(info).to.equal(null);
  });
});

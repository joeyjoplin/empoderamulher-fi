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
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  getAccount,
  getMint,
} from "@solana/spl-token";
import { assert, expect } from "chai";
import { RwaToken } from "../target/types/rwa_token";

const TOKEN_CONFIG_SEED = Buffer.from("rwa_token_config");

describe("rwa_token", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.RwaToken as Program<RwaToken>;
  const authority = (provider.wallet as anchor.Wallet).payer;

  const mintKeypair = Keypair.generate();

  const [tokenConfigPda] = PublicKey.findProgramAddressSync(
    [TOKEN_CONFIG_SEED],
    program.programId,
  );

  const decimals = 6;

  const recipient = Keypair.generate();
  const recipientAta = getAssociatedTokenAddressSync(
    mintKeypair.publicKey,
    recipient.publicKey,
    false,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );

  it("initializes the token config and Token-2022 mint", async () => {
    await program.methods
      .initializeTokenConfig(decimals)
      .accounts({
        authority: authority.publicKey,
        tokenConfig: tokenConfigPda,
        mint: mintKeypair.publicKey,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([mintKeypair])
      .rpc();

    const config = await program.account.tokenConfig.fetch(tokenConfigPda);
    expect(config.authority.toBase58()).to.equal(authority.publicKey.toBase58());
    expect(config.mint.toBase58()).to.equal(mintKeypair.publicKey.toBase58());
    expect(config.totalSupply.toNumber()).to.equal(0);
    expect(config.decimals).to.equal(decimals);

    const mint = await getMint(
      provider.connection,
      mintKeypair.publicKey,
      undefined,
      TOKEN_2022_PROGRAM_ID,
    );
    expect(mint.decimals).to.equal(decimals);
    expect(mint.mintAuthority?.toBase58()).to.equal(tokenConfigPda.toBase58());
  });

  it("mints RWA tokens to a recipient when called by authority", async () => {
    const createAtaIx = createAssociatedTokenAccountInstruction(
      authority.publicKey,
      recipientAta,
      recipient.publicKey,
      mintKeypair.publicKey,
      TOKEN_2022_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    );

    const amount = new anchor.BN(1_000_000);

    await program.methods
      .mintRwa(amount)
      .accounts({
        authority: authority.publicKey,
        tokenConfig: tokenConfigPda,
        mint: mintKeypair.publicKey,
        recipientAta,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .preInstructions([createAtaIx])
      .rpc();

    const ata = await getAccount(
      provider.connection,
      recipientAta,
      undefined,
      TOKEN_2022_PROGRAM_ID,
    );
    expect(ata.amount.toString()).to.equal(amount.toString());

    const config = await program.account.tokenConfig.fetch(tokenConfigPda);
    expect(config.totalSupply.toString()).to.equal(amount.toString());
  });

  it("rejects mint when caller is not the configured authority", async () => {
    const intruder = Keypair.generate();
    const sig = await provider.connection.requestAirdrop(
      intruder.publicKey,
      1_000_000_000,
    );
    await provider.connection.confirmTransaction(sig);

    try {
      await program.methods
        .mintRwa(new anchor.BN(500))
        .accounts({
          authority: intruder.publicKey,
          tokenConfig: tokenConfigPda,
          mint: mintKeypair.publicKey,
          recipientAta,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .signers([intruder])
        .rpc();
      assert.fail("expected mint by non-authority to fail");
    } catch (err) {
      const anchorErr = err as AnchorError;
      expect(anchorErr.error?.errorCode?.code).to.equal("Unauthorized");
    }
  });

  it("burns RWA tokens from the holder's ATA and reduces total supply", async () => {
    const burnAmount = new anchor.BN(400_000);

    const before = await program.account.tokenConfig.fetch(tokenConfigPda);

    await program.methods
      .burnRwa(burnAmount)
      .accounts({
        owner: recipient.publicKey,
        tokenConfig: tokenConfigPda,
        mint: mintKeypair.publicKey,
        fromAta: recipientAta,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .signers([recipient])
      .rpc();

    const ata = await getAccount(
      provider.connection,
      recipientAta,
      undefined,
      TOKEN_2022_PROGRAM_ID,
    );
    const expectedBalance = new anchor.BN(1_000_000).sub(burnAmount);
    expect(ata.amount.toString()).to.equal(expectedBalance.toString());

    const after = await program.account.tokenConfig.fetch(tokenConfigPda);
    expect(after.totalSupply.toString()).to.equal(
      before.totalSupply.sub(burnAmount).toString(),
    );
  });
});

import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorError } from "@coral-xyz/anchor";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { createHmac, randomBytes } from "crypto";
import { assert, expect } from "chai";
import { Score as ScoreProgram } from "../target/types/score";

const SCORE_CONFIG_SEED = Buffer.from("score_config");
const SCORE_SEED = Buffer.from("score");

function hmacCnpj(pepper: Buffer, cnpjDigits: string): number[] {
  const mac = createHmac("sha256", pepper).update(cnpjDigits).digest();
  return Array.from(mac);
}

describe("score", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Score as Program<ScoreProgram>;
  const authority = (provider.wallet as anchor.Wallet).payer;
  const attestor = Keypair.generate();

  const pepper = randomBytes(32);
  const cnpjMaria = "12345678000190";
  const cnpjAna = "98765432000110";
  const cnpjMariaHash = hmacCnpj(pepper, cnpjMaria);
  const cnpjAnaHash = hmacCnpj(pepper, cnpjAna);

  const [configPda] = PublicKey.findProgramAddressSync(
    [SCORE_CONFIG_SEED],
    program.programId,
  );

  const [scoreMariaPda] = PublicKey.findProgramAddressSync(
    [SCORE_SEED, Buffer.from(cnpjMariaHash)],
    program.programId,
  );

  const [scoreAnaPda] = PublicKey.findProgramAddressSync(
    [SCORE_SEED, Buffer.from(cnpjAnaHash)],
    program.programId,
  );

  before(async () => {
    const sig = await provider.connection.requestAirdrop(
      attestor.publicKey,
      2_000_000_000,
    );
    await provider.connection.confirmTransaction(sig);
  });

  it("initializes the score config with the chosen attestor", async () => {
    await program.methods
      .initializeScoreConfig(attestor.publicKey)
      .accounts({
        authority: authority.publicKey,
        config: configPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const config = await program.account.scoreConfig.fetch(configPda);
    expect(config.authority.toBase58()).to.equal(authority.publicKey.toBase58());
    expect(config.attestor.toBase58()).to.equal(attestor.publicKey.toBase58());
  });

  it("lets the attestor write a score for a CNPJ hash", async () => {
    await program.methods
      .attestScore(cnpjMariaHash, 612, {
        discipline: 580,
        organization: 640,
        cashFlow: 600,
        engagement: 700,
      })
      .accounts({
        attestor: attestor.publicKey,
        config: configPda,
        score: scoreMariaPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([attestor])
      .rpc();

    const stored = await program.account.score.fetch(scoreMariaPda);
    expect(Buffer.from(stored.cnpjHmac).equals(Buffer.from(cnpjMariaHash))).to.be.true;
    expect(stored.totalScore).to.equal(612);
    expect(stored.disciplineScore).to.equal(580);
    expect(stored.organizationScore).to.equal(640);
    expect(stored.cashFlowScore).to.equal(600);
    expect(stored.engagementScore).to.equal(700);
    expect(stored.attestor.toBase58()).to.equal(attestor.publicKey.toBase58());
    expect(stored.lastUpdatedAt.toNumber()).to.be.greaterThan(0);
  });

  it("rejects attest_score from a non-attestor signer", async () => {
    const intruder = Keypair.generate();
    const sig = await provider.connection.requestAirdrop(
      intruder.publicKey,
      1_000_000_000,
    );
    await provider.connection.confirmTransaction(sig);

    try {
      await program.methods
        .attestScore(cnpjAnaHash, 500, {
          discipline: 500,
          organization: 500,
          cashFlow: 500,
          engagement: 500,
        })
        .accounts({
          attestor: intruder.publicKey,
          config: configPda,
          score: scoreAnaPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([intruder])
        .rpc();
      assert.fail("expected attest by non-attestor to fail");
    } catch (err) {
      const anchorErr = err as AnchorError;
      expect(anchorErr.error?.errorCode?.code).to.equal("Unauthorized");
    }
  });

  it("rejects attest_score when any score value exceeds 1000", async () => {
    try {
      await program.methods
        .attestScore(cnpjAnaHash, 1500, {
          discipline: 500,
          organization: 500,
          cashFlow: 500,
          engagement: 500,
        })
        .accounts({
          attestor: attestor.publicKey,
          config: configPda,
          score: scoreAnaPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([attestor])
        .rpc();
      assert.fail("expected attest with score > 1000 to fail");
    } catch (err) {
      const anchorErr = err as AnchorError;
      expect(anchorErr.error?.errorCode?.code).to.equal("ScoreOutOfRange");
    }
  });

  it("re-attesting the same CNPJ hash updates fields in place (idempotent)", async () => {
    const before = await program.account.score.fetch(scoreMariaPda);
    const beforeTimestamp = before.lastUpdatedAt.toNumber();

    await new Promise((resolve) => setTimeout(resolve, 1100));

    await program.methods
      .attestScore(cnpjMariaHash, 720, {
        discipline: 700,
        organization: 720,
        cashFlow: 740,
        engagement: 760,
      })
      .accounts({
        attestor: attestor.publicKey,
        config: configPda,
        score: scoreMariaPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([attestor])
      .rpc();

    const after = await program.account.score.fetch(scoreMariaPda);
    expect(after.totalScore).to.equal(720);
    expect(after.disciplineScore).to.equal(700);
    expect(after.organizationScore).to.equal(720);
    expect(after.cashFlowScore).to.equal(740);
    expect(after.engagementScore).to.equal(760);
    expect(after.lastUpdatedAt.toNumber()).to.be.greaterThan(beforeTimestamp);
    expect(Buffer.from(after.cnpjHmac).equals(Buffer.from(cnpjMariaHash))).to.be.true;
  });

  it("revokes (closes) a previously attested score", async () => {
    await program.methods
      .attestScore(cnpjAnaHash, 510, {
        discipline: 500,
        organization: 510,
        cashFlow: 520,
        engagement: 530,
      })
      .accounts({
        attestor: attestor.publicKey,
        config: configPda,
        score: scoreAnaPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([attestor])
      .rpc();

    const stored = await program.account.score.fetch(scoreAnaPda);
    expect(stored.totalScore).to.equal(510);

    await program.methods
      .revokeScore(cnpjAnaHash)
      .accounts({
        attestor: attestor.publicKey,
        config: configPda,
        score: scoreAnaPda,
        recipient: authority.publicKey,
      })
      .signers([attestor])
      .rpc();

    const closed = await provider.connection.getAccountInfo(scoreAnaPda);
    expect(closed).to.equal(null);
  });

  it("rejects revoke_score from a non-attestor signer", async () => {
    await program.methods
      .attestScore(cnpjAnaHash, 510, {
        discipline: 500,
        organization: 510,
        cashFlow: 520,
        engagement: 530,
      })
      .accounts({
        attestor: attestor.publicKey,
        config: configPda,
        score: scoreAnaPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([attestor])
      .rpc();

    const intruder = Keypair.generate();
    const sig = await provider.connection.requestAirdrop(
      intruder.publicKey,
      1_000_000_000,
    );
    await provider.connection.confirmTransaction(sig);

    try {
      await program.methods
        .revokeScore(cnpjAnaHash)
        .accounts({
          attestor: intruder.publicKey,
          config: configPda,
          score: scoreAnaPda,
          recipient: intruder.publicKey,
        })
        .signers([intruder])
        .rpc();
      assert.fail("expected revoke by non-attestor to fail");
    } catch (err) {
      const anchorErr = err as AnchorError;
      expect(anchorErr.error?.errorCode?.code).to.equal("Unauthorized");
    }
  });
});

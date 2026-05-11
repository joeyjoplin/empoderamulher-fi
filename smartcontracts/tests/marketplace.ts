import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorError, BN } from "@coral-xyz/anchor";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { assert, expect } from "chai";
import { Marketplace } from "../target/types/marketplace";

const PAYMENT_SEED = Buffer.from("payment");

function nonceLeBytes(nonce: bigint): Buffer {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(nonce);
  return buf;
}

function paymentPda(
  programId: PublicKey,
  buyer: PublicKey,
  provider: PublicKey,
  nonce: bigint,
): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [PAYMENT_SEED, buyer.toBuffer(), provider.toBuffer(), nonceLeBytes(nonce)],
    programId,
  );
  return pda;
}

describe("marketplace", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Marketplace as Program<Marketplace>;
  const payer = (provider.wallet as anchor.Wallet).payer;

  // Personas: Maria the buyer, Ana the provider. Both need SOL to sign.
  const maria = Keypair.generate();
  const ana = Keypair.generate();
  // Independent third party that should never be able to cancel a request.
  const intruder = Keypair.generate();

  let nonceCounter = 0n;
  const nextNonce = (): bigint => {
    nonceCounter += 1n;
    return BigInt(Date.now()) * 1000n + nonceCounter;
  };

  before(async () => {
    for (const kp of [maria, ana, intruder]) {
      const sig = await provider.connection.requestAirdrop(
        kp.publicKey,
        2_000_000_000,
      );
      await provider.connection.confirmTransaction(sig);
    }
  });

  it("provider creates a Pending request and emits PaymentRequestCreated", async () => {
    const nonce = nextNonce();
    const request = paymentPda(
      program.programId,
      maria.publicKey,
      ana.publicKey,
      nonce,
    );

    await program.methods
      .createPaymentRequest(
        new BN(nonce.toString()),
        new BN(8000), // R$ 80,00 in cents
        { packaging: {} },
        "Embalagens artesanais — kit 50un",
      )
      .accounts({
        provider: ana.publicKey,
        buyer: maria.publicKey,
        request,
        systemProgram: SystemProgram.programId,
      })
      .signers([ana])
      .rpc();

    const stored = await program.account.paymentRequest.fetch(request);
    expect(stored.from.toBase58()).to.equal(maria.publicKey.toBase58());
    expect(stored.to.toBase58()).to.equal(ana.publicKey.toBase58());
    expect(stored.amount.toNumber()).to.equal(8000);
    expect(stored.nonce.toString()).to.equal(nonce.toString());
    expect(stored.status).to.deep.equal({ pending: {} });
    expect(stored.category).to.deep.equal({ packaging: {} });
    expect(stored.memo).to.equal("Embalagens artesanais — kit 50un");
    expect(stored.createdAt.toNumber()).to.be.greaterThan(0);
    expect(stored.paidAt.toNumber()).to.equal(0);
    expect(stored.cancelledAt.toNumber()).to.equal(0);
  });

  it("buyer pays a Pending request — status flips to Paid", async () => {
    const nonce = nextNonce();
    const request = paymentPda(
      program.programId,
      maria.publicKey,
      ana.publicKey,
      nonce,
    );

    await program.methods
      .createPaymentRequest(
        new BN(nonce.toString()),
        new BN(15000),
        { services: {} },
        "Diaria de consultoria",
      )
      .accounts({
        provider: ana.publicKey,
        buyer: maria.publicKey,
        request,
        systemProgram: SystemProgram.programId,
      })
      .signers([ana])
      .rpc();

    await program.methods
      .payRequest(new BN(nonce.toString()))
      .accounts({
        buyer: maria.publicKey,
        request,
      })
      .signers([maria])
      .rpc();

    const stored = await program.account.paymentRequest.fetch(request);
    expect(stored.status).to.deep.equal({ paid: {} });
    expect(stored.paidAt.toNumber()).to.be.greaterThan(0);
    expect(stored.cancelledAt.toNumber()).to.equal(0);
  });

  it("provider can cancel a Pending request", async () => {
    const nonce = nextNonce();
    const request = paymentPda(
      program.programId,
      maria.publicKey,
      ana.publicKey,
      nonce,
    );

    await program.methods
      .createPaymentRequest(
        new BN(nonce.toString()),
        new BN(5000),
        { other: {} },
        "Pedido a confirmar",
      )
      .accounts({
        provider: ana.publicKey,
        buyer: maria.publicKey,
        request,
        systemProgram: SystemProgram.programId,
      })
      .signers([ana])
      .rpc();

    await program.methods
      .cancelRequest(new BN(nonce.toString()))
      .accounts({
        canceller: ana.publicKey,
        request,
      })
      .signers([ana])
      .rpc();

    const stored = await program.account.paymentRequest.fetch(request);
    expect(stored.status).to.deep.equal({ cancelled: {} });
    expect(stored.cancelledAt.toNumber()).to.be.greaterThan(0);
    expect(stored.paidAt.toNumber()).to.equal(0);
  });

  it("buyer can also cancel a Pending request", async () => {
    const nonce = nextNonce();
    const request = paymentPda(
      program.programId,
      maria.publicKey,
      ana.publicKey,
      nonce,
    );

    await program.methods
      .createPaymentRequest(
        new BN(nonce.toString()),
        new BN(2500),
        { supplies: {} },
        "Insumos diversos",
      )
      .accounts({
        provider: ana.publicKey,
        buyer: maria.publicKey,
        request,
        systemProgram: SystemProgram.programId,
      })
      .signers([ana])
      .rpc();

    await program.methods
      .cancelRequest(new BN(nonce.toString()))
      .accounts({
        canceller: maria.publicKey,
        request,
      })
      .signers([maria])
      .rpc();

    const stored = await program.account.paymentRequest.fetch(request);
    expect(stored.status).to.deep.equal({ cancelled: {} });
  });

  it("rejects double-pay (Pending → Paid → pay again must fail)", async () => {
    const nonce = nextNonce();
    const request = paymentPda(
      program.programId,
      maria.publicKey,
      ana.publicKey,
      nonce,
    );

    await program.methods
      .createPaymentRequest(
        new BN(nonce.toString()),
        new BN(1000),
        { other: {} },
        "Single-pay",
      )
      .accounts({
        provider: ana.publicKey,
        buyer: maria.publicKey,
        request,
        systemProgram: SystemProgram.programId,
      })
      .signers([ana])
      .rpc();

    await program.methods
      .payRequest(new BN(nonce.toString()))
      .accounts({ buyer: maria.publicKey, request })
      .signers([maria])
      .rpc();

    try {
      await program.methods
        .payRequest(new BN(nonce.toString()))
        .accounts({ buyer: maria.publicKey, request })
        .signers([maria])
        .rpc();
      assert.fail("expected double-pay to fail with InvalidStatus");
    } catch (err) {
      const anchorErr = err as AnchorError;
      expect(anchorErr.error?.errorCode?.code).to.equal("InvalidStatus");
    }
  });

  it("rejects cancel by an unrelated third party", async () => {
    const nonce = nextNonce();
    const request = paymentPda(
      program.programId,
      maria.publicKey,
      ana.publicKey,
      nonce,
    );

    await program.methods
      .createPaymentRequest(
        new BN(nonce.toString()),
        new BN(7000),
        { packaging: {} },
        "Para cancelar",
      )
      .accounts({
        provider: ana.publicKey,
        buyer: maria.publicKey,
        request,
        systemProgram: SystemProgram.programId,
      })
      .signers([ana])
      .rpc();

    try {
      await program.methods
        .cancelRequest(new BN(nonce.toString()))
        .accounts({ canceller: intruder.publicKey, request })
        .signers([intruder])
        .rpc();
      assert.fail("expected cancel by intruder to fail with Unauthorized");
    } catch (err) {
      const anchorErr = err as AnchorError;
      expect(anchorErr.error?.errorCode?.code).to.equal("Unauthorized");
    }
  });

  it("rejects amount=0 at create time", async () => {
    const nonce = nextNonce();
    const request = paymentPda(
      program.programId,
      maria.publicKey,
      ana.publicKey,
      nonce,
    );

    try {
      await program.methods
        .createPaymentRequest(
          new BN(nonce.toString()),
          new BN(0),
          { other: {} },
          "Zero",
        )
        .accounts({
          provider: ana.publicKey,
          buyer: maria.publicKey,
          request,
          systemProgram: SystemProgram.programId,
        })
        .signers([ana])
        .rpc();
      assert.fail("expected amount=0 to fail with InvalidAmount");
    } catch (err) {
      const anchorErr = err as AnchorError;
      expect(anchorErr.error?.errorCode?.code).to.equal("InvalidAmount");
    }
  });
});

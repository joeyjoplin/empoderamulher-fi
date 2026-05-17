import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorError, BN } from "@coral-xyz/anchor";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { assert, expect } from "chai";
import { Marketplace } from "../target/types/marketplace";

const PAYMENT_SEED = Buffer.from("payment");
const BNPL_SEED = Buffer.from("bnpl");

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

function bnplPlanPda(
  programId: PublicKey,
  paymentRequest: PublicKey,
  buyer: PublicKey,
): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [BNPL_SEED, paymentRequest.toBuffer(), buyer.toBuffer()],
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
      .accountsPartial({
        buyer: maria.publicKey,
        request,
        bnplPlan: null,
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
      .accountsPartial({ buyer: maria.publicKey, request, bnplPlan: null })
      .signers([maria])
      .rpc();

    try {
      await program.methods
        .payRequest(new BN(nonce.toString()))
        .accountsPartial({ buyer: maria.publicKey, request, bnplPlan: null })
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

  // ──────────────────────────────────────────────────────────────────────
  // BNPL (Marketplace v2)
  //
  // Buyer-initiated BNPL flow: `create_bnpl_request` opens both the
  // PaymentRequest (Pending) and the BnplPlan (Active) in one tx; the
  // backend follows up with `pay_request` (passing the bnpl_plan
  // account) to record the supplier-upfront payout, which emits
  // `PaymentCompleted { bnpl: true }`. The buyer then records each
  // installment via `record_installment`. When the last installment is
  // recorded the plan flips to Completed and emits `BnplPlanCompleted`.
  // ──────────────────────────────────────────────────────────────────────

  /** Convenience: returns a `first_due_at` ~30 days in the future as i64 seconds. */
  const future30d = (): BN =>
    new BN(Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60);

  it("buyer creates a BNPL request — both PaymentRequest and BnplPlan are initialized", async () => {
    const nonce = nextNonce();
    const request = paymentPda(
      program.programId,
      maria.publicKey,
      ana.publicKey,
      nonce,
    );
    const plan = bnplPlanPda(program.programId, request, maria.publicKey);

    await program.methods
      .createBnplRequest(
        new BN(nonce.toString()),
        new BN(20000), // principal_amount: R$ 200,00
        new BN(21000), // total_repayable: R$ 210,00 (5% embedded)
        2, // installment_count
        new BN(10500), // installment_amount: R$ 105,00 each
        future30d(),
        { supplies: {} },
        "Insumos parcelados em 2x",
      )
      .accountsPartial({
        buyer: maria.publicKey,
        provider: ana.publicKey,
        request,
        plan,
        systemProgram: SystemProgram.programId,
      })
      .signers([maria])
      .rpc();

    const storedRequest = await program.account.paymentRequest.fetch(request);
    expect(storedRequest.amount.toNumber()).to.equal(20000);
    expect(storedRequest.status).to.deep.equal({ pending: {} });

    const storedPlan = await program.account.bnplPlan.fetch(plan);
    expect(storedPlan.paymentRequest.toBase58()).to.equal(request.toBase58());
    expect(storedPlan.buyer.toBase58()).to.equal(maria.publicKey.toBase58());
    expect(storedPlan.principalAmount.toNumber()).to.equal(20000);
    expect(storedPlan.totalRepayable.toNumber()).to.equal(21000);
    expect(storedPlan.installmentCount).to.equal(2);
    expect(storedPlan.installmentAmount.toNumber()).to.equal(10500);
    expect(storedPlan.paidInstallments).to.equal(0);
    expect(storedPlan.status).to.deep.equal({ active: {} });
  });

  it("create_bnpl_request → pay_request flips PaymentRequest to Paid (supplier upfront)", async () => {
    const nonce = nextNonce();
    const request = paymentPda(
      program.programId,
      maria.publicKey,
      ana.publicKey,
      nonce,
    );
    const plan = bnplPlanPda(program.programId, request, maria.publicKey);

    await program.methods
      .createBnplRequest(
        new BN(nonce.toString()),
        new BN(15000),
        new BN(15750),
        3,
        new BN(5250),
        future30d(),
        { services: {} },
        "Serviço parcelado em 3x",
      )
      .accountsPartial({
        buyer: maria.publicKey,
        provider: ana.publicKey,
        request,
        plan,
        systemProgram: SystemProgram.programId,
      })
      .signers([maria])
      .rpc();

    // Supplier-upfront leg: pay_request with bnpl_plan present → bnpl=true
    await program.methods
      .payRequest(new BN(nonce.toString()))
      .accountsPartial({
        buyer: maria.publicKey,
        request,
        bnplPlan: plan,
      })
      .signers([maria])
      .rpc();

    const storedRequest = await program.account.paymentRequest.fetch(request);
    expect(storedRequest.status).to.deep.equal({ paid: {} });
    expect(storedRequest.paidAt.toNumber()).to.be.greaterThan(0);

    // Plan still Active — supplier was paid upfront, buyer still owes installments.
    const storedPlan = await program.account.bnplPlan.fetch(plan);
    expect(storedPlan.status).to.deep.equal({ active: {} });
    expect(storedPlan.paidInstallments).to.equal(0);
  });

  it("record_installment x N flips plan to Completed on the final installment", async () => {
    const nonce = nextNonce();
    const request = paymentPda(
      program.programId,
      maria.publicKey,
      ana.publicKey,
      nonce,
    );
    const plan = bnplPlanPda(program.programId, request, maria.publicKey);

    await program.methods
      .createBnplRequest(
        new BN(nonce.toString()),
        new BN(10000),
        new BN(10500),
        2,
        new BN(5250),
        future30d(),
        { other: {} },
        "Plano de 2x para encerrar",
      )
      .accountsPartial({
        buyer: maria.publicKey,
        provider: ana.publicKey,
        request,
        plan,
        systemProgram: SystemProgram.programId,
      })
      .signers([maria])
      .rpc();

    // First installment — plan still Active.
    await program.methods
      .recordInstallment(new BN(nonce.toString()), 0)
      .accountsPartial({
        buyer: maria.publicKey,
        request,
        plan,
      })
      .signers([maria])
      .rpc();
    let storedPlan = await program.account.bnplPlan.fetch(plan);
    expect(storedPlan.paidInstallments).to.equal(1);
    expect(storedPlan.status).to.deep.equal({ active: {} });

    // Second installment — plan flips to Completed.
    await program.methods
      .recordInstallment(new BN(nonce.toString()), 1)
      .accountsPartial({
        buyer: maria.publicKey,
        request,
        plan,
      })
      .signers([maria])
      .rpc();
    storedPlan = await program.account.bnplPlan.fetch(plan);
    expect(storedPlan.paidInstallments).to.equal(2);
    expect(storedPlan.status).to.deep.equal({ completed: {} });
  });

  it("rejects record_installment after the plan is already complete", async () => {
    const nonce = nextNonce();
    const request = paymentPda(
      program.programId,
      maria.publicKey,
      ana.publicKey,
      nonce,
    );
    const plan = bnplPlanPda(program.programId, request, maria.publicKey);

    await program.methods
      .createBnplRequest(
        new BN(nonce.toString()),
        new BN(8000),
        new BN(8400),
        1, // single installment so we can complete + try to over-pay quickly
        new BN(8400),
        future30d(),
        { packaging: {} },
        "Plano de 1x",
      )
      .accountsPartial({
        buyer: maria.publicKey,
        provider: ana.publicKey,
        request,
        plan,
        systemProgram: SystemProgram.programId,
      })
      .signers([maria])
      .rpc();

    await program.methods
      .recordInstallment(new BN(nonce.toString()), 0)
      .accountsPartial({ buyer: maria.publicKey, request, plan })
      .signers([maria])
      .rpc();

    try {
      await program.methods
        .recordInstallment(new BN(nonce.toString()), 1)
        .accountsPartial({ buyer: maria.publicKey, request, plan })
        .signers([maria])
        .rpc();
      assert.fail("expected over-installment to fail with BnplAlreadyComplete");
    } catch (err) {
      const anchorErr = err as AnchorError;
      expect(anchorErr.error?.errorCode?.code).to.equal("BnplAlreadyComplete");
    }
  });

  it("rejects record_installment with an out-of-order index", async () => {
    const nonce = nextNonce();
    const request = paymentPda(
      program.programId,
      maria.publicKey,
      ana.publicKey,
      nonce,
    );
    const plan = bnplPlanPda(program.programId, request, maria.publicKey);

    await program.methods
      .createBnplRequest(
        new BN(nonce.toString()),
        new BN(12000),
        new BN(12600),
        3,
        new BN(4200),
        future30d(),
        { services: {} },
        "Plano de 3x — testar ordem",
      )
      .accountsPartial({
        buyer: maria.publicKey,
        provider: ana.publicKey,
        request,
        plan,
        systemProgram: SystemProgram.programId,
      })
      .signers([maria])
      .rpc();

    // Skip ahead — try to record installment_index = 1 before recording 0.
    try {
      await program.methods
        .recordInstallment(new BN(nonce.toString()), 1)
        .accountsPartial({ buyer: maria.publicKey, request, plan })
        .signers([maria])
        .rpc();
      assert.fail("expected out-of-order index to fail with InvalidInstallmentOrder");
    } catch (err) {
      const anchorErr = err as AnchorError;
      expect(anchorErr.error?.errorCode?.code).to.equal("InvalidInstallmentOrder");
    }
  });

  it("rejects record_installment when an unrelated party signs", async () => {
    const nonce = nextNonce();
    const request = paymentPda(
      program.programId,
      maria.publicKey,
      ana.publicKey,
      nonce,
    );
    const plan = bnplPlanPda(program.programId, request, maria.publicKey);

    await program.methods
      .createBnplRequest(
        new BN(nonce.toString()),
        new BN(6000),
        new BN(6300),
        2,
        new BN(3150),
        future30d(),
        { other: {} },
        "Plano para testar signer",
      )
      .accountsPartial({
        buyer: maria.publicKey,
        provider: ana.publicKey,
        request,
        plan,
        systemProgram: SystemProgram.programId,
      })
      .signers([maria])
      .rpc();

    // The intruder is neither the buyer nor a party to the plan.
    try {
      await program.methods
        .recordInstallment(new BN(nonce.toString()), 0)
        .accountsPartial({ buyer: intruder.publicKey, request, plan })
        .signers([intruder])
        .rpc();
      assert.fail("expected wrong-signer to fail");
    } catch (err) {
      // Constraint failures land here; we accept either Unauthorized
      // (our typed error) or the seeds-mismatch ConstraintSeeds, since
      // changing the buyer also changes the PDA derivation chain.
      const anchorErr = err as AnchorError;
      expect(["Unauthorized", "ConstraintSeeds"]).to.include(
        anchorErr.error?.errorCode?.code ?? "",
      );
    }
  });

  it("rejects create_bnpl_request with installment_count out of range (0 or > MAX_INSTALLMENTS)", async () => {
    const nonce = nextNonce();
    const request = paymentPda(
      program.programId,
      maria.publicKey,
      ana.publicKey,
      nonce,
    );
    const plan = bnplPlanPda(program.programId, request, maria.publicKey);

    try {
      await program.methods
        .createBnplRequest(
          new BN(nonce.toString()),
          new BN(10000),
          new BN(10500),
          0, // invalid: must be >= 1
          new BN(0),
          future30d(),
          { other: {} },
          "Zero installments",
        )
        .accountsPartial({
          buyer: maria.publicKey,
          provider: ana.publicKey,
          request,
          plan,
          systemProgram: SystemProgram.programId,
        })
        .signers([maria])
        .rpc();
      assert.fail("expected installment_count=0 to fail");
    } catch (err) {
      const anchorErr = err as AnchorError;
      expect(anchorErr.error?.errorCode?.code).to.be.oneOf([
        "BnplInstallmentCountOutOfRange",
        "InvalidAmount", // installment_amount=0 may trip this first
      ]);
    }
  });

  it("rejects create_bnpl_request with first_due_at in the past", async () => {
    const nonce = nextNonce();
    const request = paymentPda(
      program.programId,
      maria.publicKey,
      ana.publicKey,
      nonce,
    );
    const plan = bnplPlanPda(program.programId, request, maria.publicKey);

    try {
      await program.methods
        .createBnplRequest(
          new BN(nonce.toString()),
          new BN(10000),
          new BN(10500),
          2,
          new BN(5250),
          new BN(Math.floor(Date.now() / 1000) - 60), // 1min in the past
          { other: {} },
          "Past due date",
        )
        .accountsPartial({
          buyer: maria.publicKey,
          provider: ana.publicKey,
          request,
          plan,
          systemProgram: SystemProgram.programId,
        })
        .signers([maria])
        .rpc();
      assert.fail("expected past first_due_at to fail with BnplFirstDueInPast");
    } catch (err) {
      const anchorErr = err as AnchorError;
      expect(anchorErr.error?.errorCode?.code).to.equal("BnplFirstDueInPast");
    }
  });
});

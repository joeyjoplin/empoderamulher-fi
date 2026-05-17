/**
 * Real on-chain implementation of `MarketplaceService`. Orchestrates
 * `createPaymentRequest → payRequest` against the marketplace program in
 * a single backend call so the frontend hires-and-pays in one round-trip.
 *
 * Hackathon limitation (same compromise as `SolanaLoanService`): each
 * hire generates fresh ephemeral keypairs for buyer + provider — the
 * persona's `wallet_pubkey` is symbolic. Production needs both parties to
 * sign client-side via Web3Auth / wallet adapter.
 *
 * BNPL note: `hireBnpl` keeps the buyer keypair around in the repo so
 * `recordInstallment` can sign as that same buyer later. Direct production
 * implementations would route signing back through the user's wallet.
 */

import bs58 from "bs58";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";

import type { BnplEligibilityService } from "./bnpl_eligibility.js";
import {
  BNPL_RATES_BY_TIER,
  buildQuoteOptions,
  quoteOption,
} from "./bnpl_pricing.js";
import {
  bnplPlanPda,
  createBnplRequest,
  createPaymentRequest,
  paymentRequestPda,
  payRequest,
  recordInstallment as recordInstallmentTx,
  type PaymentCategory,
  type SolanaClient,
} from "./solana/index.js";
import {
  MarketplaceServiceError,
  type BnplPlanRecord,
  type BnplQuote,
  type CompletedBnplHire,
  type CompletedHire,
  type HireBnplParams,
  type HireProviderParams,
  type MarketplaceRepository,
  type MarketplaceService,
  type QuoteBnplParams,
  type RecordedInstallment,
  type RecordInstallmentParams,
} from "./marketplace.js";

export type SolanaMarketplaceServiceOptions = {
  client: SolanaClient;
  eligibility: BnplEligibilityService;
  repository: MarketplaceRepository;
  /**
   * Devnet/localnet only. When true, the service mints fresh keypairs for
   * the buyer + provider on every hire and funds them from the payer so
   * they can sign + cover rent. When false, you must supply real signers
   * (post-Web3Auth, out of MVP scope).
   */
  airdropSigners?: boolean;
};

export class SolanaMarketplaceService implements MarketplaceService {
  constructor(private readonly opts: SolanaMarketplaceServiceOptions) {}

  async hireProvider(params: HireProviderParams): Promise<CompletedHire> {
    const client = this.opts.client;

    const buyer = Keypair.generate();
    const provider = Keypair.generate();

    await this.maybeFundSigner(buyer, "buyer");
    await this.maybeFundSigner(provider, "provider");

    const nonce = generateNonce();

    let createSig: string;
    let requestAddress: string;
    try {
      const r = await createPaymentRequest(client, {
        providerSigner: provider,
        buyer: buyer.publicKey,
        nonce,
        amount: BigInt(params.amountCents),
        category: params.category,
        memo: params.memo,
      });
      createSig = r.signature;
      requestAddress = r.request;
    } catch (err) {
      throw new MarketplaceServiceError(
        "create_payment_request_failed",
        err instanceof Error ? err.message : "create_payment_request failed",
      );
    }

    let paySig: string;
    try {
      const r = await payRequest(client, {
        buyerSigner: buyer,
        provider: provider.publicKey,
        nonce,
      });
      paySig = r.signature;
    } catch (err) {
      throw new MarketplaceServiceError(
        "pay_request_failed",
        err instanceof Error ? err.message : "pay_request failed",
      );
    }

    // Defensive — the wrapper already returned this address but recomputing
    // here proves the PDA derivation is consistent with what the indexer will
    // see, and is cheap.
    const [pda] = paymentRequestPda(
      client.programIds.marketplace,
      buyer.publicKey,
      provider.publicKey,
      nonce,
    );

    return {
      requestAddress: pda.toBase58() === requestAddress
        ? requestAddress
        : pda.toBase58(),
      nonce: nonce.toString(),
      status: "paid",
      signatures: { create: createSig, pay: paySig },
      amountCents: params.amountCents,
      category: params.category,
      buyerPubkey: buyer.publicKey.toBase58(),
      providerPubkey: provider.publicKey.toBase58(),
    };
  }

  async quoteBnpl(params: QuoteBnplParams): Promise<BnplQuote> {
    const elig = await this.opts.eligibility.evaluate({
      personaId: params.buyerPersonaId,
      cnpjDigits: null,
    });
    if (!elig.eligible) {
      throw new MarketplaceServiceError(elig.reason, elig.message);
    }
    const rule = BNPL_RATES_BY_TIER[elig.tier];
    return {
      tier: elig.tier,
      upfrontCents: params.principalCents,
      maxInstallmentCount: rule.maxInstallmentCount,
      options: buildQuoteOptions({
        tier: elig.tier,
        principalCents: params.principalCents,
      }),
    };
  }

  async hireBnpl(params: HireBnplParams): Promise<CompletedBnplHire> {
    const client = this.opts.client;

    const elig = await this.opts.eligibility.evaluate({
      personaId: params.buyerPersonaId,
      cnpjDigits: null,
    });
    if (!elig.eligible) {
      throw new MarketplaceServiceError(elig.reason, elig.message);
    }
    const rule = BNPL_RATES_BY_TIER[elig.tier];
    if (params.installmentCount < 2 || params.installmentCount > rule.maxInstallmentCount) {
      throw new MarketplaceServiceError(
        "invalid_installment_count",
        `tier ${elig.tier} allows 2..${rule.maxInstallmentCount} installments`,
      );
    }
    const nowSec = Math.floor(Date.now() / 1000);
    if (params.firstDueAt <= nowSec) {
      throw new MarketplaceServiceError(
        "first_due_in_past",
        "firstDueAt must be in the future",
      );
    }

    const quote = quoteOption({
      principalCents: params.principalCents,
      installmentCount: params.installmentCount,
      interestRateBps: rule.interestRateBps,
    });

    const buyer = Keypair.generate();
    const provider = Keypair.generate();
    await this.maybeFundSigner(buyer, "buyer");
    // Provider needs no funding — they don't sign anything in the BNPL flow.

    const nonce = generateNonce();

    let createSig: string;
    let planAddress: string;
    let requestAddress: string;
    try {
      const r = await createBnplRequest(client, {
        buyerSigner: buyer,
        provider: provider.publicKey,
        nonce,
        principalAmount: BigInt(params.principalCents),
        totalRepayable: BigInt(quote.totalRepayableCents),
        installmentCount: params.installmentCount,
        installmentAmount: BigInt(quote.installmentCents),
        firstDueAt: BigInt(params.firstDueAt),
        category: params.category,
        memo: params.memo,
      });
      createSig = r.signature;
      planAddress = r.plan;
      requestAddress = r.request;
    } catch (err) {
      throw new MarketplaceServiceError(
        "create_bnpl_request_failed",
        err instanceof Error ? err.message : "create_bnpl_request failed",
      );
    }

    const [planPda] = bnplPlanPda(
      client.programIds.marketplace,
      new PublicKey(requestAddress),
      buyer.publicKey,
    );

    let paySig: string;
    try {
      const r = await payRequest(client, {
        buyerSigner: buyer,
        provider: provider.publicKey,
        nonce,
        bnplPlan: planPda,
      });
      paySig = r.signature;
    } catch (err) {
      throw new MarketplaceServiceError(
        "pay_supplier_upfront_failed",
        err instanceof Error ? err.message : "pay_request (supplier upfront) failed",
      );
    }

    const record: BnplPlanRecord = {
      planId: planAddress,
      requestAddress,
      buyerPersonaId: params.buyerPersonaId,
      providerPersonaId: params.providerPersonaId,
      buyerPubkey: buyer.publicKey.toBase58(),
      providerPubkey: provider.publicKey.toBase58(),
      buyerSecretKey: bs58.encode(buyer.secretKey),
      nonce: nonce.toString(),
      principalCents: params.principalCents,
      totalRepayableCents: quote.totalRepayableCents,
      installmentCount: params.installmentCount,
      installmentCents: quote.installmentCents,
      interestRateBps: rule.interestRateBps,
      paidInstallments: 0,
      status: "active",
      category: params.category,
      firstDueAt: params.firstDueAt,
      memo: params.memo,
      createdAt: new Date(),
      signatures: {
        createPlan: createSig,
        paySupplier: paySig,
        installments: [],
      },
    };
    await this.opts.repository.saveBnplPlan(record);

    return {
      planId: planAddress,
      requestAddress,
      nonce: nonce.toString(),
      status: "active",
      signatures: { createPlan: createSig, paySupplier: paySig },
      principalCents: params.principalCents,
      totalRepayableCents: quote.totalRepayableCents,
      installmentCount: params.installmentCount,
      installmentCents: quote.installmentCents,
      interestRateBps: rule.interestRateBps,
      category: params.category,
      firstDueAt: params.firstDueAt,
      buyerPubkey: buyer.publicKey.toBase58(),
      providerPubkey: provider.publicKey.toBase58(),
    };
  }

  async recordInstallment(
    params: RecordInstallmentParams,
  ): Promise<RecordedInstallment> {
    const plan = await this.opts.repository.findBnplPlanById(params.planId);
    if (!plan) {
      throw new MarketplaceServiceError(
        "bnpl_plan_not_found",
        `no BNPL plan with id ${params.planId}`,
      );
    }
    if (plan.buyerPersonaId !== params.buyerPersonaId) {
      throw new MarketplaceServiceError(
        "unauthorized",
        "only the original buyer can record installments",
      );
    }
    if (plan.status === "completed") {
      throw new MarketplaceServiceError(
        "bnpl_already_complete",
        "all installments already recorded",
      );
    }
    if (params.installmentIndex !== plan.paidInstallments) {
      throw new MarketplaceServiceError(
        "invalid_installment_order",
        `expected installment index ${plan.paidInstallments}, got ${params.installmentIndex}`,
      );
    }

    const buyer = Keypair.fromSecretKey(bs58.decode(plan.buyerSecretKey));
    const providerPubkey = new PublicKey(plan.providerPubkey);
    const nonce = BigInt(plan.nonce);

    let signature: string;
    try {
      const r = await recordInstallmentTx(this.opts.client, {
        buyerSigner: buyer,
        provider: providerPubkey,
        nonce,
        installmentIndex: params.installmentIndex,
      });
      signature = r.signature;
    } catch (err) {
      throw new MarketplaceServiceError(
        "record_installment_failed",
        err instanceof Error ? err.message : "record_installment failed",
      );
    }

    const paidInstallments = plan.paidInstallments + 1;
    const completed = paidInstallments === plan.installmentCount;
    const updated: BnplPlanRecord = {
      ...plan,
      paidInstallments,
      status: completed ? "completed" : "active",
      signatures: {
        ...plan.signatures,
        installments: [...plan.signatures.installments, signature],
      },
    };
    await this.opts.repository.updateBnplPlan(updated);

    return {
      planId: plan.planId,
      installmentIndex: params.installmentIndex,
      paidInstallments,
      installmentCount: plan.installmentCount,
      status: updated.status,
      signature,
    };
  }

  private async maybeFundSigner(kp: Keypair, role: string): Promise<void> {
    if (!this.opts.airdropSigners) return;
    try {
      await this.fundFromPayer(kp, 0.05 * LAMPORTS_PER_SOL);
    } catch (err) {
      throw new MarketplaceServiceError(
        "signer_funding_failed",
        `${role}: ${err instanceof Error ? err.message : "ephemeral signer funding failed"}`,
      );
    }
  }

  private async fundFromPayer(
    recipient: Keypair,
    lamports: number,
  ): Promise<void> {
    const client = this.opts.client;
    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: client.payer.publicKey,
        toPubkey: recipient.publicKey,
        lamports,
      }),
    );
    const { blockhash, lastValidBlockHeight } =
      await client.connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.lastValidBlockHeight = lastValidBlockHeight;
    tx.feePayer = client.payer.publicKey;
    tx.sign(client.payer);
    const sig = await client.connection.sendRawTransaction(tx.serialize());
    await client.connection.confirmTransaction({
      signature: sig,
      blockhash,
      lastValidBlockHeight,
    });
  }
}

/**
 * Microsecond-derived nonce so two near-simultaneous hires for the
 * same (buyer, provider) pair don't collide on the PDA seed.
 */
function generateNonce(): bigint {
  return (
    BigInt(Date.now()) * 1000n + BigInt(Math.floor(Math.random() * 1000))
  );
}

// Type-tag also used by the service — `PaymentCategory` re-exported here so
// route + service can both import from the orchestration boundary without
// reaching into the Solana wrapper directly.
export type { PaymentCategory };

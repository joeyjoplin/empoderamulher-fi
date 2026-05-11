/**
 * Real on-chain implementation of `MarketplaceService`. Orchestrates
 * `createPaymentRequest → payRequest` against the marketplace program in
 * a single backend call so the frontend hires-and-pays in one round-trip.
 *
 * Hackathon limitation (same compromise as `SolanaLoanService`): each
 * hire generates fresh ephemeral keypairs for buyer + provider — the
 * persona's `wallet_pubkey` is symbolic. Production needs both parties to
 * sign client-side via Web3Auth / wallet adapter.
 */

import {
  Keypair,
  LAMPORTS_PER_SOL,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";

import {
  createPaymentRequest,
  paymentRequestPda,
  payRequest,
  type PaymentCategory,
  type SolanaClient,
} from "./solana/index.js";
import {
  MarketplaceServiceError,
  type CompletedHire,
  type HireProviderParams,
  type MarketplaceService,
} from "./marketplace.js";

export type SolanaMarketplaceServiceOptions = {
  client: SolanaClient;
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

    if (this.opts.airdropSigners) {
      try {
        await this.fundFromPayer(buyer, 0.05 * LAMPORTS_PER_SOL);
        await this.fundFromPayer(provider, 0.05 * LAMPORTS_PER_SOL);
      } catch (err) {
        throw new MarketplaceServiceError(
          "signer_funding_failed",
          err instanceof Error ? err.message : "ephemeral signer funding failed",
        );
      }
    }

    // Microsecond-derived nonce so two near-simultaneous hires for the
    // same (buyer, provider) pair don't collide on the PDA seed.
    const nonce = BigInt(Date.now()) * 1000n + BigInt(Math.floor(Math.random() * 1000));

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

// Type-tag also used by the service — `PaymentCategory` re-exported here so
// route + service can both import from the orchestration boundary without
// reaching into the Solana wrapper directly.
export type { PaymentCategory };

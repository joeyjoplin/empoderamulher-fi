use anchor_lang::prelude::*;

/// Lifecycle of a BNPL plan.
///
///   Active → Completed     (last installment recorded via `record_installment`)
///        ↓
///       Defaulted          (RESERVED — no recovery path implemented in MVP;
///                           never written by current handlers)
///
/// The plan is created in `Active` state by `create_bnpl_request` and stays
/// there as installments are recorded. When `paid_installments == installment_count`
/// the handler flips it to `Completed` and emits `BnplPlanCompleted`. The
/// `Defaulted` variant is in the enum so the recovery flow can ship as a
/// pure additive change (no on-chain migration), but no MVP code path
/// transitions into it.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq, InitSpace)]
pub enum BnplStatus {
    Active,
    Completed,
    Defaulted,
}

/// On-chain record of a buy-now-pay-later plan opened against a single
/// `PaymentRequest`. The supplier is paid up-front by the platform (recorded
/// via the existing `pay_request` instruction); this account tracks what the
/// buyer still owes and how many installments they've recorded so far.
///
/// 1:1 with `PaymentRequest` — `payment_request` is both a field and part of
/// the PDA seed, so given a payment request you can derive the plan address
/// deterministically without a secondary lookup.
#[account]
#[derive(InitSpace)]
pub struct BnplPlan {
    /// PDA of the `PaymentRequest` this plan is settling.
    pub payment_request: Pubkey,
    /// Buyer pubkey — also the signer who calls `record_installment`.
    pub buyer: Pubkey,
    /// What the supplier received up-front (in cents/lamports per the
    /// platform's chosen unit; same unit as `PaymentRequest.amount`).
    pub principal_amount: u64,
    /// Sum of all installments — `principal + embedded interest`. Off-chain
    /// pricing computes this; the program just records it.
    pub total_repayable: u64,
    /// Number of scheduled installments. Bounded by `MAX_INSTALLMENTS`.
    pub installment_count: u8,
    /// `total_repayable / installment_count` (off-chain computed). Stored so
    /// the indexer can validate per-installment amounts without re-deriving.
    pub installment_amount: u64,
    /// Counter incremented by `record_installment`. When it reaches
    /// `installment_count`, status flips to `Completed`.
    pub paid_installments: u8,
    /// Unix timestamp of the first installment due date. Validated to be in
    /// the future at create time.
    pub first_due_at: i64,
    pub status: BnplStatus,
    pub created_at: i64,
    pub bump: u8,
}

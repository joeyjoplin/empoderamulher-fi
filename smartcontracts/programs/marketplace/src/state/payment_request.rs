use anchor_lang::prelude::*;

use crate::constants::MAX_MEMO_LEN;

/// Lifecycle of a single payment request.
///
///   Pending → Paid       (buyer settles via `pay_request`)
///        ↓
///       Cancelled        (either party calls `cancel_request` while Pending)
///
/// Once Paid or Cancelled the request is terminal — `pay_request` /
/// `cancel_request` reject anything that's not Pending. The PDA itself is
/// kept on-chain (not closed) so the off-chain indexer can reconcile the
/// final state from the `PaymentCompleted` / `PaymentCancelled` events.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq, InitSpace)]
pub enum PaymentStatus {
    Pending,
    Paid,
    Cancelled,
}

/// Coarse business category for impact-dashboard aggregation. Intentionally
/// minimal for the MVP — refine post-hackathon when the marketplace has real
/// usage signal.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq, InitSpace)]
pub enum PaymentCategory {
    Supplies,
    Packaging,
    Services,
    Other,
}

#[account]
#[derive(InitSpace)]
pub struct PaymentRequest {
    pub from: Pubkey,
    pub to: Pubkey,
    pub nonce: u64,
    pub amount: u64,
    pub category: PaymentCategory,
    pub status: PaymentStatus,
    pub created_at: i64,
    /// Unix timestamp set when status transitions to Paid; 0 while Pending or Cancelled.
    pub paid_at: i64,
    /// Unix timestamp set when status transitions to Cancelled; 0 otherwise.
    pub cancelled_at: i64,
    #[max_len(MAX_MEMO_LEN)]
    pub memo: String,
    pub bump: u8,
}

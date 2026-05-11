use anchor_lang::prelude::*;

use crate::state::PaymentCategory;

#[event]
pub struct PaymentRequestCreated {
    pub request: Pubkey,
    pub from: Pubkey,
    pub to: Pubkey,
    pub nonce: u64,
    pub amount: u64,
    pub category: PaymentCategory,
    pub created_at: i64,
}

#[event]
pub struct PaymentCompleted {
    pub request: Pubkey,
    pub from: Pubkey,
    pub to: Pubkey,
    pub amount: u64,
    pub paid_at: i64,
}

#[event]
pub struct PaymentCancelled {
    pub request: Pubkey,
    pub from: Pubkey,
    pub to: Pubkey,
    pub cancelled_by: Pubkey,
    pub cancelled_at: i64,
}

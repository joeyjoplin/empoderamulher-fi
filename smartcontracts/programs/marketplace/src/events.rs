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
    /// `true` when the supplier was paid up-front via the BNPL flow
    /// (`create_bnpl_request → pay_request`). `false` for direct pay.
    /// Additive — old indexers that only read the first 5 fields keep
    /// working; new projection logic in `routes/impact.ts` reads this
    /// flag to bucket BNPL events as `marketplace_bnpl_supplier_paid`
    /// instead of plain `marketplace_payment`.
    pub bnpl: bool,
}

#[event]
pub struct PaymentCancelled {
    pub request: Pubkey,
    pub from: Pubkey,
    pub to: Pubkey,
    pub cancelled_by: Pubkey,
    pub cancelled_at: i64,
}

#[event]
pub struct BnplRequestCreated {
    pub plan: Pubkey,
    pub payment_request: Pubkey,
    pub buyer: Pubkey,
    pub principal_amount: u64,
    pub installment_count: u8,
}

#[event]
pub struct InstallmentPaid {
    pub plan: Pubkey,
    pub installment_index: u8,
    pub paid_installments: u8,
    pub installment_count: u8,
}

#[event]
pub struct BnplPlanCompleted {
    pub plan: Pubkey,
    pub total_repaid: u64,
}

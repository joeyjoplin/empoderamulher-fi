pub mod constants;
pub mod errors;
pub mod events;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("2BVJn1DY6Kzni1rXgc1ysZRNPRyKhmWZpyRYSh8x6ouh");

#[program]
pub mod marketplace {
    use super::*;

    pub fn create_payment_request(
        ctx: Context<CreatePaymentRequest>,
        nonce: u64,
        amount: u64,
        category: PaymentCategory,
        memo: String,
    ) -> Result<()> {
        instructions::create_payment_request::create_payment_request_handler(
            ctx, nonce, amount, category, memo,
        )
    }

    pub fn pay_request(ctx: Context<PayRequest>, nonce: u64) -> Result<()> {
        instructions::pay_request::pay_request_handler(ctx, nonce)
    }

    pub fn cancel_request(ctx: Context<CancelRequest>, nonce: u64) -> Result<()> {
        instructions::cancel_request::cancel_request_handler(ctx, nonce)
    }

    #[allow(clippy::too_many_arguments)]
    pub fn create_bnpl_request(
        ctx: Context<CreateBnplRequest>,
        nonce: u64,
        principal_amount: u64,
        total_repayable: u64,
        installment_count: u8,
        installment_amount: u64,
        first_due_at: i64,
        category: PaymentCategory,
        memo: String,
    ) -> Result<()> {
        instructions::create_bnpl_request::create_bnpl_request_handler(
            ctx,
            nonce,
            principal_amount,
            total_repayable,
            installment_count,
            installment_amount,
            first_due_at,
            category,
            memo,
        )
    }

    pub fn record_installment(
        ctx: Context<RecordInstallment>,
        nonce: u64,
        installment_index: u8,
    ) -> Result<()> {
        instructions::record_installment::record_installment_handler(
            ctx,
            nonce,
            installment_index,
        )
    }
}

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
}

use anchor_lang::prelude::*;

use crate::constants::{MAX_MEMO_LEN, PAYMENT_SEED};
use crate::errors::MarketplaceError;
use crate::events::PaymentRequestCreated;
use crate::state::{PaymentCategory, PaymentRequest, PaymentStatus};

/// The provider (recipient) creates an invoice naming a specific buyer + nonce.
/// The buyer doesn't sign here — they settle later via `pay_request`. The
/// nonce lets the same provider raise multiple distinct invoices against the
/// same buyer without colliding on the PDA seed.
#[derive(Accounts)]
#[instruction(nonce: u64, amount: u64, category: PaymentCategory, memo: String)]
pub struct CreatePaymentRequest<'info> {
    #[account(mut)]
    pub provider: Signer<'info>,

    /// CHECK: only used as a seed input + stored on the request. The buyer
    /// will sign separately when they call `pay_request`.
    pub buyer: UncheckedAccount<'info>,

    /// PDA seeds: [PAYMENT_SEED, buyer, provider, nonce_le_bytes]
    #[account(
        init,
        payer = provider,
        space = 8 + PaymentRequest::INIT_SPACE,
        seeds = [PAYMENT_SEED, buyer.key().as_ref(), provider.key().as_ref(), &nonce.to_le_bytes()],
        bump,
    )]
    pub request: Account<'info, PaymentRequest>,

    pub system_program: Program<'info, System>,
}

pub fn create_payment_request_handler(
    ctx: Context<CreatePaymentRequest>,
    nonce: u64,
    amount: u64,
    category: PaymentCategory,
    memo: String,
) -> Result<()> {
    require!(amount > 0, MarketplaceError::InvalidAmount);
    require!(memo.len() <= MAX_MEMO_LEN, MarketplaceError::MemoTooLong);

    let now = Clock::get()?.unix_timestamp;
    let request = &mut ctx.accounts.request;

    request.from = ctx.accounts.buyer.key();
    request.to = ctx.accounts.provider.key();
    request.nonce = nonce;
    request.amount = amount;
    request.category = category;
    request.status = PaymentStatus::Pending;
    request.created_at = now;
    request.paid_at = 0;
    request.cancelled_at = 0;
    request.memo = memo;
    request.bump = ctx.bumps.request;

    emit!(PaymentRequestCreated {
        request: request.key(),
        from: request.from,
        to: request.to,
        nonce: request.nonce,
        amount: request.amount,
        category: request.category,
        created_at: request.created_at,
    });

    Ok(())
}

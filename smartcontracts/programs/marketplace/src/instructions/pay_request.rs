use anchor_lang::prelude::*;

use crate::constants::PAYMENT_SEED;
use crate::errors::MarketplaceError;
use crate::events::PaymentCompleted;
use crate::state::{PaymentRequest, PaymentStatus};

/// The buyer settles a Pending request. MVP scope: this only RECORDS the
/// settlement on-chain (status flip + `PaymentCompleted` event). The actual
/// fund transfer lives off-chain (Pix in production); the on-chain log is
/// the auditable receipt that feeds the impact dashboard.
///
/// Mirrors `loan_origination::disburse_loan`'s "record-only" pattern — see
/// PLAN_3_WEEKS.md TASK 1.3 for the precedent.
#[derive(Accounts)]
#[instruction(nonce: u64)]
pub struct PayRequest<'info> {
    pub buyer: Signer<'info>,

    /// PDA seeds: [PAYMENT_SEED, buyer, provider, nonce_le_bytes]
    #[account(
        mut,
        seeds = [PAYMENT_SEED, buyer.key().as_ref(), request.to.as_ref(), &nonce.to_le_bytes()],
        bump = request.bump,
        constraint = request.from == buyer.key() @ MarketplaceError::Unauthorized,
        constraint = request.status == PaymentStatus::Pending @ MarketplaceError::InvalidStatus,
    )]
    pub request: Account<'info, PaymentRequest>,
}

pub fn pay_request_handler(ctx: Context<PayRequest>, _nonce: u64) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let request = &mut ctx.accounts.request;

    request.status = PaymentStatus::Paid;
    request.paid_at = now;

    emit!(PaymentCompleted {
        request: request.key(),
        from: request.from,
        to: request.to,
        amount: request.amount,
        paid_at: now,
    });

    Ok(())
}

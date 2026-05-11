use anchor_lang::prelude::*;

use crate::constants::PAYMENT_SEED;
use crate::errors::MarketplaceError;
use crate::events::PaymentCancelled;
use crate::state::{PaymentRequest, PaymentStatus};

/// Either party can cancel while the request is still Pending. After Paid /
/// Cancelled the request is terminal and this instruction errors out.
#[derive(Accounts)]
#[instruction(nonce: u64)]
pub struct CancelRequest<'info> {
    pub canceller: Signer<'info>,

    /// PDA seeds: [PAYMENT_SEED, buyer, provider, nonce_le_bytes]
    ///
    /// Authorisation lives in the `constraint` below — `canceller` must be
    /// either `request.from` (buyer) or `request.to` (provider).
    #[account(
        mut,
        seeds = [PAYMENT_SEED, request.from.as_ref(), request.to.as_ref(), &nonce.to_le_bytes()],
        bump = request.bump,
        constraint = (canceller.key() == request.from || canceller.key() == request.to)
            @ MarketplaceError::Unauthorized,
        constraint = request.status == PaymentStatus::Pending @ MarketplaceError::InvalidStatus,
    )]
    pub request: Account<'info, PaymentRequest>,
}

pub fn cancel_request_handler(
    ctx: Context<CancelRequest>,
    _nonce: u64,
) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let request = &mut ctx.accounts.request;

    request.status = PaymentStatus::Cancelled;
    request.cancelled_at = now;

    emit!(PaymentCancelled {
        request: request.key(),
        from: request.from,
        to: request.to,
        cancelled_by: ctx.accounts.canceller.key(),
        cancelled_at: now,
    });

    Ok(())
}

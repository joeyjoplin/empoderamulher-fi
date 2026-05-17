use anchor_lang::prelude::*;

use crate::constants::{BNPL_SEED, PAYMENT_SEED};
use crate::errors::MarketplaceError;
use crate::events::PaymentCompleted;
use crate::state::{BnplPlan, PaymentRequest, PaymentStatus};

/// The buyer settles a Pending request. MVP scope: this only RECORDS the
/// settlement on-chain (status flip + `PaymentCompleted` event). The actual
/// fund transfer lives off-chain (Pix in production); the on-chain log is
/// the auditable receipt that feeds the impact dashboard.
///
/// Mirrors `loan_origination::disburse_loan`'s "record-only" pattern — see
/// PLAN_3_WEEKS.md TASK 1.3 for the precedent.
///
/// **BNPL flag.** When this request was opened via `create_bnpl_request`, the
/// orchestration calls `pay_request` immediately afterwards to record the
/// supplier-upfront payout. The optional `bnpl_plan` account lets callers
/// signal that — when present, it must be the canonical PDA for this
/// request (constraint validates it) and the emitted `PaymentCompleted`
/// event carries `bnpl: true`. Direct-pay callers omit the account and the
/// flag is `false`. The account is read-only here; ownership of the BNPL
/// lifecycle stays in `create_bnpl_request` / `record_installment`.
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

    /// Optional BNPL plan tied to this request. If supplied, must be the
    /// canonical PDA for `(payment_request, buyer)`; the emitted event will
    /// carry `bnpl: true`. Direct-pay callers pass `None`.
    #[account(
        seeds = [BNPL_SEED, request.key().as_ref(), buyer.key().as_ref()],
        bump = bnpl_plan.bump,
        constraint = bnpl_plan.payment_request == request.key() @ MarketplaceError::Unauthorized,
    )]
    pub bnpl_plan: Option<Account<'info, BnplPlan>>,
}

pub fn pay_request_handler(ctx: Context<PayRequest>, _nonce: u64) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let request = &mut ctx.accounts.request;
    let is_bnpl = ctx.accounts.bnpl_plan.is_some();

    request.status = PaymentStatus::Paid;
    request.paid_at = now;

    emit!(PaymentCompleted {
        request: request.key(),
        from: request.from,
        to: request.to,
        amount: request.amount,
        paid_at: now,
        bnpl: is_bnpl,
    });

    Ok(())
}

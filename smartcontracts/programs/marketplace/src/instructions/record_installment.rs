use anchor_lang::prelude::*;

use crate::constants::{BNPL_SEED, PAYMENT_SEED};
use crate::errors::MarketplaceError;
use crate::events::{BnplPlanCompleted, InstallmentPaid};
use crate::state::{BnplPlan, BnplStatus, PaymentRequest};

/// Buyer signs to record one installment paid. Increments
/// `BnplPlan.paid_installments`; when the increment lands on
/// `installment_count`, flips the plan to `Completed` and emits
/// `BnplPlanCompleted`.
///
/// MVP scope: this is **record-only** — the actual fiat installment
/// collection happens off-chain (Pix in production). On-chain we just log
/// the receipt so the indexer + impact dashboard can show the buyer's
/// repayment progress as auditable on-chain history.
///
/// **Strict ordering.** `installment_index` must equal the current
/// `paid_installments` (i.e. installments are recorded 0, 1, 2, ... in
/// order). This catches client-side bugs that would otherwise silently
/// mis-record a sequence.
#[derive(Accounts)]
#[instruction(nonce: u64, installment_index: u8)]
pub struct RecordInstallment<'info> {
    pub buyer: Signer<'info>,

    /// PDA seeds: [PAYMENT_SEED, buyer, provider, nonce_le_bytes]. We bind
    /// it via the seeds rather than passing `provider` separately so a
    /// caller can't trick us into pairing a plan with the wrong request.
    #[account(
        seeds = [PAYMENT_SEED, buyer.key().as_ref(), request.to.as_ref(), &nonce.to_le_bytes()],
        bump = request.bump,
        constraint = request.from == buyer.key() @ MarketplaceError::Unauthorized,
    )]
    pub request: Account<'info, PaymentRequest>,

    /// PDA seeds: [BNPL_SEED, payment_request, buyer]
    #[account(
        mut,
        seeds = [BNPL_SEED, request.key().as_ref(), buyer.key().as_ref()],
        bump = plan.bump,
        constraint = plan.buyer == buyer.key() @ MarketplaceError::Unauthorized,
        constraint = plan.payment_request == request.key() @ MarketplaceError::Unauthorized,
    )]
    pub plan: Account<'info, BnplPlan>,
}

pub fn record_installment_handler(
    ctx: Context<RecordInstallment>,
    _nonce: u64,
    installment_index: u8,
) -> Result<()> {
    let plan = &mut ctx.accounts.plan;

    require!(
        plan.status == BnplStatus::Active,
        MarketplaceError::BnplAlreadyComplete,
    );
    require!(
        plan.paid_installments < plan.installment_count,
        MarketplaceError::BnplAlreadyComplete,
    );
    require!(
        installment_index == plan.paid_installments,
        MarketplaceError::InvalidInstallmentOrder,
    );

    plan.paid_installments = plan
        .paid_installments
        .checked_add(1)
        .ok_or(MarketplaceError::BnplAlreadyComplete)?;

    emit!(InstallmentPaid {
        plan: plan.key(),
        installment_index,
        paid_installments: plan.paid_installments,
        installment_count: plan.installment_count,
    });

    if plan.paid_installments == plan.installment_count {
        plan.status = BnplStatus::Completed;
        emit!(BnplPlanCompleted {
            plan: plan.key(),
            total_repaid: plan.total_repayable,
        });
    }

    Ok(())
}

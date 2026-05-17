use anchor_lang::prelude::*;

use crate::constants::{BNPL_SEED, MAX_INSTALLMENTS, MAX_MEMO_LEN, PAYMENT_SEED};
use crate::errors::MarketplaceError;
use crate::events::{BnplRequestCreated, PaymentRequestCreated};
use crate::state::{
    BnplPlan, BnplStatus, PaymentCategory, PaymentRequest, PaymentStatus,
};

/// Buyer-initiated: opens a BNPL plan against a brand-new `PaymentRequest`
/// and the matching `BnplPlan` in a single tx. The orchestration layer is
/// expected to follow up with `pay_request` immediately to record the
/// supplier-upfront payout — but on-chain the two steps are separate so the
/// existing `pay_request` flow stays unchanged.
///
/// **Why buyer signs here, not provider.** Direct-pay (`create_payment_request`)
/// is provider-initiated because the supplier opens the invoice first. BNPL
/// is buyer-initiated because the buyer is the one electing to pay over
/// time and committing to the schedule. The supplier still receives the
/// upfront amount via `pay_request` in the same orchestration; they don't
/// need to sign for either step.
///
/// **Pricing lives off-chain.** `total_repayable` and `installment_amount`
/// are computed by the backend's `bnpl_pricing.ts` based on the buyer's
/// score tier. The program just records the values; it does not derive
/// interest. This keeps tier-policy changes a backend-only concern (no
/// program upgrade needed when rates change).
#[derive(Accounts)]
#[instruction(
    nonce: u64,
    principal_amount: u64,
    total_repayable: u64,
    installment_count: u8,
    installment_amount: u64,
    first_due_at: i64,
    category: PaymentCategory,
    memo: String,
)]
pub struct CreateBnplRequest<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,

    /// CHECK: pubkey-only — used as a seed input + stored on the request.
    /// The supplier doesn't sign here; the supplier is paid via the
    /// follow-up `pay_request` call (which the buyer also signs because
    /// they're settling against their own request).
    pub provider: UncheckedAccount<'info>,

    /// PDA seeds: [PAYMENT_SEED, buyer, provider, nonce_le_bytes]
    #[account(
        init,
        payer = buyer,
        space = 8 + PaymentRequest::INIT_SPACE,
        seeds = [PAYMENT_SEED, buyer.key().as_ref(), provider.key().as_ref(), &nonce.to_le_bytes()],
        bump,
    )]
    pub request: Account<'info, PaymentRequest>,

    /// PDA seeds: [BNPL_SEED, payment_request, buyer]
    #[account(
        init,
        payer = buyer,
        space = 8 + BnplPlan::INIT_SPACE,
        seeds = [BNPL_SEED, request.key().as_ref(), buyer.key().as_ref()],
        bump,
    )]
    pub plan: Account<'info, BnplPlan>,

    pub system_program: Program<'info, System>,
}

#[allow(clippy::too_many_arguments)]
pub fn create_bnpl_request_handler(
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
    require!(principal_amount > 0, MarketplaceError::InvalidAmount);
    require!(installment_amount > 0, MarketplaceError::InvalidAmount);
    require!(memo.len() <= MAX_MEMO_LEN, MarketplaceError::MemoTooLong);
    require!(
        installment_count >= 1 && installment_count <= MAX_INSTALLMENTS,
        MarketplaceError::BnplInstallmentCountOutOfRange,
    );

    let now = Clock::get()?.unix_timestamp;
    require!(first_due_at > now, MarketplaceError::BnplFirstDueInPast);

    let request = &mut ctx.accounts.request;
    request.from = ctx.accounts.buyer.key();
    request.to = ctx.accounts.provider.key();
    request.nonce = nonce;
    request.amount = principal_amount;
    request.category = category;
    request.status = PaymentStatus::Pending;
    request.created_at = now;
    request.paid_at = 0;
    request.cancelled_at = 0;
    request.memo = memo;
    request.bump = ctx.bumps.request;

    let plan = &mut ctx.accounts.plan;
    plan.payment_request = request.key();
    plan.buyer = ctx.accounts.buyer.key();
    plan.principal_amount = principal_amount;
    plan.total_repayable = total_repayable;
    plan.installment_count = installment_count;
    plan.installment_amount = installment_amount;
    plan.paid_installments = 0;
    plan.first_due_at = first_due_at;
    plan.status = BnplStatus::Active;
    plan.created_at = now;
    plan.bump = ctx.bumps.plan;

    emit!(PaymentRequestCreated {
        request: request.key(),
        from: request.from,
        to: request.to,
        nonce: request.nonce,
        amount: request.amount,
        category: request.category,
        created_at: request.created_at,
    });

    emit!(BnplRequestCreated {
        plan: plan.key(),
        payment_request: request.key(),
        buyer: plan.buyer,
        principal_amount: plan.principal_amount,
        installment_count: plan.installment_count,
    });

    Ok(())
}

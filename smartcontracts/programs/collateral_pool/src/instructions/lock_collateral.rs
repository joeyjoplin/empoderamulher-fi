use anchor_lang::prelude::*;

use crate::constants::{LOCK_SEED, POOL_SEED};
use crate::errors::CollateralPoolError;
use crate::events::CollateralLocked;
use crate::state::{LockRecord, PoolState};

#[derive(Accounts)]
#[instruction(loan_id: u64, amount: u64)]
pub struct LockCollateral<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    /// PDA seeds: [POOL_SEED]
    #[account(
        mut,
        seeds = [POOL_SEED],
        bump = pool_state.bump,
        constraint = pool_state.authority == authority.key() @ CollateralPoolError::Unauthorized,
    )]
    pub pool_state: Account<'info, PoolState>,

    /// PDA seeds: [LOCK_SEED, loan_id.to_le_bytes()]
    #[account(
        init,
        payer = authority,
        space = 8 + LockRecord::INIT_SPACE,
        seeds = [LOCK_SEED, &loan_id.to_le_bytes()],
        bump,
    )]
    pub lock_record: Account<'info, LockRecord>,

    pub system_program: Program<'info, System>,
}

pub fn lock_collateral_handler(
    ctx: Context<LockCollateral>,
    loan_id: u64,
    amount: u64,
) -> Result<()> {
    let pool_state = &mut ctx.accounts.pool_state;

    let available = pool_state
        .total_deposited
        .checked_sub(pool_state.total_locked)
        .ok_or(CollateralPoolError::MathOverflow)?;
    require!(
        amount <= available,
        CollateralPoolError::InsufficientAvailableCollateral
    );

    pool_state.total_locked = pool_state
        .total_locked
        .checked_add(amount)
        .ok_or(CollateralPoolError::MathOverflow)?;

    let lock_record = &mut ctx.accounts.lock_record;
    lock_record.loan_id = loan_id;
    lock_record.amount = amount;
    lock_record.bump = ctx.bumps.lock_record;

    emit!(CollateralLocked {
        loan_id,
        amount,
        total_locked: pool_state.total_locked,
    });

    Ok(())
}

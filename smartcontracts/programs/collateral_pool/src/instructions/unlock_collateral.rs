use anchor_lang::prelude::*;

use crate::constants::{LOCK_SEED, POOL_SEED};
use crate::errors::CollateralPoolError;
use crate::events::CollateralUnlocked;
use crate::state::{LockRecord, PoolState};

#[derive(Accounts)]
#[instruction(loan_id: u64)]
pub struct UnlockCollateral<'info> {
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
        mut,
        seeds = [LOCK_SEED, &loan_id.to_le_bytes()],
        bump = lock_record.bump,
        close = authority,
    )]
    pub lock_record: Account<'info, LockRecord>,
}

pub fn unlock_collateral_handler(
    ctx: Context<UnlockCollateral>,
    loan_id: u64,
) -> Result<()> {
    let amount = ctx.accounts.lock_record.amount;
    let pool_state = &mut ctx.accounts.pool_state;

    pool_state.total_locked = pool_state
        .total_locked
        .checked_sub(amount)
        .ok_or(CollateralPoolError::MathOverflow)?;

    emit!(CollateralUnlocked {
        loan_id,
        amount,
        total_locked: pool_state.total_locked,
    });

    Ok(())
}

use anchor_lang::prelude::*;
use anchor_spl::token_interface::{
    transfer_checked, Mint, Token2022, TokenAccount, TransferChecked,
};

use crate::constants::POOL_SEED;
use crate::errors::CollateralPoolError;
use crate::events::PoolDeposited;
use crate::state::PoolState;

#[derive(Accounts)]
pub struct DepositPool<'info> {
    pub depositor: Signer<'info>,

    /// PDA seeds: [POOL_SEED]
    #[account(
        mut,
        seeds = [POOL_SEED],
        bump = pool_state.bump,
        has_one = mint,
        has_one = vault,
    )]
    pub pool_state: Account<'info, PoolState>,

    pub mint: InterfaceAccount<'info, Mint>,

    #[account(mut)]
    pub vault: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        token::mint = mint,
        token::authority = depositor,
        token::token_program = token_program,
    )]
    pub depositor_ata: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Program<'info, Token2022>,
}

pub fn deposit_handler(ctx: Context<DepositPool>, amount: u64) -> Result<()> {
    let cpi_ctx = CpiContext::new(
        ctx.accounts.token_program.key(),
        TransferChecked {
            from: ctx.accounts.depositor_ata.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.vault.to_account_info(),
            authority: ctx.accounts.depositor.to_account_info(),
        },
    );
    transfer_checked(cpi_ctx, amount, ctx.accounts.mint.decimals)?;

    let pool_state = &mut ctx.accounts.pool_state;
    pool_state.total_deposited = pool_state
        .total_deposited
        .checked_add(amount)
        .ok_or(CollateralPoolError::MathOverflow)?;

    emit!(PoolDeposited {
        depositor: ctx.accounts.depositor.key(),
        amount,
        total_deposited: pool_state.total_deposited,
    });

    Ok(())
}

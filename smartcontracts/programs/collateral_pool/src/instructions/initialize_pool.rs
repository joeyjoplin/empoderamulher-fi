use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, Token2022, TokenAccount};

use crate::constants::{POOL_SEED, POOL_VAULT_SEED};
use crate::events::PoolInitialized;
use crate::state::PoolState;

#[derive(Accounts)]
pub struct InitializePool<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    /// PDA seeds: [POOL_SEED]
    #[account(
        init,
        payer = authority,
        space = 8 + PoolState::INIT_SPACE,
        seeds = [POOL_SEED],
        bump,
    )]
    pub pool_state: Account<'info, PoolState>,

    pub mint: InterfaceAccount<'info, Mint>,

    /// PDA seeds: [POOL_VAULT_SEED] — Token-2022 account owned by pool_state
    #[account(
        init,
        payer = authority,
        seeds = [POOL_VAULT_SEED],
        bump,
        token::mint = mint,
        token::authority = pool_state,
        token::token_program = token_program,
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Program<'info, Token2022>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn initialize_pool_handler(ctx: Context<InitializePool>) -> Result<()> {
    let pool_state = &mut ctx.accounts.pool_state;
    pool_state.authority = ctx.accounts.authority.key();
    pool_state.mint = ctx.accounts.mint.key();
    pool_state.vault = ctx.accounts.vault.key();
    pool_state.total_deposited = 0;
    pool_state.total_locked = 0;
    pool_state.bump = ctx.bumps.pool_state;
    pool_state.vault_bump = ctx.bumps.vault;

    emit!(PoolInitialized {
        authority: pool_state.authority,
        mint: pool_state.mint,
        vault: pool_state.vault,
    });

    Ok(())
}

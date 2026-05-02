use anchor_lang::prelude::*;
use anchor_spl::token_interface::{burn, Burn, Mint, Token2022, TokenAccount};

use crate::constants::TOKEN_CONFIG_SEED;
use crate::errors::RwaTokenError;
use crate::events::RwaTokenBurned;
use crate::state::TokenConfig;

#[derive(Accounts)]
pub struct BurnRwa<'info> {
    pub owner: Signer<'info>,

    /// PDA seeds: [TOKEN_CONFIG_SEED]
    #[account(
        mut,
        seeds = [TOKEN_CONFIG_SEED],
        bump = token_config.bump,
        has_one = mint,
    )]
    pub token_config: Account<'info, TokenConfig>,

    #[account(mut)]
    pub mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        token::mint = mint,
        token::authority = owner,
        token::token_program = token_program,
    )]
    pub from_ata: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Program<'info, Token2022>,
}

pub fn burn_rwa_handler(ctx: Context<BurnRwa>, amount: u64) -> Result<()> {
    let cpi_ctx = CpiContext::new(
        ctx.accounts.token_program.key(),
        Burn {
            mint: ctx.accounts.mint.to_account_info(),
            from: ctx.accounts.from_ata.to_account_info(),
            authority: ctx.accounts.owner.to_account_info(),
        },
    );
    burn(cpi_ctx, amount)?;

    let token_config = &mut ctx.accounts.token_config;
    token_config.total_supply = token_config
        .total_supply
        .checked_sub(amount)
        .ok_or(RwaTokenError::MathOverflow)?;

    emit!(RwaTokenBurned {
        from: ctx.accounts.from_ata.key(),
        amount,
    });

    Ok(())
}

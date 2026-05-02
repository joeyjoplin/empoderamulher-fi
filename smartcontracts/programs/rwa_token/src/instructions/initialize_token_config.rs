use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, Token2022};

use crate::constants::TOKEN_CONFIG_SEED;
use crate::events::TokenConfigInitialized;
use crate::state::TokenConfig;

#[derive(Accounts)]
#[instruction(decimals: u8)]
pub struct InitializeTokenConfig<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    /// PDA seeds: [TOKEN_CONFIG_SEED]
    #[account(
        init,
        payer = authority,
        space = 8 + TokenConfig::INIT_SPACE,
        seeds = [TOKEN_CONFIG_SEED],
        bump,
    )]
    pub token_config: Account<'info, TokenConfig>,

    /// Token-2022 Mint with the TokenConfig PDA as mint and freeze authority.
    #[account(
        init,
        payer = authority,
        mint::decimals = decimals,
        mint::authority = token_config,
        mint::freeze_authority = token_config,
        mint::token_program = token_program,
    )]
    pub mint: InterfaceAccount<'info, Mint>,

    pub token_program: Program<'info, Token2022>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn initialize_token_config_handler(
    ctx: Context<InitializeTokenConfig>,
    decimals: u8,
) -> Result<()> {
    let token_config = &mut ctx.accounts.token_config;
    token_config.authority = ctx.accounts.authority.key();
    token_config.mint = ctx.accounts.mint.key();
    token_config.total_supply = 0;
    token_config.decimals = decimals;
    token_config.bump = ctx.bumps.token_config;

    emit!(TokenConfigInitialized {
        authority: token_config.authority,
        mint: token_config.mint,
        decimals,
    });

    Ok(())
}

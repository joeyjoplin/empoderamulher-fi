use anchor_lang::prelude::*;
use anchor_spl::token_interface::{
    mint_to, Mint, MintTo, Token2022, TokenAccount,
};

use crate::constants::TOKEN_CONFIG_SEED;
use crate::errors::RwaTokenError;
use crate::events::RwaTokenMinted;
use crate::state::TokenConfig;

#[derive(Accounts)]
pub struct MintRwa<'info> {
    pub authority: Signer<'info>,

    /// PDA seeds: [TOKEN_CONFIG_SEED]
    #[account(
        mut,
        seeds = [TOKEN_CONFIG_SEED],
        bump = token_config.bump,
        has_one = mint,
        constraint = token_config.authority == authority.key() @ RwaTokenError::Unauthorized,
    )]
    pub token_config: Account<'info, TokenConfig>,

    #[account(mut)]
    pub mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        token::mint = mint,
        token::token_program = token_program,
    )]
    pub recipient_ata: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Program<'info, Token2022>,
}

pub fn mint_rwa_handler(ctx: Context<MintRwa>, amount: u64) -> Result<()> {
    let token_config = &mut ctx.accounts.token_config;
    let bump = token_config.bump;
    let signer_seeds: &[&[&[u8]]] = &[&[TOKEN_CONFIG_SEED, &[bump]]];

    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.key(),
        MintTo {
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.recipient_ata.to_account_info(),
            authority: token_config.to_account_info(),
        },
        signer_seeds,
    );
    mint_to(cpi_ctx, amount)?;

    token_config.total_supply = token_config
        .total_supply
        .checked_add(amount)
        .ok_or(RwaTokenError::MathOverflow)?;

    emit!(RwaTokenMinted {
        recipient: ctx.accounts.recipient_ata.key(),
        amount,
    });

    Ok(())
}

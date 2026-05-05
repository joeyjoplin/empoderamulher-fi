use anchor_lang::prelude::*;

use crate::constants::SCORE_CONFIG_SEED;
use crate::events::ScoreConfigInitialized;
use crate::state::ScoreConfig;

#[derive(Accounts)]
pub struct InitializeScoreConfig<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    /// PDA seeds: [SCORE_CONFIG_SEED]
    #[account(
        init,
        payer = authority,
        space = 8 + ScoreConfig::INIT_SPACE,
        seeds = [SCORE_CONFIG_SEED],
        bump,
    )]
    pub config: Account<'info, ScoreConfig>,

    pub system_program: Program<'info, System>,
}

pub fn initialize_score_config_handler(
    ctx: Context<InitializeScoreConfig>,
    attestor: Pubkey,
) -> Result<()> {
    let config = &mut ctx.accounts.config;
    config.authority = ctx.accounts.authority.key();
    config.attestor = attestor;
    config.bump = ctx.bumps.config;

    emit!(ScoreConfigInitialized {
        authority: config.authority,
        attestor: config.attestor,
    });

    Ok(())
}

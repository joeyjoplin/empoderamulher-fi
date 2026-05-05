use anchor_lang::prelude::*;

use crate::constants::{SCORE_CONFIG_SEED, SCORE_SEED};
use crate::errors::ScoreError;
use crate::events::ScoreRevoked;
use crate::state::{Score, ScoreConfig};

#[derive(Accounts)]
#[instruction(cnpj_hmac: [u8; 32])]
pub struct RevokeScore<'info> {
    pub attestor: Signer<'info>,

    /// PDA seeds: [SCORE_CONFIG_SEED]
    #[account(
        seeds = [SCORE_CONFIG_SEED],
        bump = config.bump,
        constraint = config.attestor == attestor.key() @ ScoreError::Unauthorized,
    )]
    pub config: Account<'info, ScoreConfig>,

    /// PDA seeds: [SCORE_SEED, cnpj_hmac]
    #[account(
        mut,
        seeds = [SCORE_SEED, cnpj_hmac.as_ref()],
        bump = score.bump,
        close = recipient,
    )]
    pub score: Account<'info, Score>,

    /// CHECK: rent recipient when closing the score account
    #[account(mut)]
    pub recipient: UncheckedAccount<'info>,
}

pub fn revoke_score_handler(
    ctx: Context<RevokeScore>,
    cnpj_hmac: [u8; 32],
) -> Result<()> {
    emit!(ScoreRevoked {
        cnpj_hmac,
        attestor: ctx.accounts.attestor.key(),
    });

    Ok(())
}

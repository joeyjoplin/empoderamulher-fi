use anchor_lang::prelude::*;

use crate::constants::{MAX_SCORE_VALUE, SCORE_CONFIG_SEED, SCORE_SEED};
use crate::errors::ScoreError;
use crate::events::ScoreAttested;
use crate::state::{Score, ScoreBreakdown, ScoreConfig};

#[derive(Accounts)]
#[instruction(cnpj_hmac: [u8; 32])]
pub struct AttestScore<'info> {
    #[account(mut)]
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
        init_if_needed,
        payer = attestor,
        space = 8 + Score::INIT_SPACE,
        seeds = [SCORE_SEED, cnpj_hmac.as_ref()],
        bump,
    )]
    pub score: Account<'info, Score>,

    pub system_program: Program<'info, System>,
}

pub fn attest_score_handler(
    ctx: Context<AttestScore>,
    cnpj_hmac: [u8; 32],
    total: u16,
    breakdown: ScoreBreakdown,
) -> Result<()> {
    require!(total <= MAX_SCORE_VALUE, ScoreError::ScoreOutOfRange);
    require!(
        breakdown.discipline <= MAX_SCORE_VALUE,
        ScoreError::ScoreOutOfRange
    );
    require!(
        breakdown.organization <= MAX_SCORE_VALUE,
        ScoreError::ScoreOutOfRange
    );
    require!(
        breakdown.cash_flow <= MAX_SCORE_VALUE,
        ScoreError::ScoreOutOfRange
    );
    require!(
        breakdown.engagement <= MAX_SCORE_VALUE,
        ScoreError::ScoreOutOfRange
    );

    let now = Clock::get()?.unix_timestamp;
    let score = &mut ctx.accounts.score;

    score.cnpj_hmac = cnpj_hmac;
    score.total_score = total;
    score.discipline_score = breakdown.discipline;
    score.organization_score = breakdown.organization;
    score.cash_flow_score = breakdown.cash_flow;
    score.engagement_score = breakdown.engagement;
    score.last_updated_at = now;
    score.attestor = ctx.accounts.attestor.key();
    score.bump = ctx.bumps.score;

    emit!(ScoreAttested {
        cnpj_hmac,
        total_score: total,
        attestor: score.attestor,
        last_updated_at: now,
    });

    Ok(())
}

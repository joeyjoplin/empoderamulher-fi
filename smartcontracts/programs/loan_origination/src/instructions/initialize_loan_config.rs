use anchor_lang::prelude::*;

use crate::constants::LOAN_CONFIG_SEED;
use crate::events::LoanConfigInitialized;
use crate::state::LoanConfig;

#[derive(Accounts)]
pub struct InitializeLoanConfig<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    /// PDA seeds: [LOAN_CONFIG_SEED]
    #[account(
        init,
        payer = authority,
        space = 8 + LoanConfig::INIT_SPACE,
        seeds = [LOAN_CONFIG_SEED],
        bump,
    )]
    pub loan_config: Account<'info, LoanConfig>,

    pub system_program: Program<'info, System>,
}

pub fn initialize_loan_config_handler(ctx: Context<InitializeLoanConfig>) -> Result<()> {
    let cfg = &mut ctx.accounts.loan_config;
    cfg.authority = ctx.accounts.authority.key();
    cfg.bump = ctx.bumps.loan_config;

    emit!(LoanConfigInitialized {
        authority: cfg.authority,
    });

    Ok(())
}

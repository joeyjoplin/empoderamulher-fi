use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct LoanConfig {
    pub authority: Pubkey,
    pub bump: u8,
}

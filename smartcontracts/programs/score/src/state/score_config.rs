use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct ScoreConfig {
    pub authority: Pubkey,
    pub attestor: Pubkey,
    pub bump: u8,
}

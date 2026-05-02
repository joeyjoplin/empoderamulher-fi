use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct PoolState {
    pub authority: Pubkey,
    pub mint: Pubkey,
    pub vault: Pubkey,
    pub total_deposited: u64,
    pub total_locked: u64,
    pub bump: u8,
    pub vault_bump: u8,
}

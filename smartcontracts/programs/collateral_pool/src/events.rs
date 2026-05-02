use anchor_lang::prelude::*;

#[event]
pub struct PoolInitialized {
    pub authority: Pubkey,
    pub mint: Pubkey,
    pub vault: Pubkey,
}

#[event]
pub struct PoolDeposited {
    pub depositor: Pubkey,
    pub amount: u64,
    pub total_deposited: u64,
}

#[event]
pub struct CollateralLocked {
    pub loan_id: u64,
    pub amount: u64,
    pub total_locked: u64,
}

#[event]
pub struct CollateralUnlocked {
    pub loan_id: u64,
    pub amount: u64,
    pub total_locked: u64,
}

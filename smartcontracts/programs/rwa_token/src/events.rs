use anchor_lang::prelude::*;

#[event]
pub struct TokenConfigInitialized {
    pub authority: Pubkey,
    pub mint: Pubkey,
    pub decimals: u8,
}

#[event]
pub struct RwaTokenMinted {
    pub recipient: Pubkey,
    pub amount: u64,
}

#[event]
pub struct RwaTokenBurned {
    pub from: Pubkey,
    pub amount: u64,
}

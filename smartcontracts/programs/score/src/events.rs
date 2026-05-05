use anchor_lang::prelude::*;

#[event]
pub struct ScoreConfigInitialized {
    pub authority: Pubkey,
    pub attestor: Pubkey,
}

#[event]
pub struct ScoreAttested {
    pub cnpj_hmac: [u8; 32],
    pub total_score: u16,
    pub attestor: Pubkey,
    pub last_updated_at: i64,
}

#[event]
pub struct ScoreRevoked {
    pub cnpj_hmac: [u8; 32],
    pub attestor: Pubkey,
}

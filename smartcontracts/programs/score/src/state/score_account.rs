use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Score {
    pub cnpj_hmac: [u8; 32],
    pub total_score: u16,
    pub discipline_score: u16,
    pub organization_score: u16,
    pub cash_flow_score: u16,
    pub engagement_score: u16,
    pub last_updated_at: i64,
    pub attestor: Pubkey,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug)]
pub struct ScoreBreakdown {
    pub discipline: u16,
    pub organization: u16,
    pub cash_flow: u16,
    pub engagement: u16,
}

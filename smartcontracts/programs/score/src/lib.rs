pub mod constants;
pub mod errors;
pub mod events;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("HiFPcEVC89FHAYTRS5gHMDRGCS8YBMpKrTTcXVqLKP5d");

#[program]
pub mod score {
    use super::*;

    pub fn initialize_score_config(
        ctx: Context<InitializeScoreConfig>,
        attestor: Pubkey,
    ) -> Result<()> {
        instructions::initialize_score_config::initialize_score_config_handler(ctx, attestor)
    }

    pub fn attest_score(
        ctx: Context<AttestScore>,
        cnpj_hmac: [u8; 32],
        total: u16,
        breakdown: ScoreBreakdown,
    ) -> Result<()> {
        instructions::attest_score::attest_score_handler(ctx, cnpj_hmac, total, breakdown)
    }

    pub fn revoke_score(ctx: Context<RevokeScore>, cnpj_hmac: [u8; 32]) -> Result<()> {
        instructions::revoke_score::revoke_score_handler(ctx, cnpj_hmac)
    }
}

use anchor_lang::prelude::*;

#[error_code]
pub enum ScoreError {
    #[msg("Signer is not the configured attestor")]
    Unauthorized,
    #[msg("Score value exceeds the allowed maximum (1000)")]
    ScoreOutOfRange,
}

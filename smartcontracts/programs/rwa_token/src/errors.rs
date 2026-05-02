use anchor_lang::prelude::*;

#[error_code]
pub enum RwaTokenError {
    #[msg("Signer is not the configured authority")]
    Unauthorized,
    #[msg("Arithmetic overflow")]
    MathOverflow,
}

use anchor_lang::prelude::*;

#[error_code]
pub enum CollateralPoolError {
    #[msg("Signer is not the configured pool authority")]
    Unauthorized,
    #[msg("Requested lock exceeds the available (unlocked) collateral")]
    InsufficientAvailableCollateral,
    #[msg("Arithmetic overflow")]
    MathOverflow,
}

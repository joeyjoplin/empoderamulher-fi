use anchor_lang::prelude::*;

#[error_code]
pub enum LoanError {
    #[msg("Signer is not the configured authority")]
    Unauthorized,
    #[msg("Loan is not in the expected status for this operation")]
    InvalidStatus,
    #[msg("Repayment amount exceeds the remaining balance")]
    AmountExceedsRemaining,
    #[msg("Term in months must be greater than zero")]
    InvalidTerm,
    #[msg("Arithmetic overflow")]
    MathOverflow,
}

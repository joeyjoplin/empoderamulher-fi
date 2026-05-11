use anchor_lang::prelude::*;

#[error_code]
pub enum MarketplaceError {
    #[msg("Payment request is not in the expected status for this operation")]
    InvalidStatus,
    #[msg("Signer is neither the buyer nor the provider on this request")]
    Unauthorized,
    #[msg("Memo exceeds the maximum allowed length (200 bytes)")]
    MemoTooLong,
    #[msg("Amount must be greater than zero")]
    InvalidAmount,
}

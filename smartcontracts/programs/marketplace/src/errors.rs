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
    #[msg("BNPL plan is already complete; no further installments accepted")]
    BnplAlreadyComplete,
    #[msg("Installment index does not match the next expected installment for this plan")]
    InvalidInstallmentOrder,
    #[msg("Installment count must be between 1 and the program's MAX_INSTALLMENTS")]
    BnplInstallmentCountOutOfRange,
    #[msg("First installment due date must be in the future")]
    BnplFirstDueInPast,
}

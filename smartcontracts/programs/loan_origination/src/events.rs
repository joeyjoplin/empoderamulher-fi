use anchor_lang::prelude::*;

#[event]
pub struct LoanConfigInitialized {
    pub authority: Pubkey,
}

#[event]
pub struct LoanRequested {
    pub borrower: Pubkey,
    pub loan_id: u64,
    pub amount: u64,
    pub total_due: u64,
    pub term_months: u8,
    pub interest_rate_bps: u16,
}

#[event]
pub struct LoanApproved {
    pub loan_id: u64,
    pub borrower: Pubkey,
}

#[event]
pub struct LoanDisbursed {
    pub loan_id: u64,
    pub borrower: Pubkey,
    pub disbursed_at: i64,
}

#[event]
pub struct InstallmentRepaid {
    pub loan_id: u64,
    pub borrower: Pubkey,
    pub amount: u64,
    pub total_repaid: u64,
    pub installments_paid: u8,
}

#[event]
pub struct LoanClosed {
    pub loan_id: u64,
    pub borrower: Pubkey,
}

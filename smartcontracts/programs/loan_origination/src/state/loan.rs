use anchor_lang::prelude::*;

// Loan lifecycle state diagram:
//
//   Pending ──approve_loan──▶ Approved ──disburse_loan──▶ Disbursed
//                                                            │
//                                       repay_installment ◀──┘
//                                              │
//                                              ▼
//                                       (total_repaid == total_due)
//                                              │
//                                              ▼
//                                          Repaid ──close_loan──▶ Closed
//
// Transitions outside the arrows above are invalid and return InvalidStatus.

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace, Debug)]
pub enum LoanStatus {
    Pending,
    Approved,
    Disbursed,
    Repaid,
    Closed,
}

#[account]
#[derive(InitSpace)]
pub struct Loan {
    pub borrower: Pubkey,
    pub loan_id: u64,
    pub amount: u64,
    pub total_due: u64,
    pub total_repaid: u64,
    pub interest_rate_bps: u16,
    pub term_months: u8,
    pub status: LoanStatus,
    pub disbursed_at: i64,
    pub bump: u8,
}

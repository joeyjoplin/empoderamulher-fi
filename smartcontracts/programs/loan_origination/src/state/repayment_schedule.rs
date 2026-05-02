use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct RepaymentSchedule {
    pub borrower: Pubkey,
    pub loan_id: u64,
    pub installment_count: u8,
    pub installments_paid: u8,
    pub installment_amount: u64,
    pub bump: u8,
}

use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct LockRecord {
    pub loan_id: u64,
    pub amount: u64,
    pub bump: u8,
}

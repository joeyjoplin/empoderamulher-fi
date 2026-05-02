use anchor_lang::prelude::*;

use crate::constants::{LOAN_SEED, SCHEDULE_SEED};
use crate::errors::LoanError;
use crate::events::InstallmentRepaid;
use crate::state::{Loan, LoanStatus, RepaymentSchedule};

#[derive(Accounts)]
#[instruction(loan_id: u64)]
pub struct RepayInstallment<'info> {
    pub borrower: Signer<'info>,

    #[account(
        mut,
        seeds = [LOAN_SEED, borrower.key().as_ref(), &loan_id.to_le_bytes()],
        bump = loan.bump,
        has_one = borrower,
    )]
    pub loan: Account<'info, Loan>,

    #[account(
        mut,
        seeds = [SCHEDULE_SEED, borrower.key().as_ref(), &loan_id.to_le_bytes()],
        bump = repayment_schedule.bump,
        has_one = borrower,
    )]
    pub repayment_schedule: Account<'info, RepaymentSchedule>,
}

pub fn repay_installment_handler(
    ctx: Context<RepayInstallment>,
    _loan_id: u64,
    amount: u64,
) -> Result<()> {
    let loan = &mut ctx.accounts.loan;
    require!(
        loan.status == LoanStatus::Disbursed,
        LoanError::InvalidStatus
    );

    let remaining = loan
        .total_due
        .checked_sub(loan.total_repaid)
        .ok_or(LoanError::MathOverflow)?;
    require!(amount <= remaining, LoanError::AmountExceedsRemaining);

    loan.total_repaid = loan
        .total_repaid
        .checked_add(amount)
        .ok_or(LoanError::MathOverflow)?;

    let schedule = &mut ctx.accounts.repayment_schedule;
    schedule.installments_paid = schedule
        .installments_paid
        .checked_add(1)
        .ok_or(LoanError::MathOverflow)?;

    if loan.total_repaid == loan.total_due {
        loan.status = LoanStatus::Repaid;
    }

    emit!(InstallmentRepaid {
        loan_id: loan.loan_id,
        borrower: loan.borrower,
        amount,
        total_repaid: loan.total_repaid,
        installments_paid: schedule.installments_paid,
    });

    Ok(())
}

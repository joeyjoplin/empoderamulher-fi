use anchor_lang::prelude::*;

use crate::constants::{BPS_DENOMINATOR, LOAN_CONFIG_SEED, LOAN_SEED, SCHEDULE_SEED};
use crate::errors::LoanError;
use crate::events::LoanRequested;
use crate::state::{Loan, LoanConfig, LoanStatus, RepaymentSchedule};

#[derive(Accounts)]
#[instruction(loan_id: u64, amount: u64, term_months: u8, interest_rate_bps: u16)]
pub struct RequestLoan<'info> {
    #[account(mut)]
    pub borrower: Signer<'info>,

    #[account(
        seeds = [LOAN_CONFIG_SEED],
        bump = loan_config.bump,
    )]
    pub loan_config: Account<'info, LoanConfig>,

    /// PDA seeds: [LOAN_SEED, borrower, loan_id.to_le_bytes()]
    #[account(
        init,
        payer = borrower,
        space = 8 + Loan::INIT_SPACE,
        seeds = [LOAN_SEED, borrower.key().as_ref(), &loan_id.to_le_bytes()],
        bump,
    )]
    pub loan: Account<'info, Loan>,

    /// PDA seeds: [SCHEDULE_SEED, borrower, loan_id.to_le_bytes()]
    #[account(
        init,
        payer = borrower,
        space = 8 + RepaymentSchedule::INIT_SPACE,
        seeds = [SCHEDULE_SEED, borrower.key().as_ref(), &loan_id.to_le_bytes()],
        bump,
    )]
    pub repayment_schedule: Account<'info, RepaymentSchedule>,

    pub system_program: Program<'info, System>,
}

pub fn request_loan_handler(
    ctx: Context<RequestLoan>,
    loan_id: u64,
    amount: u64,
    term_months: u8,
    interest_rate_bps: u16,
) -> Result<()> {
    require!(term_months > 0, LoanError::InvalidTerm);

    let interest = (amount as u128)
        .checked_mul(interest_rate_bps as u128)
        .and_then(|v| v.checked_mul(term_months as u128))
        .and_then(|v| v.checked_div(BPS_DENOMINATOR as u128))
        .ok_or(LoanError::MathOverflow)?;
    let interest = u64::try_from(interest).map_err(|_| LoanError::MathOverflow)?;

    let total_due = amount.checked_add(interest).ok_or(LoanError::MathOverflow)?;
    let installment_amount = total_due
        .checked_div(term_months as u64)
        .ok_or(LoanError::MathOverflow)?;

    let loan = &mut ctx.accounts.loan;
    loan.borrower = ctx.accounts.borrower.key();
    loan.loan_id = loan_id;
    loan.amount = amount;
    loan.total_due = total_due;
    loan.total_repaid = 0;
    loan.interest_rate_bps = interest_rate_bps;
    loan.term_months = term_months;
    loan.status = LoanStatus::Pending;
    loan.disbursed_at = 0;
    loan.bump = ctx.bumps.loan;

    let schedule = &mut ctx.accounts.repayment_schedule;
    schedule.borrower = ctx.accounts.borrower.key();
    schedule.loan_id = loan_id;
    schedule.installment_count = term_months;
    schedule.installments_paid = 0;
    schedule.installment_amount = installment_amount;
    schedule.bump = ctx.bumps.repayment_schedule;

    emit!(LoanRequested {
        borrower: loan.borrower,
        loan_id,
        amount,
        total_due,
        term_months,
        interest_rate_bps,
    });

    Ok(())
}

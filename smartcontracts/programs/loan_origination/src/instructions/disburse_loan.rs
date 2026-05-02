use anchor_lang::prelude::*;

use crate::constants::{LOAN_CONFIG_SEED, LOAN_SEED};
use crate::errors::LoanError;
use crate::events::LoanDisbursed;
use crate::state::{Loan, LoanConfig, LoanStatus};

#[derive(Accounts)]
#[instruction(loan_id: u64)]
pub struct DisburseLoan<'info> {
    pub authority: Signer<'info>,

    #[account(
        seeds = [LOAN_CONFIG_SEED],
        bump = loan_config.bump,
        constraint = loan_config.authority == authority.key() @ LoanError::Unauthorized,
    )]
    pub loan_config: Account<'info, LoanConfig>,

    /// CHECK: only used for PDA derivation; the loan validates via has_one.
    pub borrower: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [LOAN_SEED, borrower.key().as_ref(), &loan_id.to_le_bytes()],
        bump = loan.bump,
        has_one = borrower,
    )]
    pub loan: Account<'info, Loan>,
}

pub fn disburse_loan_handler(ctx: Context<DisburseLoan>, loan_id: u64) -> Result<()> {
    let loan = &mut ctx.accounts.loan;
    require!(loan.status == LoanStatus::Approved, LoanError::InvalidStatus);

    let now = Clock::get()?.unix_timestamp;
    loan.status = LoanStatus::Disbursed;
    loan.disbursed_at = now;

    emit!(LoanDisbursed {
        loan_id,
        borrower: loan.borrower,
        disbursed_at: now,
    });

    Ok(())
}

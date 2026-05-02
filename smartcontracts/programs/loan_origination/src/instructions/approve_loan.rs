use anchor_lang::prelude::*;

use collateral_pool::cpi::accounts::LockCollateral as PoolLockCollateral;
use collateral_pool::cpi::lock_collateral as cpi_lock_collateral;
use collateral_pool::program::CollateralPool;
use collateral_pool::state::PoolState;

use crate::constants::{LOAN_CONFIG_SEED, LOAN_SEED};
use crate::errors::LoanError;
use crate::events::LoanApproved;
use crate::state::{Loan, LoanConfig, LoanStatus};

#[derive(Accounts)]
#[instruction(loan_id: u64)]
pub struct ApproveLoan<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        seeds = [LOAN_CONFIG_SEED],
        bump = loan_config.bump,
        constraint = loan_config.authority == authority.key() @ LoanError::Unauthorized,
    )]
    pub loan_config: Account<'info, LoanConfig>,

    /// CHECK: only used for PDA derivation; the loan account validates via has_one.
    pub borrower: UncheckedAccount<'info>,

    /// PDA seeds: [LOAN_SEED, borrower, loan_id.to_le_bytes()]
    #[account(
        mut,
        seeds = [LOAN_SEED, borrower.key().as_ref(), &loan_id.to_le_bytes()],
        bump = loan.bump,
        has_one = borrower,
    )]
    pub loan: Account<'info, Loan>,

    #[account(mut)]
    pub pool_state: Account<'info, PoolState>,

    /// CHECK: created (init) by collateral_pool::lock_collateral CPI; seeds validated there.
    #[account(mut)]
    pub lock_record: UncheckedAccount<'info>,

    pub collateral_pool_program: Program<'info, CollateralPool>,
    pub system_program: Program<'info, System>,
}

pub fn approve_loan_handler(ctx: Context<ApproveLoan>, loan_id: u64) -> Result<()> {
    let loan = &mut ctx.accounts.loan;
    require!(loan.status == LoanStatus::Pending, LoanError::InvalidStatus);

    let cpi_ctx = CpiContext::new(
        ctx.accounts.collateral_pool_program.key(),
        PoolLockCollateral {
            authority: ctx.accounts.authority.to_account_info(),
            pool_state: ctx.accounts.pool_state.to_account_info(),
            lock_record: ctx.accounts.lock_record.to_account_info(),
            system_program: ctx.accounts.system_program.to_account_info(),
        },
    );
    cpi_lock_collateral(cpi_ctx, loan_id, loan.amount)?;

    loan.status = LoanStatus::Approved;

    emit!(LoanApproved {
        loan_id,
        borrower: loan.borrower,
    });

    Ok(())
}

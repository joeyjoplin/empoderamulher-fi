use anchor_lang::prelude::*;

use collateral_pool::cpi::accounts::UnlockCollateral as PoolUnlockCollateral;
use collateral_pool::cpi::unlock_collateral as cpi_unlock_collateral;
use collateral_pool::program::CollateralPool;
use collateral_pool::state::PoolState;

use crate::constants::{LOAN_CONFIG_SEED, LOAN_SEED};
use crate::errors::LoanError;
use crate::events::LoanClosed;
use crate::state::{Loan, LoanConfig, LoanStatus};

#[derive(Accounts)]
#[instruction(loan_id: u64)]
pub struct CloseLoan<'info> {
    #[account(mut)]
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

    #[account(mut)]
    pub pool_state: Account<'info, PoolState>,

    /// CHECK: closed by collateral_pool::unlock_collateral CPI; seeds validated there.
    #[account(mut)]
    pub lock_record: UncheckedAccount<'info>,

    pub collateral_pool_program: Program<'info, CollateralPool>,
}

pub fn close_loan_handler(ctx: Context<CloseLoan>, loan_id: u64) -> Result<()> {
    let loan = &mut ctx.accounts.loan;
    require!(loan.status == LoanStatus::Repaid, LoanError::InvalidStatus);

    let cpi_ctx = CpiContext::new(
        ctx.accounts.collateral_pool_program.key(),
        PoolUnlockCollateral {
            authority: ctx.accounts.authority.to_account_info(),
            pool_state: ctx.accounts.pool_state.to_account_info(),
            lock_record: ctx.accounts.lock_record.to_account_info(),
        },
    );
    cpi_unlock_collateral(cpi_ctx, loan_id)?;

    loan.status = LoanStatus::Closed;

    emit!(LoanClosed {
        loan_id,
        borrower: loan.borrower,
    });

    Ok(())
}

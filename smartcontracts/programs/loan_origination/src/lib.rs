pub mod constants;
pub mod errors;
pub mod events;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("99SfPmytt5sJrmCfvpjiG1WdPMCY9b9iNd8KLVdmBLPU");

#[program]
pub mod loan_origination {
    use super::*;

    pub fn initialize_loan_config(ctx: Context<InitializeLoanConfig>) -> Result<()> {
        instructions::initialize_loan_config::initialize_loan_config_handler(ctx)
    }

    pub fn request_loan(
        ctx: Context<RequestLoan>,
        loan_id: u64,
        amount: u64,
        term_months: u8,
        interest_rate_bps: u16,
    ) -> Result<()> {
        instructions::request_loan::request_loan_handler(
            ctx,
            loan_id,
            amount,
            term_months,
            interest_rate_bps,
        )
    }

    pub fn approve_loan(ctx: Context<ApproveLoan>, loan_id: u64) -> Result<()> {
        instructions::approve_loan::approve_loan_handler(ctx, loan_id)
    }

    pub fn disburse_loan(ctx: Context<DisburseLoan>, loan_id: u64) -> Result<()> {
        instructions::disburse_loan::disburse_loan_handler(ctx, loan_id)
    }

    pub fn repay_installment(
        ctx: Context<RepayInstallment>,
        loan_id: u64,
        amount: u64,
    ) -> Result<()> {
        instructions::repay_installment::repay_installment_handler(ctx, loan_id, amount)
    }

    pub fn close_loan(ctx: Context<CloseLoan>, loan_id: u64) -> Result<()> {
        instructions::close_loan::close_loan_handler(ctx, loan_id)
    }
}

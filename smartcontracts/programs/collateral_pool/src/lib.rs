pub mod constants;
pub mod errors;
pub mod events;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("9DqYSPMWaPBhoJ883KfgiaCiTgCWcZ9qhz4GBQ4CNrTw");

#[program]
pub mod collateral_pool {
    use super::*;

    pub fn initialize_pool(ctx: Context<InitializePool>) -> Result<()> {
        instructions::initialize_pool::initialize_pool_handler(ctx)
    }

    pub fn deposit(ctx: Context<DepositPool>, amount: u64) -> Result<()> {
        instructions::deposit::deposit_handler(ctx, amount)
    }

    pub fn lock_collateral(
        ctx: Context<LockCollateral>,
        loan_id: u64,
        amount: u64,
    ) -> Result<()> {
        instructions::lock_collateral::lock_collateral_handler(ctx, loan_id, amount)
    }

    pub fn unlock_collateral(ctx: Context<UnlockCollateral>, loan_id: u64) -> Result<()> {
        instructions::unlock_collateral::unlock_collateral_handler(ctx, loan_id)
    }
}

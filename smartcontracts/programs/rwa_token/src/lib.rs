pub mod constants;
pub mod errors;
pub mod events;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("CwVqgcBCZtGPYtCrvkFfLpBwhEXLvsb8Cr3KMsiyK655");

#[program]
pub mod rwa_token {
    use super::*;

    pub fn initialize_token_config(
        ctx: Context<InitializeTokenConfig>,
        decimals: u8,
    ) -> Result<()> {
        instructions::initialize_token_config::initialize_token_config_handler(ctx, decimals)
    }

    pub fn mint_rwa(ctx: Context<MintRwa>, amount: u64) -> Result<()> {
        instructions::mint_rwa::mint_rwa_handler(ctx, amount)
    }

    pub fn burn_rwa(ctx: Context<BurnRwa>, amount: u64) -> Result<()> {
        instructions::burn_rwa::burn_rwa_handler(ctx, amount)
    }
}

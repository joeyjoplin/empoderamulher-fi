use anchor_lang::prelude::*;

#[constant]
pub const LOAN_CONFIG_SEED: &[u8] = b"loan_config";

#[constant]
pub const LOAN_SEED: &[u8] = b"loan";

#[constant]
pub const SCHEDULE_SEED: &[u8] = b"schedule";

#[constant]
pub const BPS_DENOMINATOR: u64 = 10_000;

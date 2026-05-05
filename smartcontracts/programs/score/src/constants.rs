use anchor_lang::prelude::*;

#[constant]
pub const SCORE_CONFIG_SEED: &[u8] = b"score_config";

#[constant]
pub const SCORE_SEED: &[u8] = b"score";

pub const MAX_SCORE_VALUE: u16 = 1000;

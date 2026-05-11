use anchor_lang::prelude::*;

#[constant]
pub const PAYMENT_SEED: &[u8] = b"payment";

/// Bound the memo so a malicious caller can't grow account rent unboundedly.
/// 200 bytes covers anything a user-facing description would need ("Embalagens
/// para 50 marmitas — pedido #42") with room to spare.
pub const MAX_MEMO_LEN: usize = 200;

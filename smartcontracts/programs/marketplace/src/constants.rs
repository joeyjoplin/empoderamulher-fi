use anchor_lang::prelude::*;

#[constant]
pub const PAYMENT_SEED: &[u8] = b"payment";

/// PDA seed prefix for BnplPlan accounts. A BnplPlan is 1:1 with a
/// PaymentRequest and lives under `[BNPL_SEED, payment_request, buyer]`.
#[constant]
pub const BNPL_SEED: &[u8] = b"bnpl";

/// Bound the memo so a malicious caller can't grow account rent unboundedly.
/// 200 bytes covers anything a user-facing description would need ("Embalagens
/// para 50 marmitas — pedido #42") with room to spare.
pub const MAX_MEMO_LEN: usize = 200;

/// Cap on installments per BNPL plan. Aligned with the highest tier in the
/// backend's `BNPL_RATES_BY_TIER` (tier A → up to 4x). Setting it to 6 in
/// the program leaves headroom for tier-policy changes off-chain without
/// needing a program upgrade.
pub const MAX_INSTALLMENTS: u8 = 6;

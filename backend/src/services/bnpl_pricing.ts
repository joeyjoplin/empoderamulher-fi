/**
 * BNPL pricing — pure, off-chain. The on-chain program just records the
 * values that come out of this module (no interest derivation lives in the
 * Anchor handler). Keeping it off-chain lets us tune rates without a program
 * upgrade.
 *
 * Interest is **flat per installment**: `interest = principal × bps × n / 10_000`.
 * Simpler than amortised for the demo and matches what the comparison card
 * shows (`R$ 200 à vista` vs `R$ 105 × 2`).
 */

export type ScoreTier = "A" | "B" | "C" | "D";

export type BnplTierRule = {
  /** Hard ceiling on `installmentCount` accepted at quote/hire time. */
  maxInstallmentCount: number;
  /** Per-installment interest, basis points (10_000 = 100%). */
  interestRateBps: number;
};

export const BNPL_RATES_BY_TIER: Record<ScoreTier, BnplTierRule> = {
  A: { maxInstallmentCount: 4, interestRateBps: 250 },
  B: { maxInstallmentCount: 3, interestRateBps: 400 },
  C: { maxInstallmentCount: 2, interestRateBps: 550 },
  D: { maxInstallmentCount: 2, interestRateBps: 700 },
};

/**
 * Map a 0-1000 behavioural score to a BNPL pricing tier. Cutoffs mirror the
 * descriptive bands the AI service surfaces in chat copy (Excelente / Bom /
 * Médio / Inicial).
 */
export function tierFromTotalScore(total: number): ScoreTier {
  if (total >= 850) return "A";
  if (total >= 700) return "B";
  if (total >= 550) return "C";
  return "D";
}

export type BnplQuoteOption = {
  installmentCount: number;
  installmentCents: number;
  totalRepayableCents: number;
  interestRateBps: number;
};

export type QuoteOptionParams = {
  principalCents: number;
  installmentCount: number;
  interestRateBps: number;
};

/**
 * One quote line. `installmentCents` is rounded UP so the program never
 * undercharges; the buyer over-pays by at most `installmentCount - 1` cents
 * across the whole plan and the supplier-side ledger reconciles off-chain.
 */
export function quoteOption(p: QuoteOptionParams): BnplQuoteOption {
  const interestCents = Math.round(
    (p.principalCents * p.interestRateBps * p.installmentCount) / 10_000,
  );
  const totalRepayableCents = p.principalCents + interestCents;
  const installmentCents = Math.ceil(totalRepayableCents / p.installmentCount);
  return {
    installmentCount: p.installmentCount,
    installmentCents,
    totalRepayableCents,
    interestRateBps: p.interestRateBps,
  };
}

export type BuildQuoteOptionsParams = {
  tier: ScoreTier;
  principalCents: number;
};

/**
 * Every accepted installmentCount for the tier, starting at 2 (1x is just
 * "à vista" and is shown separately on the comparison card).
 */
export function buildQuoteOptions(p: BuildQuoteOptionsParams): BnplQuoteOption[] {
  const rule = BNPL_RATES_BY_TIER[p.tier];
  const out: BnplQuoteOption[] = [];
  for (let n = 2; n <= rule.maxInstallmentCount; n++) {
    out.push(
      quoteOption({
        principalCents: p.principalCents,
        installmentCount: n,
        interestRateBps: rule.interestRateBps,
      }),
    );
  }
  return out;
}

import { describe, expect, it } from "vitest";

import {
  BNPL_RATES_BY_TIER,
  buildQuoteOptions,
  quoteOption,
  tierFromTotalScore,
} from "../src/services/bnpl_pricing.js";

describe("tierFromTotalScore", () => {
  it("maps standard score bands to A/B/C/D", () => {
    expect(tierFromTotalScore(900)).toBe("A");
    expect(tierFromTotalScore(850)).toBe("A");
    expect(tierFromTotalScore(849)).toBe("B");
    expect(tierFromTotalScore(700)).toBe("B");
    expect(tierFromTotalScore(699)).toBe("C");
    expect(tierFromTotalScore(550)).toBe("C");
    expect(tierFromTotalScore(549)).toBe("D");
    expect(tierFromTotalScore(0)).toBe("D");
  });
});

describe("quoteOption", () => {
  it("computes flat-rate interest per installment", () => {
    // Principal R$ 200,00 (20_000c), tier B (400 bps), 2 installments
    // interest = 20_000 × 400 × 2 / 10_000 = 1_600c → total 21_600c
    // per-installment = ceil(21_600 / 2) = 10_800c
    const q = quoteOption({
      principalCents: 20_000,
      installmentCount: 2,
      interestRateBps: 400,
    });
    expect(q.installmentCount).toBe(2);
    expect(q.totalRepayableCents).toBe(21_600);
    expect(q.installmentCents).toBe(10_800);
    expect(q.interestRateBps).toBe(400);
  });

  it("rounds installmentCents UP so we never undercharge", () => {
    // total 10_001 / 2 = 5_000.5 → ceil = 5_001
    const q = quoteOption({
      principalCents: 10_001,
      installmentCount: 2,
      interestRateBps: 0,
    });
    expect(q.totalRepayableCents).toBe(10_001);
    expect(q.installmentCents).toBe(5_001);
  });
});

describe("buildQuoteOptions", () => {
  it("returns every installmentCount from 2..maxInstallmentCount", () => {
    const aOpts = buildQuoteOptions({ tier: "A", principalCents: 100_00 });
    expect(aOpts.map((o) => o.installmentCount)).toEqual([2, 3, 4]);

    const bOpts = buildQuoteOptions({ tier: "B", principalCents: 100_00 });
    expect(bOpts.map((o) => o.installmentCount)).toEqual([2, 3]);

    const cOpts = buildQuoteOptions({ tier: "C", principalCents: 100_00 });
    expect(cOpts.map((o) => o.installmentCount)).toEqual([2]);

    const dOpts = buildQuoteOptions({ tier: "D", principalCents: 100_00 });
    expect(dOpts.map((o) => o.installmentCount)).toEqual([2]);
  });

  it("uses the tier's interestRateBps for every option", () => {
    const aOpts = buildQuoteOptions({ tier: "A", principalCents: 100_00 });
    for (const o of aOpts) {
      expect(o.interestRateBps).toBe(BNPL_RATES_BY_TIER.A.interestRateBps);
    }
  });
});

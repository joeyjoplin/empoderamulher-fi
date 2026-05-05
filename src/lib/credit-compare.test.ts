import { describe, expect, it } from "vitest";

import {
  CHEQUE_ESPECIAL_MONTHLY_RATE,
  ROTATIVO_MONTHLY_RATE,
  compareCounterfactual,
  monthlyInstallment,
  totalInterest,
} from "./credit-compare";

const round = (n: number, dp = 2) => Math.round(n * 10 ** dp) / 10 ** dp;

describe("credit-compare math", () => {
  describe("monthlyInstallment", () => {
    it("returns principal * (1 + r) for a 1-month loan", () => {
      // R$ 380 at 4% a.m. for 1 month → 380 + 15.20 = 395.20
      expect(round(monthlyInstallment(380, 0.04, 1))).toBe(395.2);
    });

    it("matches the standard PMT formula for a multi-month loan", () => {
      // R$ 1000 at 4% a.m. for 6 months → ~190.76 per installment
      expect(round(monthlyInstallment(1000, 0.04, 6))).toBeCloseTo(190.76, 1);
    });

    it("returns principal/term when the rate is zero", () => {
      expect(round(monthlyInstallment(1200, 0, 6))).toBe(200);
    });
  });

  describe("totalInterest", () => {
    it("computes simple interest for a 1-month loan", () => {
      expect(round(totalInterest(380, 0.04, 1))).toBe(15.2);
      expect(round(totalInterest(380, 0.09, 1))).toBe(34.2);
    });

    it("computes compounded interest across multiple months", () => {
      // R$ 1000 at 4% a.m. for 6 months: 6*190.76 - 1000 ≈ 144.55
      expect(round(totalInterest(1000, 0.04, 6))).toBeCloseTo(144.55, 1);
    });

    it("is zero when rate is zero", () => {
      expect(totalInterest(500, 0, 3)).toBe(0);
    });
  });

  describe("compareCounterfactual", () => {
    it("returns three plans (cheque / empowerfi / rotativo) with correct interest amounts", () => {
      const result = compareCounterfactual({
        principal: 380,
        termMonths: 1,
        empowerFiRate: 0.04,
      });
      expect(result.empowerfi.monthlyRate).toBe(0.04);
      expect(round(result.empowerfi.totalInterest)).toBe(15.2);
      expect(result.cheque.monthlyRate).toBe(CHEQUE_ESPECIAL_MONTHLY_RATE);
      expect(round(result.cheque.totalInterest)).toBe(
        round(380 * CHEQUE_ESPECIAL_MONTHLY_RATE),
      );
      expect(result.rotativo.monthlyRate).toBe(ROTATIVO_MONTHLY_RATE);
      expect(round(result.rotativo.totalInterest)).toBe(
        round(380 * ROTATIVO_MONTHLY_RATE),
      );
    });

    it("computes savings vs overdraft as cheque - empowerfi total interest", () => {
      const result = compareCounterfactual({
        principal: 380,
        termMonths: 1,
        empowerFiRate: 0.04,
      });
      const expectedSavings =
        result.cheque.totalInterest - result.empowerfi.totalInterest;
      expect(round(result.savingsVsOverdraft)).toBe(round(expectedSavings));
      expect(result.savingsVsOverdraft).toBeGreaterThan(0);
    });

    it("scales linearly with principal for a 1-month loan", () => {
      const small = compareCounterfactual({
        principal: 100,
        termMonths: 1,
        empowerFiRate: 0.04,
      });
      const big = compareCounterfactual({
        principal: 1000,
        termMonths: 1,
        empowerFiRate: 0.04,
      });
      expect(round(big.savingsVsOverdraft)).toBe(
        round(small.savingsVsOverdraft * 10),
      );
    });
  });
});

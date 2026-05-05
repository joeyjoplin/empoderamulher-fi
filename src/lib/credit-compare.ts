/**
 * Counterfactual credit comparison math.
 *
 * Reference rates calibrated for January 2026 — overdraft (cheque especial)
 * mirrors `OVERDRAFT_MONTHLY_RATE` in `ai_service/app/services/insight_engine.py`
 * so the AI service's `vs_overdraft_savings` agrees with what the UI shows.
 */

export const CHEQUE_ESPECIAL_MONTHLY_RATE = 0.09;
export const ROTATIVO_MONTHLY_RATE = 0.14;

export type CreditPlan = {
  monthlyRate: number;
  monthlyInstallment: number;
  totalInterest: number;
  totalToRepay: number;
};

export type CounterfactualComparison = {
  cheque: CreditPlan;
  empowerfi: CreditPlan;
  rotativo: CreditPlan;
  savingsVsOverdraft: number;
};

export type CompareInput = {
  principal: number;
  termMonths: number;
  empowerFiRate: number;
};

export function monthlyInstallment(
  principal: number,
  monthlyRate: number,
  termMonths: number,
): number {
  if (termMonths <= 0) return 0;
  if (monthlyRate === 0) return principal / termMonths;
  const factor = Math.pow(1 + monthlyRate, -termMonths);
  return (principal * monthlyRate) / (1 - factor);
}

export function totalInterest(
  principal: number,
  monthlyRate: number,
  termMonths: number,
): number {
  return monthlyInstallment(principal, monthlyRate, termMonths) * termMonths - principal;
}

function buildPlan(
  principal: number,
  monthlyRate: number,
  termMonths: number,
): CreditPlan {
  const installment = monthlyInstallment(principal, monthlyRate, termMonths);
  const interest = installment * termMonths - principal;
  return {
    monthlyRate,
    monthlyInstallment: installment,
    totalInterest: interest,
    totalToRepay: installment * termMonths,
  };
}

export function compareCounterfactual(
  input: CompareInput,
): CounterfactualComparison {
  const cheque = buildPlan(
    input.principal,
    CHEQUE_ESPECIAL_MONTHLY_RATE,
    input.termMonths,
  );
  const empowerfi = buildPlan(input.principal, input.empowerFiRate, input.termMonths);
  const rotativo = buildPlan(
    input.principal,
    ROTATIVO_MONTHLY_RATE,
    input.termMonths,
  );
  return {
    cheque,
    empowerfi,
    rotativo,
    savingsVsOverdraft: cheque.totalInterest - empowerfi.totalInterest,
  };
}

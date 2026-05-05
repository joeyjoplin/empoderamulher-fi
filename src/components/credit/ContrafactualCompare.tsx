import { useState } from "react";
import { ChevronDown } from "lucide-react";

import {
  CHEQUE_ESPECIAL_MONTHLY_RATE,
  ROTATIVO_MONTHLY_RATE,
  compareCounterfactual,
  type CreditPlan,
} from "@/lib/credit-compare";
import { formatBRL } from "@/lib/format";

export type ContrafactualCompareProps = {
  amount: number;
  termMonths: number;
  empowerFiRate: number;
};

type PlanView = {
  id: "cheque" | "empower" | "rotativo";
  testIdPrefix: string;
  label: string;
  context: string;
  highlight: string;
  highlightTone: "destructive" | "success";
  recommended?: boolean;
  faded?: boolean;
  plan: CreditPlan;
};

function ratePct(rate: number) {
  return `${(rate * 100).toFixed(rate >= 0.1 ? 0 : 1).replace(".", ",")}% ao mês`;
}

function annualPct(monthlyRate: number) {
  const yearly = (Math.pow(1 + monthlyRate, 12) - 1) * 100;
  return `~${Math.round(yearly)}% ao ano`;
}

export function ContrafactualCompare({
  amount,
  termMonths,
  empowerFiRate,
}: ContrafactualCompareProps) {
  const result = compareCounterfactual({
    principal: amount,
    termMonths,
    empowerFiRate,
  });

  const plans: PlanView[] = [
    {
      id: "cheque",
      testIdPrefix: "plan-cheque",
      label: "Cheque Especial",
      context: "No seu banco hoje",
      highlight: `Você pagaria ${formatBRL(result.cheque.totalInterest)} de juros`,
      highlightTone: "destructive",
      faded: true,
      plan: result.cheque,
    },
    {
      id: "empower",
      testIdPrefix: "plan-empower",
      label: "Crédito EmpowerFI",
      context: "Para você agora",
      highlight: `Economia de ${formatBRL(result.savingsVsOverdraft)}`,
      highlightTone: "success",
      recommended: true,
      plan: result.empowerfi,
    },
    {
      id: "rotativo",
      testIdPrefix: "plan-rotativo",
      label: "Cartão Rotativo",
      context: "Se usasse o cartão",
      highlight:
        result.rotativo.totalInterest > amount * 0.3
          ? `Equivale a ${Math.round((result.rotativo.totalInterest / amount) * 100)}% do empréstimo`
          : `Você pagaria ${formatBRL(result.rotativo.totalInterest)} de juros`,
      highlightTone: "destructive",
      faded: true,
      plan: result.rotativo,
    },
  ];

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        {plans.map((p) => (
          <article
            key={p.id}
            data-testid={p.testIdPrefix}
            className={[
              "relative rounded-xl border p-4 transition-all",
              p.recommended
                ? "border-primary bg-primary text-primary-foreground shadow-md"
                : "border-border bg-card",
              p.faded ? "opacity-80" : "",
            ].join(" ")}
          >
            {p.recommended ? (
              <span className="absolute -top-2.5 left-4 rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent-foreground">
                Recomendado para você
              </span>
            ) : null}

            <div
              className={[
                "text-[11px] font-semibold uppercase tracking-wider",
                p.recommended
                  ? "text-primary-foreground/70"
                  : "text-muted-foreground",
              ].join(" ")}
            >
              {p.context}
            </div>
            <div
              className={[
                "mt-1 text-base font-semibold",
                p.recommended ? "text-primary-foreground" : "text-primary",
              ].join(" ")}
            >
              {p.label}
            </div>

            <div className="mt-3 space-y-1">
              <div
                className={[
                  "text-2xl font-bold",
                  p.recommended ? "text-primary-foreground" : "text-foreground",
                ].join(" ")}
              >
                {ratePct(p.plan.monthlyRate)}
              </div>
              <div
                className={[
                  "text-xs",
                  p.recommended
                    ? "text-primary-foreground/70"
                    : "text-muted-foreground",
                ].join(" ")}
              >
                {annualPct(p.plan.monthlyRate)}
              </div>
            </div>

            <div
              className={[
                "mt-3 border-t pt-3",
                p.recommended
                  ? "border-primary-foreground/20"
                  : "border-border",
              ].join(" ")}
            >
              <div
                className={[
                  "text-xs",
                  p.recommended
                    ? "text-primary-foreground/70"
                    : "text-muted-foreground",
                ].join(" ")}
              >
                Juros em {termMonths === 1 ? "1 mês" : `${termMonths} meses`}
              </div>
              <div
                data-testid={`${p.testIdPrefix}-interest`}
                className={[
                  "mt-0.5 text-lg font-semibold",
                  p.recommended ? "text-primary-foreground" : "text-foreground",
                ].join(" ")}
              >
                {formatBRL(p.plan.totalInterest)}
              </div>
            </div>

            <div
              className={[
                "mt-3 rounded-md px-2.5 py-1.5 text-xs font-medium",
                p.highlightTone === "destructive" && !p.recommended
                  ? "bg-destructive/10 text-destructive"
                  : "",
                p.highlightTone === "success" && p.recommended
                  ? "bg-success/20 text-success-foreground"
                  : "",
              ].join(" ")}
            >
              {p.highlight}
            </div>
          </article>
        ))}
      </div>

      <p
        data-testid="savings-vs-overdraft"
        className="rounded-lg border border-success/30 bg-success/5 px-4 py-3 text-sm text-success"
      >
        Você economiza{" "}
        <strong className="font-semibold">
          {formatBRL(result.savingsVsOverdraft)}
        </strong>{" "}
        comparado ao cheque especial.
      </p>
    </div>
  );
}

export type LoanDetailsCollapseProps = {
  amount: number;
  termMonths: number;
  empowerFiRate: number;
};

export function LoanDetailsCollapse({
  amount,
  termMonths,
  empowerFiRate,
}: LoanDetailsCollapseProps) {
  const [open, setOpen] = useState(false);
  const result = compareCounterfactual({
    principal: amount,
    termMonths,
    empowerFiRate,
  });
  return (
    <div className="rounded-xl border border-border bg-card">
      <button
        onClick={() => setOpen((o) => !o)}
        className="tap-target flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-sm font-semibold text-foreground">
          Detalhes do empréstimo
        </span>
        <ChevronDown
          className={[
            "h-4 w-4 text-muted-foreground transition-transform",
            open ? "rotate-180" : "",
          ].join(" ")}
        />
      </button>
      {open ? (
        <div className="space-y-2 border-t border-border px-4 py-3 text-sm animate-fade-in">
          <Row label="Valor solicitado" value={formatBRL(amount)} />
          <Row
            label="Prazo"
            value={termMonths === 1 ? "1 mês" : `${termMonths} meses`}
          />
          <Row label="Juros" value={formatBRL(result.empowerfi.totalInterest)} />
          <Row
            label="Total a pagar"
            value={formatBRL(result.empowerfi.totalToRepay)}
            emphasize
          />
          <p className="mt-3 rounded-md bg-secondary p-3 text-xs leading-relaxed text-secondary-foreground">
            <strong className="font-semibold">Como o EmpowerFI consegue:</strong>{" "}
            capital lastreado em Tesouro Nacional tokenizado, com parte do
            rendimento direcionado para reduzir sua taxa.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function Row({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={[
          "font-medium",
          emphasize ? "text-primary font-semibold" : "text-foreground",
        ].join(" ")}
      >
        {value}
      </span>
    </div>
  );
}

export { CHEQUE_ESPECIAL_MONTHLY_RATE, ROTATIVO_MONTHLY_RATE };

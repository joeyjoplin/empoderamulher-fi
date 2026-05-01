import { useState } from "react";
import { ChevronDown } from "lucide-react";

type Plan = {
  id: "cheque" | "empower" | "rotativo";
  label: string;
  context: string;
  rate: string;
  yearly: string;
  interest: string;
  highlight: string;
  highlightTone: "destructive" | "success" | "warning";
  recommended?: boolean;
  faded?: boolean;
};

const plans: Plan[] = [
  {
    id: "cheque",
    label: "Cheque Especial",
    context: "No seu banco hoje",
    rate: "8% ao mês",
    yearly: "~129% ao ano",
    interest: "R$ 35,00",
    highlight: "Você pagaria R$ 35 só de juros",
    highlightTone: "destructive",
    faded: true,
  },
  {
    id: "empower",
    label: "Crédito EmpowerFI",
    context: "Recomendado para você",
    rate: "4% ao mês",
    yearly: "~50% ao ano",
    interest: "R$ 15,20",
    highlight: "Economia de R$ 20",
    highlightTone: "success",
    recommended: true,
  },
  {
    id: "rotativo",
    label: "Cartão Rotativo",
    context: "Se usasse o cartão",
    rate: "37% ao mês",
    yearly: "~440% ao ano",
    interest: "R$ 142,00",
    highlight: "Equivale a quase metade do empréstimo",
    highlightTone: "destructive",
    faded: true,
  },
];

export function ContrafactualCompare() {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {plans.map((p) => (
        <div
          key={p.id}
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
              p.recommended ? "text-primary-foreground/70" : "text-muted-foreground",
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
            <div className={["text-2xl font-bold", p.recommended ? "text-primary-foreground" : "text-foreground"].join(" ")}>
              {p.rate}
            </div>
            <div className={["text-xs", p.recommended ? "text-primary-foreground/70" : "text-muted-foreground"].join(" ")}>
              {p.yearly}
            </div>
          </div>

          <div className={["mt-3 border-t pt-3", p.recommended ? "border-primary-foreground/20" : "border-border"].join(" ")}>
            <div className={["text-xs", p.recommended ? "text-primary-foreground/70" : "text-muted-foreground"].join(" ")}>
              Juros em 1 mês
            </div>
            <div className={["mt-0.5 text-lg font-semibold", p.recommended ? "text-primary-foreground" : "text-foreground"].join(" ")}>
              {p.interest}
            </div>
          </div>

          <div
            className={[
              "mt-3 rounded-md px-2.5 py-1.5 text-xs font-medium",
              p.highlightTone === "destructive" && !p.recommended ? "bg-destructive/10 text-destructive" : "",
              p.highlightTone === "success" && p.recommended ? "bg-success/20 text-success-foreground" : "",
              p.highlightTone === "success" && !p.recommended ? "bg-success/10 text-success" : "",
              p.highlightTone === "warning" ? "bg-warning/10 text-warning" : "",
            ].join(" ")}
          >
            {p.highlight}
          </div>
        </div>
      ))}
    </div>
  );
}

export function LoanDetailsCollapse() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-border bg-card">
      <button
        onClick={() => setOpen((o) => !o)}
        className="tap-target flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-sm font-semibold text-foreground">Detalhes do empréstimo</span>
        <ChevronDown
          className={["h-4 w-4 text-muted-foreground transition-transform", open ? "rotate-180" : ""].join(" ")}
        />
      </button>
      {open ? (
        <div className="space-y-2 border-t border-border px-4 py-3 text-sm animate-fade-in">
          <Row label="Valor solicitado" value="R$ 380,00" />
          <Row label="Prazo" value="1 mês" />
          <Row label="Juros" value="R$ 15,20" />
          <Row label="Total a pagar" value="R$ 395,20" emphasize />
          <p className="mt-3 rounded-md bg-secondary p-3 text-xs leading-relaxed text-secondary-foreground">
            <strong className="font-semibold">Como o EmpowerFI consegue:</strong> capital lastreado
            em Tesouro Nacional tokenizado, com parte do rendimento direcionado para reduzir sua taxa.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function Row({ label, value, emphasize }: { label: string; value: string; emphasize?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={["font-medium", emphasize ? "text-primary font-semibold" : "text-foreground"].join(" ")}>
        {value}
      </span>
    </div>
  );
}

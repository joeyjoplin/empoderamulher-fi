import { AlertCircle, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

import type {
  ProactiveAlert as ProactiveAlertData,
  ProactiveAlertSuggestion,
} from "@/api/insights";
import { useProactiveAlert } from "@/hooks/useProactiveAlert";
import { formatBRL } from "@/lib/format";
import { renderInline } from "@/lib/inline-markdown";

type SuggestionView = {
  id: string;
  to: string;
  label: string;
  sub: string;
  primary: boolean;
};

function suggestionToView(s: ProactiveAlertSuggestion): SuggestionView {
  switch (s.type) {
    case "anticipation":
      return {
        id: "antecipar",
        to: "/insights/antecipar",
        label: "Antecipar recebíveis",
        sub: `Custo estimado: ${formatBRL(s.estimatedCost)}`,
        primary: false,
      };
    case "supplier_renegotiation":
      return {
        id: "renegociar",
        to: "/insights/renegociar",
        label: `Renegociar com ${s.supplierName}`,
        sub: `Viabilidade: ${
          s.feasibility === "high"
            ? "alta"
            : s.feasibility === "medium"
              ? "média"
              : "baixa"
        }`,
        primary: false,
      };
    case "empowerfi_credit": {
      const qs = new URLSearchParams({
        amount: String(s.amount),
        termMonths: "1",
        monthlyRate: String(s.monthlyRate),
      });
      return {
        id: "credito",
        to: `/insights/credito?${qs.toString()}`,
        label: "Crédito EmpowerFI",
        sub: `${formatBRL(s.amount)} a ${(s.monthlyRate * 100).toFixed(1)}% a.m. — economia de ${formatBRL(s.vsOverdraftSavings)} vs cheque especial`,
        primary: true,
      };
    }
  }
}

function ProactiveAlertView({ data }: { data: ProactiveAlertData }) {
  const actions = data.suggestions.map(suggestionToView);
  return (
    <motion.article
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 220, damping: 22 }}
      className="rounded-xl border border-highlight bg-highlight p-5 shadow-sm"
      style={{ borderLeftWidth: 4, borderLeftColor: "hsl(var(--accent))" }}
      aria-labelledby="alert-title"
    >
      <div className="mb-3 flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-accent" aria-hidden />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-accent">
          Atenção importante
        </span>
      </div>

      <h2
        id="alert-title"
        className="text-lg font-semibold leading-snug text-primary"
      >
        Tenho um alerta para você
      </h2>

      <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-foreground/90">
        {renderInline(data.naturalLanguageAlert)}
      </p>

      <motion.div
        className="mt-5 flex flex-col gap-2.5"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.08, delayChildren: 0.18 } },
        }}
      >
        {actions.map((a) => (
          <motion.div
            key={a.id}
            variants={{
              hidden: { opacity: 0, y: 8 },
              visible: { opacity: 1, y: 0 },
            }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
          >
            <Link
              to={a.to}
              className={[
                "tap-target group flex items-center justify-between rounded-lg border px-4 py-3 transition-colors",
                a.primary
                  ? "border-primary bg-primary text-primary-foreground hover:bg-primary/95"
                  : "border-border bg-card text-foreground hover:bg-muted",
              ].join(" ")}
            >
              <div className="text-left">
                <div className="text-[15px] font-semibold">{a.label}</div>
                <div
                  className={[
                    "mt-0.5 text-xs",
                    a.primary
                      ? "text-primary-foreground/80"
                      : "text-muted-foreground",
                  ].join(" ")}
                >
                  {a.sub}
                </div>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </motion.article>
  );
}

function ProactiveAlertSkeleton() {
  return (
    <article
      className="rounded-xl border border-highlight bg-highlight p-5 shadow-sm"
      aria-busy="true"
      aria-label="Carregando alerta"
    >
      <div className="h-3 w-32 animate-pulse rounded bg-muted" />
      <div className="mt-3 h-5 w-3/4 animate-pulse rounded bg-muted" />
      <div className="mt-2 h-4 w-full animate-pulse rounded bg-muted" />
      <div className="mt-1 h-4 w-5/6 animate-pulse rounded bg-muted" />
    </article>
  );
}

export function ProactiveAlert() {
  const state = useProactiveAlert();

  if (state.status === "loading") return <ProactiveAlertSkeleton />;
  if (state.status === "error") return null;
  if (!state.data.alert) return null;
  return <ProactiveAlertView data={state.data} />;
}

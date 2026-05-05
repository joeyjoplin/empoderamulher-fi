import { Link } from "react-router-dom";

import { useMyScore } from "@/hooks/useMyScore";

export function ScoreWidget() {
  const state = useMyScore();

  if (state.status === "loading") {
    return (
      <div
        className="rounded-xl border border-border bg-card p-4 shadow-sm"
        aria-busy="true"
        aria-label="Carregando score"
      >
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Score
        </div>
        <div className="mt-1 h-7 w-20 animate-pulse rounded bg-muted" />
        <div className="mt-3 h-1.5 w-full animate-pulse rounded-full bg-muted" />
      </div>
    );
  }

  if (state.status === "error") {
    if (state.error.code === "score_not_attested") {
      return (
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Score
          </div>
          <div className="mt-1 text-sm font-semibold text-primary">
            Score em construção
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            Estamos calculando seu score com base no seu histórico.
          </div>
        </div>
      );
    }
    return (
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Score
        </div>
        <div className="mt-1 text-sm text-muted-foreground">
          Não conseguimos carregar agora.
        </div>
      </div>
    );
  }

  const { total, breakdown } = state.data;
  const pct = Math.round((total / 1000) * 100);
  const label = total >= 700 ? "Excelente" : total >= 600 ? "Bom" : total >= 500 ? "Em construção" : "Atenção";

  return (
    <Link
      to="/score"
      className="block rounded-xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
      title={`Discipline ${breakdown.discipline} · Organization ${breakdown.organization} · Cash flow ${breakdown.cashFlow} · Engagement ${breakdown.engagement}`}
    >
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Score
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span data-testid="score-total" className="text-2xl font-bold text-primary">
          {total}
        </span>
        <span className="text-sm text-muted-foreground">/1000</span>
      </div>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-2 text-xs text-muted-foreground">
        {label} — atestado on-chain
      </div>
    </Link>
  );
}

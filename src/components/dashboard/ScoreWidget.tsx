import { Link } from "react-router-dom";
import { usePersona } from "@/context/PersonaContext";

export function ScoreWidget() {
  const { current } = usePersona();
  const pct = Math.round((current.score / 1000) * 100);

  return (
    <Link
      to="/score"
      className="block rounded-xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Score</div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-2xl font-bold text-primary">{current.score}</span>
        <span className="text-sm text-muted-foreground">/1000</span>
      </div>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-2 text-xs text-muted-foreground">Bom — você está no caminho</div>
    </Link>
  );
}

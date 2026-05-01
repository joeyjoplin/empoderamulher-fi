import { AppHeader } from "@/components/AppHeader";
import { PillarCard } from "@/components/score/PillarCard";
import { usePersona } from "@/context/PersonaContext";
import { scorePillars } from "@/data/scoreBreakdown";

export default function ScorePage() {
  const { current } = usePersona();

  // Mock evolution for last 3 months
  const evolution = [current.score - 45, current.score - 20, current.score];
  const maxY = 1000;
  const points = evolution
    .map((v, i) => `${(i / (evolution.length - 1)) * 100},${100 - (v / maxY) * 100}`)
    .join(" ");

  return (
    <div className="min-h-screen bg-background pb-12">
      <AppHeader title="Seu score" showBack />

      <main className="container-mobile space-y-5 py-5">
        <section className="rounded-xl border border-border bg-card p-5 shadow-sm animate-fade-in">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Score atual
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-4xl font-bold tracking-tight text-primary">{current.score}</span>
            <span className="text-base text-muted-foreground">/1000</span>
          </div>
          <div className="mt-1 text-sm text-success">Bom — você está no caminho certo</div>

          <div className="mt-5 h-24 w-full">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
              <polyline
                fill="none"
                stroke="hsl(var(--accent))"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
                points={points}
              />
              {evolution.map((v, i) => (
                <circle
                  key={i}
                  cx={(i / (evolution.length - 1)) * 100}
                  cy={100 - (v / maxY) * 100}
                  r="1.5"
                  fill="hsl(var(--accent))"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </svg>
            <div className="mt-1 flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
              <span>3 meses atrás</span>
              <span>Hoje</span>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Os 4 pilares
          </h2>
          {scorePillars.map((p) => (
            <PillarCard key={p.id} pillar={p} />
          ))}
        </section>
      </main>
    </div>
  );
}

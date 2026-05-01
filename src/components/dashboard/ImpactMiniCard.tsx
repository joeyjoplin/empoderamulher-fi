import { useImpact } from "@/context/ImpactContext";
import { userImpact } from "@/data/impactData";
import { Heart, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export function ImpactMiniCard() {
  const { hiredThisMonth } = useImpact();
  const hired = Math.max(userImpact.entrepreneursHired, hiredThisMonth);
  const max = Math.max(...userImpact.miniChartData);

  return (
    <Link
      to="/impacto"
      className="block rounded-xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <Heart className="h-3.5 w-3.5 text-accent" /> Seu Impacto
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
      </div>

      <div className="mt-2 flex items-end justify-between gap-3">
        <div className="space-y-1">
          <div>
            <div className="text-lg font-bold text-success leading-none">
              R$ {userImpact.interestSavedThisMonth}
            </div>
            <div className="text-[11px] text-muted-foreground">economizado em juros</div>
          </div>
          <div>
            <div className="text-lg font-bold text-primary leading-none">{hired}</div>
            <div className="text-[11px] text-muted-foreground">empreendedora(s) contratada(s)</div>
          </div>
        </div>

        <div className="flex h-12 items-end gap-1">
          {userImpact.miniChartData.map((v, i) => (
            <div
              key={i}
              className="w-2 rounded-sm bg-success/80 origin-bottom animate-fade-in"
              style={{
                height: `${(v / max) * 100}%`,
                animationDelay: `${i * 80}ms`,
              }}
            />
          ))}
        </div>
      </div>

      <div className="mt-3 text-xs font-semibold text-primary">Ver dashboard completo →</div>
    </Link>
  );
}

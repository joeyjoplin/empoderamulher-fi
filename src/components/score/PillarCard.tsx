import { useState } from "react";
import { ChevronDown, FolderOpen, Handshake, PiggyBank, TrendingUp, Check, AlertTriangle, Lock } from "lucide-react";
import type { ScorePillar } from "@/data/scoreBreakdown";

const iconMap = { PiggyBank, FolderOpen, TrendingUp, Handshake } as const;

export function PillarCard({ pillar }: { pillar: ScorePillar }) {
  const [open, setOpen] = useState(false);
  const Icon = iconMap[pillar.icon as keyof typeof iconMap] ?? PiggyBank;
  const pct = Math.round((pillar.current / pillar.total) * 100);

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <button
        onClick={() => setOpen((o) => !o)}
        className="tap-target flex w-full items-center gap-3 p-4 text-left"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-baseline justify-between">
            <span className="text-[15px] font-semibold text-foreground">{pillar.title}</span>
            <span className="text-sm text-muted-foreground">
              <strong className="text-primary">{pillar.current}</strong>/{pillar.total}
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">Peso {pillar.weight}</div>
        </div>
        <ChevronDown
          className={["h-4 w-4 shrink-0 text-muted-foreground transition-transform", open ? "rotate-180" : ""].join(" ")}
        />
      </button>

      {open ? (
        <ul className="space-y-2 border-t border-border p-4 animate-fade-in">
          {pillar.items.map((item, i) => (
            <li key={i} className="flex items-start gap-3 rounded-lg bg-muted/50 p-3">
              <div className="mt-0.5 shrink-0">
                {item.status === "ok" ? (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-success text-success-foreground">
                    <Check className="h-3 w-3" />
                  </div>
                ) : item.status === "warn" ? (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-warning text-warning-foreground">
                    <AlertTriangle className="h-3 w-3" />
                  </div>
                ) : (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-muted-foreground/20 text-muted-foreground">
                    <Lock className="h-3 w-3" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-medium text-foreground">{item.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {item.current}/{item.total}
                  </span>
                </div>
                {item.detail ? (
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{item.detail}</p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

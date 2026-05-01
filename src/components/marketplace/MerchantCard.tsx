import { Star, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import type { Merchant } from "@/data/marketplace";

export function MerchantCard({ merchant }: { merchant: Merchant }) {
  return (
    <article className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary text-primary text-sm font-semibold">
          {merchant.initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate text-[15px] font-semibold text-foreground">{merchant.name}</h3>
            {merchant.verified ? (
              <ShieldCheck className="h-4 w-4 shrink-0 text-success" aria-label="Verificada" />
            ) : null}
          </div>
          <div className="text-xs text-muted-foreground">{merchant.city}</div>
          <p className="mt-1 text-sm text-foreground">{merchant.specialty}</p>

          <div className="mt-2 flex items-center gap-1 text-xs">
            <Star className="h-3.5 w-3.5 fill-accent text-accent" />
            <strong className="text-foreground">{merchant.rating.toFixed(1)}</strong>
            <span className="text-muted-foreground">({merchant.reviews} avaliações)</span>
          </div>

          {merchant.verified ? (
            <span className="mt-2 inline-block rounded-full bg-highlight px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent">
              Verificada na rede EmpowerFI
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <Link
          to="/marketplace/cobrar"
          className="tap-target flex-1 rounded-lg bg-primary px-4 py-2.5 text-center text-sm font-semibold text-primary-foreground hover:bg-primary/95"
        >
          Contratar
        </Link>
      </div>
    </article>
  );
}

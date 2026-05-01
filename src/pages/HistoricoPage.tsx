import { AppHeader } from "@/components/AppHeader";
import { historyEvents } from "@/data/marketplace";
import { Award, HandCoins, Handshake, ShoppingBag } from "lucide-react";
import { formatBRL } from "@/lib/format";

const iconMap = {
  emprestimo: HandCoins,
  renegociacao: Handshake,
  marketplace: ShoppingBag,
  score: Award,
} as const;

const statusStyle: Record<string, string> = {
  ativo: "bg-warning/10 text-warning",
  pago: "bg-success/10 text-success",
  concluido: "bg-success/10 text-success",
};

export default function HistoricoPage() {
  return (
    <div className="min-h-screen bg-background pb-12">
      <AppHeader title="Histórico" showBack />

      <main className="container-mobile space-y-3 py-5">
        <h1 className="text-xl font-semibold tracking-tight text-primary">Tudo que aconteceu</h1>
        <p className="text-sm text-muted-foreground">
          Empréstimos, renegociações, transações e marcos do seu score.
        </p>

        <ul className="mt-4 space-y-3">
          {historyEvents.map((e) => {
            const Icon = iconMap[e.type];
            return (
              <li
                key={e.id}
                className="rounded-xl border border-border bg-card p-4 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="text-[15px] font-semibold text-foreground">{e.title}</h3>
                      {e.amount ? (
                        <span className="shrink-0 text-sm font-semibold text-primary">
                          {formatBRL(e.amount)}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">{e.description}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-[11px] text-muted-foreground">{e.date}</span>
                      {e.status ? (
                        <span
                          className={[
                            "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                            statusStyle[e.status] ?? "bg-muted text-muted-foreground",
                          ].join(" ")}
                        >
                          {e.status}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}

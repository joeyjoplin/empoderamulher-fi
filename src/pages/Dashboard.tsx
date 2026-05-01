import { AppHeader } from "@/components/AppHeader";
import { ChatFAB } from "@/components/ChatFAB";
import { ProactiveAlert } from "@/components/dashboard/ProactiveAlert";
import { ScoreWidget } from "@/components/dashboard/ScoreWidget";
import { ImpactMiniCard } from "@/components/dashboard/ImpactMiniCard";
import { usePersona } from "@/context/PersonaContext";
import { formatBRL, greeting } from "@/lib/format";
import { ArrowRight, CalendarClock, Heart, TrendingUp, Wallet } from "lucide-react";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const { current } = usePersona();
  const monthPct = Math.min(100, Math.round((current.monthRevenue / current.monthlyRevenue) * 100));

  return (
    <div className="min-h-screen bg-background pb-24">
      <AppHeader />

      <main className="container-mobile space-y-5 py-5">
        <div className="animate-fade-in">
          <p className="text-sm text-muted-foreground">{greeting()},</p>
          <h1 className="text-2xl font-semibold tracking-tight text-primary">{current.firstName}</h1>
        </div>

        <ProactiveAlert />

        <section className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <Wallet className="h-3.5 w-3.5" /> Saldo
            </div>
            <div className="mt-1 text-xl font-bold text-primary">{formatBRL(current.balance)}</div>
            <div className="mt-1 inline-flex items-center gap-1 text-xs text-success">
              <TrendingUp className="h-3 w-3" /> +{formatBRL(current.weeklyChange)} esta semana
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Faturamento do mês
            </div>
            <div className="mt-1 text-xl font-bold text-primary">{formatBRL(current.monthRevenue)}</div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-success" style={{ width: `${monthPct}%` }} />
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              de {formatBRL(current.monthlyRevenue)} média
            </div>
          </div>

          <ScoreWidget />

          <Link
            to="/insights/credito"
            className="rounded-xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <CalendarClock className="h-3.5 w-3.5" /> Próximas obrigações
            </div>
            <div className="mt-1 text-xl font-bold text-primary">{formatBRL(current.obligationsTotal)}</div>
            <div className="mt-1 text-xs text-muted-foreground">em {current.obligationsDays} dias</div>
          </Link>
        </section>

        <ImpactMiniCard />

        <Link
          to="/marketplace"
          className="flex items-center justify-between rounded-xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-highlight text-accent">
              <Heart className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground">
                3 empreendedoras na sua rede
              </div>
              <div className="text-xs text-muted-foreground">podem te ajudar essa semana</div>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </Link>

        <Link
          to="/historico"
          className="block rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground hover:bg-muted"
        >
          Ver histórico completo
        </Link>
      </main>

      <ChatFAB />
    </div>
  );
}

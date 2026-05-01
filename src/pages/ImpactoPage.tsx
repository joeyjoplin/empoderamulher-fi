import { AppHeader } from "@/components/AppHeader";
import { BrazilMap } from "@/components/impact/BrazilMap";
import { impactMetrics } from "@/data/impactData";
import { useCountUp } from "@/hooks/useCountUp";
import { formatBRL } from "@/lib/format";
import {
  ArrowLeftRight,
  ExternalLink,
  HandCoins,
  RefreshCw,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";

export default function ImpactoPage() {
  return (
    <div className="min-h-screen bg-background pb-12">
      <AppHeader title="Impacto" showBack />

      <main className="container-mobile space-y-6 py-5">
        <header className="animate-fade-in">
          <h1 className="text-2xl font-bold tracking-tight text-primary">Impacto EmpowerFI</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Transparência total. Cada número tem rosto e história.
          </p>
        </header>

        {/* Bloco 1 — Métricas Hero */}
        <section className="grid grid-cols-2 gap-3">
          <HeroMetric
            icon={<Users className="h-4 w-4" />}
            value={impactMetrics.activeEntrepreneurs}
            label="Empreendedoras ativas"
            delta={impactMetrics.monthOverMonth.entrepreneurs}
          />
          <HeroMetric
            icon={<TrendingDown className="h-4 w-4" />}
            value={impactMetrics.interestSavedThisMonth}
            label="Economizado em juros"
            delta={impactMetrics.monthOverMonth.interest}
            currency
          />
          <HeroMetric
            icon={<RefreshCw className="h-4 w-4" />}
            value={impactMetrics.debtsRenegotiated}
            label="Dívidas renegociadas"
            delta={impactMetrics.monthOverMonth.debts}
            currency
          />
          <HeroMetric
            icon={<ArrowLeftRight className="h-4 w-4" />}
            value={impactMetrics.marketplaceTransactions}
            label="Transações B2B"
            delta={impactMetrics.monthOverMonth.marketplace}
          />
        </section>

        {/* Bloco 2 — Mapa */}
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-primary">
            Onde estamos transformando vidas
          </h2>
          <BrazilMap />
        </section>

        {/* Bloco 3 — On-chain */}
        <section className="space-y-2">
          <div>
            <h2 className="text-base font-semibold text-primary">
              Últimas transações registradas em blockchain
            </h2>
            <p className="text-xs text-muted-foreground">
              Auditoria pública, transparência total
            </p>
          </div>

          <div className="space-y-2">
            {impactMetrics.recentTransactions.map((t) => (
              <article
                key={t.id}
                className="rounded-xl border border-border bg-card p-3 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                    {t.type === "loan_disbursed" ? (
                      <HandCoins className="h-4 w-4" />
                    ) : t.type === "marketplace_payment" ? (
                      <ShoppingBag className="h-4 w-4" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">{t.description}</p>
                    <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span>{t.timestamp}</span>
                      <span>·</span>
                      <span className="font-mono">{t.hash}</span>
                    </div>
                    <a
                      href="https://explorer.solana.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                    >
                      Ver no Solana Explorer <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <div className="text-sm font-semibold text-primary">
                    {formatBRL(t.amount)}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Bloco 4 — Tokenização */}
        <section className="rounded-2xl bg-primary p-5 text-primary-foreground shadow-lg">
          <h2 className="text-base font-semibold">Capital Tokenizado em Ação</h2>

          <div className="mt-4">
            <div className="text-3xl font-bold tracking-tight">
              {formatBRL(impactMetrics.poolTotal).replace(",00", "")}
            </div>
            <div className="text-sm opacity-80">Pool tokenizado total</div>
            <div className="mt-1 text-xs opacity-70">
              Lastreado em Tesouro Nacional Brasileiro
            </div>
          </div>

          <div className="my-4 h-px bg-primary-foreground/20" />

          <div>
            <div className="text-3xl font-bold tracking-tight">
              {formatBRL(impactMetrics.yieldDistributed)}
            </div>
            <div className="text-sm opacity-80">Yield distribuído este mês</div>
            <div className="mt-1 text-xs opacity-70">
              {impactMetrics.qualifiedInvestors} investidoras qualificadas
            </div>
          </div>

          <p className="mt-5 text-sm leading-relaxed opacity-90">
            Capital seguro. Impacto real. Auditoria pública on-chain. É assim que reconstruímos o
            sistema financeiro para mulheres empreendedoras.
          </p>

          <button className="tap-target mt-4 w-full rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground hover:bg-accent/90">
            Conheça nossa tese de tokenização
          </button>
        </section>

        {/* Bloco 5 — CTA */}
        <section className="rounded-xl border border-border bg-card p-4 text-center shadow-sm">
          <p className="text-sm text-foreground">
            Quer fazer parte do impacto? Você pode investir em mulheres empreendedoras com retorno
            competitivo.
          </p>
          <Link
            to="/"
            className="tap-target mt-3 inline-block rounded-lg border border-primary px-4 py-2.5 text-sm font-semibold text-primary hover:bg-primary hover:text-primary-foreground"
          >
            Falar com a equipe EmpowerFI
          </Link>
        </section>
      </main>
    </div>
  );
}

function HeroMetric({
  icon,
  value,
  label,
  delta,
  currency,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  delta: number;
  currency?: boolean;
}) {
  const animated = useCountUp(value, 1500);
  const display = currency
    ? formatBRL(animated).replace(",00", "")
    : animated.toLocaleString("pt-BR");

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-1.5 text-muted-foreground">{icon}</div>
      <div className="mt-2 text-xl font-bold leading-tight text-primary">{display}</div>
      <div className="mt-1 text-[11px] leading-tight text-muted-foreground">{label}</div>
      <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-success">
        <TrendingUp className="h-3 w-3" /> +{delta}% vs mês anterior
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeftRight,
  CalendarCheck,
  CheckCircle2,
  ExternalLink,
  HandCoins,
  Handshake,
  type LucideIcon,
  RefreshCw,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";

import { AppHeader } from "@/components/AppHeader";
import { BrazilMap } from "@/components/impact/BrazilMap";
import { useApiClient } from "@/api/ApiClientProvider";
import {
  fetchImpactDashboard,
  type ImpactDashboard,
  type ImpactTransaction,
} from "@/api/impact";
import { impactMetrics } from "@/data/impactData";
import { useCountUp } from "@/hooks/useCountUp";
import { formatBRL } from "@/lib/format";

/**
 * Local fallback used when the backend dashboard endpoint is unreachable
 * (e.g. the demo machine is offline). Mirrors the API shape so the render
 * path stays identical. Real on-chain transactions intentionally start
 * empty in this fallback — we'd rather show "no transactions yet" than
 * fake hashes that don't open in the explorer.
 */
const FALLBACK_DASHBOARD: ImpactDashboard = {
  metrics: {
    activeEntrepreneurs: impactMetrics.activeEntrepreneurs,
    interestSavedCents: impactMetrics.interestSavedThisMonth * 100,
    debtsRenegotiatedCents: impactMetrics.debtsRenegotiated * 100,
    marketplaceTransactions: impactMetrics.marketplaceTransactions,
    monthOverMonth: impactMetrics.monthOverMonth,
    poolTotalCents: impactMetrics.poolTotal * 100,
    yieldDistributedCents: impactMetrics.yieldDistributed * 100,
    qualifiedInvestors: impactMetrics.qualifiedInvestors,
    cityDistribution: impactMetrics.cityDistribution,
  },
  recentTransactions: [],
};

export default function ImpactoPage() {
  const client = useApiClient();
  const [dashboard, setDashboard] = useState<ImpactDashboard>(FALLBACK_DASHBOARD);
  const [txStatus, setTxStatus] = useState<"loading" | "ready">("loading");

  useEffect(() => {
    let cancelled = false;
    fetchImpactDashboard(client)
      .then((data) => {
        if (cancelled) return;
        setDashboard(data);
        setTxStatus("ready");
      })
      .catch(() => {
        // Keep the fallback metrics — the dashboard is a marketing surface
        // and shouldn't show an error banner during the pitch. We still
        // mark the tx list as "ready" so the empty-state copy stops
        // pretending the indexer call is in flight.
        if (!cancelled) setTxStatus("ready");
      });
    return () => {
      cancelled = true;
    };
  }, [client]);

  const { metrics, recentTransactions } = dashboard;

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
            value={metrics.activeEntrepreneurs}
            label="Empreendedoras ativas"
            delta={metrics.monthOverMonth.entrepreneurs}
          />
          <HeroMetric
            icon={<TrendingDown className="h-4 w-4" />}
            value={Math.round(metrics.interestSavedCents / 100)}
            label="Economizado em juros"
            delta={metrics.monthOverMonth.interest}
            currency
          />
          <HeroMetric
            icon={<RefreshCw className="h-4 w-4" />}
            value={Math.round(metrics.debtsRenegotiatedCents / 100)}
            label="Dívidas renegociadas"
            delta={metrics.monthOverMonth.debts}
            currency
          />
          <HeroMetric
            icon={<ArrowLeftRight className="h-4 w-4" />}
            value={metrics.marketplaceTransactions}
            label="Transações B2B"
            delta={metrics.monthOverMonth.marketplace}
          />
        </section>

        {/* Bloco 2 — Mapa */}
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-primary">
            Onde estamos transformando vidas
          </h2>
          <BrazilMap />
        </section>

        {/* Bloco 3 — On-chain (real transactions from the indexer) */}
        <section className="space-y-2">
          <div>
            <h2 className="text-base font-semibold text-primary">
              Últimas transações registradas em blockchain
            </h2>
            <p className="text-xs text-muted-foreground">
              Auditoria pública, transparência total
            </p>
          </div>

          {txStatus === "loading" ? (
            <TransactionSkeletonList />
          ) : recentTransactions.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border bg-card p-4 text-center text-xs text-muted-foreground">
              Aguardando a próxima transação on-chain. Volte após uma operação no app.
            </p>
          ) : (
            <div className="space-y-2">
              {recentTransactions.map((t) => (
                <TransactionRow key={t.id} tx={t} />
              ))}
            </div>
          )}
        </section>

        {/* Bloco 4 — Tokenização */}
        <section className="rounded-2xl bg-primary p-5 text-primary-foreground shadow-lg">
          <h2 className="text-base font-semibold">Capital Tokenizado em Ação</h2>

          <div className="mt-4">
            <div className="text-3xl font-bold tracking-tight">
              {formatBRL(metrics.poolTotalCents / 100).replace(",00", "")}
            </div>
            <div className="text-sm opacity-80">Pool tokenizado total</div>
            <div className="mt-1 text-xs opacity-70">
              Lastreado em Tesouro Nacional Brasileiro
            </div>
          </div>

          <div className="my-4 h-px bg-primary-foreground/20" />

          <div>
            <div className="text-3xl font-bold tracking-tight">
              {formatBRL(metrics.yieldDistributedCents / 100)}
            </div>
            <div className="text-sm opacity-80">Yield distribuído este mês</div>
            <div className="mt-1 text-xs opacity-70">
              {metrics.qualifiedInvestors} investidoras qualificadas
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

function TransactionSkeletonList() {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Carregando transações">
      {[0, 1, 2].map((i) => (
        <article
          key={i}
          className="rounded-xl border border-border bg-card p-3 shadow-sm"
        >
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 shrink-0 animate-pulse rounded-lg bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-3/4 animate-pulse rounded bg-muted" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
            </div>
            <div className="h-4 w-16 animate-pulse rounded bg-muted" />
          </div>
        </article>
      ))}
    </div>
  );
}

/**
 * Per-type visual metadata. `tag` shows up as a small label above the
 * row description so a viewer can scan the list and tell "loan vs
 * marketplace direct vs BNPL supplier vs BNPL installment vs BNPL closed".
 */
const TX_VISUALS: Record<
  ImpactTransaction["type"],
  { Icon: LucideIcon; tag: string }
> = {
  loan_disbursed: { Icon: HandCoins, tag: "Empréstimo" },
  marketplace_payment: { Icon: ShoppingBag, tag: "Marketplace" },
  marketplace_bnpl_supplier_paid: {
    Icon: Handshake,
    tag: "BNPL — fornecedor pago",
  },
  marketplace_bnpl_installment_paid: {
    Icon: CalendarCheck,
    tag: "BNPL — parcela paga",
  },
  marketplace_bnpl_completed: {
    Icon: CheckCircle2,
    tag: "BNPL — plano quitado",
  },
};

function TransactionRow({ tx }: { tx: ImpactTransaction }) {
  const { Icon, tag } = TX_VISUALS[tx.type];
  const explorerUrl = `https://explorer.solana.com/tx/${tx.signature}?cluster=devnet`;
  const shortSig =
    tx.signature.length > 16
      ? `${tx.signature.slice(0, 8)}…${tx.signature.slice(-6)}`
      : tx.signature;

  return (
    <article className="rounded-xl border border-border bg-card p-3 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {tag}
          </span>
          <p className="text-sm text-foreground">{tx.description}</p>
          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
            <span>{formatRelativeTime(tx.blockTime)}</span>
            <span>·</span>
            <span className="font-mono" title={tx.signature}>
              {shortSig}
            </span>
          </div>
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
          >
            Ver no Solana Explorer <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        {tx.amountCents !== null ? (
          <div className="text-sm font-semibold text-primary">
            {formatBRL(tx.amountCents / 100)}
          </div>
        ) : null}
      </div>
    </article>
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

function formatRelativeTime(iso: string | null): string {
  if (!iso) return "Recente";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "Recente";
  const diffMs = Date.now() - then;
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return "Agora mesmo";
  if (minutes < 60) return `Há ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Há ${hours} h`;
  const days = Math.round(hours / 24);
  return `Há ${days} d`;
}

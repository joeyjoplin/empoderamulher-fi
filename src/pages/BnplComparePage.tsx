/**
 * `/marketplace/contratar/:id/parcelado` — the BNPL pricing comparison.
 *
 * Loads a real quote from the backend, lets the buyer pick an installment
 * count, shows the comparison card, and hands off to `hireBnplProvider` on
 * confirm. Routes to `BnplSucessoPage` on success.
 */
import { AlertCircle, Heart, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { AppHeader } from "@/components/AppHeader";
import { BnplComparisonCard } from "@/components/marketplace/BnplComparisonCard";
import { useApiClient } from "@/api/ApiClientProvider";
import {
  fetchBnplQuote,
  hireBnplProvider,
  type BnplQuote,
  type CompletedBnplHire,
} from "@/api/marketplace";
import { useImpact } from "@/context/ImpactContext";
import { marketplaceListings } from "@/data/impactData";
import { friendlyError } from "@/lib/error-copy";
import { formatBRL } from "@/lib/format";

const STEPS = [
  "Abrindo plano de parcelamento on-chain...",
  "Pagando o fornecedor à vista...",
  "Concluindo...",
];

/** 30 days from now in Unix epoch seconds. */
function nextMonthEpoch(): number {
  return Math.floor(Date.now() / 1000) + 30 * 86_400;
}

type QuoteState =
  | { kind: "loading" }
  | { kind: "ready"; quote: BnplQuote }
  | { kind: "error"; message: string };

type HireState =
  | { kind: "idle" }
  | { kind: "loading"; step: number }
  | { kind: "error"; message: string };

export default function BnplComparePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const client = useApiClient();
  const { registerHire } = useImpact();
  const merchant = marketplaceListings.find((m) => m.id === id);

  const [quoteState, setQuoteState] = useState<QuoteState>({ kind: "loading" });
  const [selectedCount, setSelectedCount] = useState<number | null>(null);
  const [hireState, setHireState] = useState<HireState>({ kind: "idle" });

  const principalCents = merchant ? Math.round(merchant.itemPrice * 100) : 0;

  useEffect(() => {
    if (!merchant) return;
    let cancelled = false;
    setQuoteState({ kind: "loading" });
    fetchBnplQuote(client, {
      providerPersonaId: merchant.personaId,
      principalCents,
    })
      .then((quote) => {
        if (cancelled) return;
        setQuoteState({ kind: "ready", quote });
        setSelectedCount(quote.options[0]?.installmentCount ?? null);
      })
      .catch((err) => {
        if (cancelled) return;
        setQuoteState({ kind: "error", message: friendlyError(err) });
      });
    return () => {
      cancelled = true;
    };
  }, [client, merchant, principalCents]);

  const selectedOption = useMemo(() => {
    if (quoteState.kind !== "ready" || selectedCount === null) return null;
    return (
      quoteState.quote.options.find(
        (o) => o.installmentCount === selectedCount,
      ) ?? null
    );
  }, [quoteState, selectedCount]);

  if (!merchant || merchant.isSelf) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader title="Parcelar" showBack />
        <main className="container-mobile py-10 text-center">
          <p className="text-sm text-muted-foreground">Oferta não encontrada.</p>
          <Link
            to="/marketplace"
            className="mt-4 inline-block text-sm font-semibold text-primary"
          >
            Voltar para o marketplace
          </Link>
        </main>
      </div>
    );
  }

  const confirm = async () => {
    if (!selectedOption) return;
    setHireState({ kind: "loading", step: 0 });
    const stepTimer = window.setInterval(() => {
      setHireState((s) =>
        s.kind === "loading" && s.step < STEPS.length - 1
          ? { kind: "loading", step: s.step + 1 }
          : s,
      );
    }, 1200);

    try {
      const completed: CompletedBnplHire = await hireBnplProvider(client, {
        providerPersonaId: merchant.personaId,
        principalCents,
        installmentCount: selectedOption.installmentCount,
        category: merchant.category,
        memo: `${merchant.specialty} — ${merchant.itemHighlight} (BNPL)`,
        firstDueAt: nextMonthEpoch(),
      });
      window.clearInterval(stepTimer);
      registerHire();
      navigate("/marketplace/parcelado/sucesso", {
        state: {
          merchantName: merchant.sellerName.replace(" (Você)", ""),
          hire: completed,
        },
      });
    } catch (err) {
      window.clearInterval(stepTimer);
      setHireState({ kind: "error", message: friendlyError(err) });
    }
  };

  if (hireState.kind === "loading") {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader title="Parcelando" />
        <main className="container-mobile space-y-6 py-10">
          {STEPS.map((label, i) => (
            <div
              key={i}
              className={[
                "flex items-center gap-3 rounded-lg border p-3 transition-opacity",
                i <= hireState.step
                  ? "border-border bg-card opacity-100"
                  : "border-dashed border-border opacity-40",
              ].join(" ")}
            >
              {i < hireState.step ? (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-success text-[11px] text-success-foreground">
                  ✓
                </span>
              ) : i === hireState.step ? (
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              ) : (
                <span className="h-5 w-5 rounded-full border border-border" />
              )}
              <span className="text-sm text-foreground">{label}</span>
            </div>
          ))}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-12">
      <AppHeader title="Comparar à vista vs parcelado" showBack />

      <main className="container-mobile space-y-4 py-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-primary">
            {merchant.sellerName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {merchant.specialty} — {merchant.itemHighlight}
          </p>
        </div>

        {quoteState.kind === "loading" ? (
          <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Buscando opções de parcelamento...
          </div>
        ) : null}

        {quoteState.kind === "error" ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{quoteState.message}</span>
            </div>
          </div>
        ) : null}

        {quoteState.kind === "ready" && selectedOption ? (
          <>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Escolha as parcelas
              </div>
              <div className="mt-3 grid gap-2">
                {quoteState.quote.options.map((opt) => {
                  const active = opt.installmentCount === selectedCount;
                  return (
                    <button
                      key={opt.installmentCount}
                      type="button"
                      onClick={() => setSelectedCount(opt.installmentCount)}
                      aria-pressed={active}
                      className={[
                        "tap-target flex items-center justify-between rounded-lg border-2 p-3 text-left transition",
                        active
                          ? "border-primary bg-primary/5"
                          : "border-border bg-card hover:border-primary/40",
                      ].join(" ")}
                    >
                      <div>
                        <div className="text-sm font-semibold text-foreground">
                          {opt.installmentCount}x de{" "}
                          {formatBRL(opt.installmentCents / 100)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Total {formatBRL(opt.totalRepayableCents / 100)}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {(opt.interestRateBps / 100).toFixed(1)}% por parcela
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Tier {quoteState.quote.tier} — até{" "}
                {quoteState.quote.maxInstallmentCount}x permitido pelo seu score
              </p>
            </div>

            <BnplComparisonCard
              upfrontCents={quoteState.quote.upfrontCents}
              selected={selectedOption}
            />

            <div className="rounded-xl border border-highlight bg-highlight p-4">
              <div className="flex items-start gap-2">
                <Heart className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <p className="text-sm text-primary">
                  A vendedora recebe{" "}
                  <strong>{formatBRL(principalCents / 100)}</strong> à vista —
                  você paga em parcelas para a EmpowerFI.
                </p>
              </div>
            </div>

            {hireState.kind === "error" ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{hireState.message}</span>
                </div>
              </div>
            ) : null}

            <div className="space-y-2 pt-2">
              <button
                onClick={confirm}
                className="tap-target w-full rounded-lg bg-primary px-5 py-3.5 text-[15px] font-semibold text-primary-foreground hover:bg-primary/95"
              >
                Confirmar {selectedOption.installmentCount}x de{" "}
                {formatBRL(selectedOption.installmentCents / 100)}
              </button>
              <Link
                to={`/marketplace/contratar/${merchant.id}`}
                className="tap-target block w-full rounded-lg border border-border bg-card px-5 py-3.5 text-center text-[15px] font-semibold text-foreground hover:bg-muted"
              >
                Voltar para "à vista"
              </Link>
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}

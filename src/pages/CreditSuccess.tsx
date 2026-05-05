import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { CheckCircle2, ExternalLink, Sparkles } from "lucide-react";

import type { DisbursedLoan } from "@/api/credit";
import { AppHeader } from "@/components/AppHeader";
import { usePersona } from "@/context/PersonaContext";
import { compareCounterfactual } from "@/lib/credit-compare";
import { formatBRL } from "@/lib/format";

type LocationState =
  | { loan: DisbursedLoan; amount: number }
  | null
  | undefined;

function useCounter(target: number, duration = 1200) {
  const [value, setValue] = useState(target - 20);
  useEffect(() => {
    const start = performance.now();
    const startVal = target - 20;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      setValue(Math.round(startVal + (target - startVal) * p));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

function shortenSig(sig: string): string {
  if (sig.length <= 10) return sig;
  return `${sig.slice(0, 4)}…${sig.slice(-4)}`;
}

export default function CreditSuccess() {
  const { current } = usePersona();
  const location = useLocation();
  const state = location.state as LocationState;
  const loan = state?.loan ?? null;

  const amount = state?.amount ?? (loan ? loan.principalCents / 100 : 380);
  const totalToRepay = loan
    ? compareCounterfactual({
        principal: loan.principalCents / 100,
        termMonths: loan.termMonths,
        empowerFiRate: loan.interestRateBps / 10_000,
      }).empowerfi.totalToRepay
    : 395.2;

  const newScore = useCounter(current.score + 20);
  const explorerUrl = loan
    ? `https://explorer.solana.com/tx/${loan.signatures.disburse}?cluster=devnet`
    : null;

  return (
    <div className="min-h-screen bg-background pb-12">
      <AppHeader title="Sucesso" />

      <main className="container-mobile space-y-5 py-8 text-center">
        <div className="animate-scale-in">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-success/15">
            <CheckCircle2 className="h-12 w-12 text-success" />
          </div>
          <h1 className="mt-5 text-2xl font-bold tracking-tight text-primary">
            Pronto, {current.firstName}! 🎉
          </h1>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
            {formatBRL(amount)} estão na sua conta agora. Sua próxima parcela
            vence em 30 dias.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 text-left shadow-sm">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <span className="text-sm text-muted-foreground">Valor recebido</span>
            <span className="text-lg font-bold text-primary">
              {formatBRL(amount)}
            </span>
          </div>
          <div className="flex items-center justify-between border-b border-border py-3">
            <span className="text-sm text-muted-foreground">
              Total a pagar em 30 dias
            </span>
            <span className="text-base font-semibold text-foreground">
              {formatBRL(totalToRepay)}
            </span>
          </div>
          <div className="flex items-center justify-between pt-3">
            <span className="text-sm text-muted-foreground">
              Hash da transação
            </span>
            {explorerUrl ? (
              <a
                href={explorerUrl}
                target="_blank"
                rel="noreferrer"
                aria-label="Ver transação na blockchain"
                className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
              >
                {shortenSig(loan!.signatures.disburse)}{" "}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : (
              <span className="text-sm text-muted-foreground">—</span>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-highlight bg-highlight p-4 text-left">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/20 text-accent">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-semibold text-primary">
                Seu score subiu de {current.score} para {newScore}
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                +20 em Engajamento. Continue assim!
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2.5">
          <Link
            to="/dashboard"
            className="tap-target block w-full rounded-lg bg-primary px-5 py-3.5 text-[15px] font-semibold text-primary-foreground hover:bg-primary/95"
          >
            Voltar para o início
          </Link>
          <Link
            to="/historico"
            className="tap-target block w-full rounded-lg border border-border bg-card px-5 py-3.5 text-[15px] font-semibold text-foreground hover:bg-muted"
          >
            Ver detalhes no histórico
          </Link>
        </div>
      </main>
    </div>
  );
}

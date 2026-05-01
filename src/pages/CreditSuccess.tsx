import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, ExternalLink, Sparkles } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { usePersona } from "@/context/PersonaContext";

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

export default function CreditSuccess() {
  const { current } = usePersona();
  const newScore = useCounter(current.score + 20);

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
            R$ 380 estão na sua conta agora. Sua próxima parcela vence em 30 dias.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 text-left shadow-sm">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <span className="text-sm text-muted-foreground">Valor recebido</span>
            <span className="text-lg font-bold text-primary">R$ 380,00</span>
          </div>
          <div className="flex items-center justify-between border-b border-border py-3">
            <span className="text-sm text-muted-foreground">Total a pagar em 30 dias</span>
            <span className="text-base font-semibold text-foreground">R$ 395,20</span>
          </div>
          <div className="flex items-center justify-between pt-3">
            <span className="text-sm text-muted-foreground">Hash da transação</span>
            <a
              href="#"
              onClick={(e) => e.preventDefault()}
              className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
            >
              5xr...8kP <ExternalLink className="h-3.5 w-3.5" />
            </a>
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

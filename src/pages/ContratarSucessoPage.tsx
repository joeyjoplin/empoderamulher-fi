import { AppHeader } from "@/components/AppHeader";
import { useImpact } from "@/context/ImpactContext";
import { CheckCircle2, ExternalLink } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

export default function ContratarSucessoPage() {
  const location = useLocation();
  const { hiredThisMonth } = useImpact();
  const state = (location.state as { merchantName?: string; amount?: number }) ?? {};
  const merchantName = state.merchantName ?? "vendedora";
  const hash = "8bX2nP4q...3pK";

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title="Sucesso" showBack />
      <main className="container-mobile space-y-5 py-8 animate-fade-in">
        <div className="text-center animate-scale-in">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/15">
            <CheckCircle2 className="h-10 w-10 text-success" />
          </div>
          <h1 className="mt-4 text-xl font-bold text-primary">Contratação registrada! 🎉</h1>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            {merchantName} foi notificada. Sua transação está auditável na blockchain.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Hash da transação
          </div>
          <div className="mt-1 font-mono text-sm text-foreground">{hash}</div>
          <a
            href="https://explorer.solana.com"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            Ver no Solana Explorer <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        <div className="rounded-xl border border-highlight bg-highlight p-4">
          <p className="text-sm text-primary">
            Você contratou <strong>{Math.max(1, hiredThisMonth)}</strong> empreendedora(s) este
            mês. Continue assim! 💪
          </p>
        </div>

        <div className="space-y-2 pt-2">
          <Link
            to="/dashboard"
            className="tap-target block w-full rounded-lg bg-primary px-5 py-3.5 text-center text-[15px] font-semibold text-primary-foreground hover:bg-primary/95"
          >
            Voltar para o início
          </Link>
          <Link
            to="/impacto"
            className="tap-target block w-full rounded-lg border border-border bg-card px-5 py-3.5 text-center text-[15px] font-semibold text-foreground hover:bg-muted"
          >
            Ver dashboard de impacto
          </Link>
        </div>
      </main>
    </div>
  );
}

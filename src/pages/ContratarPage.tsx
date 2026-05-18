import { AppHeader } from "@/components/AppHeader";
import {
  PaymentModeToggle,
  type PaymentMode,
} from "@/components/marketplace/PaymentModeToggle";
import { marketplaceListings } from "@/data/impactData";
import { formatBRL } from "@/lib/format";
import { useImpact } from "@/context/ImpactContext";
import { useApiClient } from "@/api/ApiClientProvider";
import { hireProvider, type CompletedHire } from "@/api/marketplace";
import { friendlyError } from "@/lib/error-copy";
import { AlertCircle, Heart, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";

const STEPS = [
  "Registrando solicitação on-chain...",
  "Confirmando pagamento...",
  "Concluindo...",
];

type Status =
  | { kind: "idle" }
  | { kind: "loading"; step: number }
  | { kind: "error"; message: string };

export default function ContratarPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const client = useApiClient();
  const { registerHire } = useImpact();
  const merchant = marketplaceListings.find((m) => m.id === id);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [mode, setMode] = useState<PaymentMode>("direct");

  // Selecting "Parcelado" routes to the comparison page — the BNPL flow has
  // its own pricing fetch + confirmation step so it doesn't live in here.
  useEffect(() => {
    if (mode === "bnpl" && merchant) {
      navigate(`/marketplace/contratar/${merchant.id}/parcelado`);
    }
  }, [mode, merchant, navigate]);

  if (!merchant || merchant.isSelf) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader title="Contratar" showBack />
        <main className="container-mobile py-10 text-center">
          <p className="text-sm text-muted-foreground">Oferta não encontrada.</p>
          <Link to="/marketplace" className="mt-4 inline-block text-sm font-semibold text-primary">
            Voltar para o marketplace
          </Link>
        </main>
      </div>
    );
  }

  const start = async () => {
    setStatus({ kind: "loading", step: 0 });
    // Soft progress hint while the on-chain create→pay round-trip lands.
    const stepTimer = window.setInterval(() => {
      setStatus((s) =>
        s.kind === "loading" && s.step < STEPS.length - 1
          ? { kind: "loading", step: s.step + 1 }
          : s,
      );
    }, 1200);

    try {
      const completed: CompletedHire = await hireProvider(client, {
        providerPersonaId: merchant.personaId,
        amountCents: Math.round(merchant.itemPrice * 100),
        category: merchant.category,
        memo: `${merchant.specialty} — ${merchant.itemHighlight}`,
      });
      window.clearInterval(stepTimer);
      registerHire();
      navigate("/marketplace/sucesso", {
        state: {
          merchantName: merchant.sellerName.replace(" (Você)", ""),
          amount: merchant.itemPrice,
          hire: completed,
        },
      });
    } catch (err) {
      window.clearInterval(stepTimer);
      setStatus({ kind: "error", message: friendlyError(err) });
    }
  };

  if (status.kind === "loading") {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader title="Contratando" />
        <main className="container-mobile space-y-6 py-10">
          {STEPS.map((label, i) => (
            <div
              key={i}
              className={[
                "flex items-center gap-3 rounded-lg border p-3 transition-opacity",
                i <= status.step ? "border-border bg-card opacity-100" : "border-dashed border-border opacity-40",
              ].join(" ")}
            >
              {i < status.step ? (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-success text-[11px] text-success-foreground">
                  ✓
                </span>
              ) : i === status.step ? (
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

  if (status.kind === "error") {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader title="Confirmar contratação" showBack />
        <main className="container-mobile py-10">
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-7 w-7 text-destructive" />
            </div>
            <h1 className="mt-4 text-lg font-semibold text-primary">
              Não conseguimos contratar agora
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">{status.message}</p>
            <button
              type="button"
              onClick={start}
              className="tap-target mt-5 w-full rounded-lg bg-primary px-5 py-3 text-[15px] font-semibold text-primary-foreground hover:bg-primary/95"
            >
              Tentar novamente
            </button>
            <button
              type="button"
              onClick={() => navigate("/marketplace")}
              className="tap-target mt-2 w-full rounded-lg border border-border bg-card px-5 py-3 text-[15px] font-semibold text-foreground hover:bg-muted"
            >
              Voltar para o marketplace
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-12">
      <AppHeader title="Confirmar contratação" showBack />

      <main className="container-mobile space-y-4 py-5">
        <h1 className="text-xl font-semibold tracking-tight text-primary">
          Contratar {merchant.sellerName}
        </h1>

        <PaymentModeToggle value={mode} onChange={setMode} />

        <div className="rounded-xl border-2 border-primary/20 bg-card p-4 shadow-sm">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Detalhes do item
          </div>
          <div className="mt-2 space-y-1.5 text-sm">
            <Row label="Item">
              {merchant.specialty} — {merchant.itemHighlight}
            </Row>
            <Row label="Vendedora">
              {merchant.sellerName}, {merchant.city}
            </Row>
            <Row label="Valor">
              <strong className="text-primary">{formatBRL(merchant.itemPrice)}</strong>
            </Row>
          </div>
          <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
            Pagamento à vista, registrado em blockchain.
          </p>
        </div>

        <div className="rounded-xl border border-highlight bg-highlight p-4">
          <div className="flex items-start gap-2">
            <Heart className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            <p className="text-sm text-primary">
              Esta transação contribui para a economia circular feminina. Vai aparecer no seu
              dashboard de impacto.
            </p>
          </div>
        </div>

        <div className="space-y-2 pt-2">
          <button
            onClick={start}
            className="tap-target w-full rounded-lg bg-primary px-5 py-3.5 text-[15px] font-semibold text-primary-foreground hover:bg-primary/95"
          >
            Confirmar e pagar {formatBRL(merchant.itemPrice)}
          </button>
          <Link
            to="/marketplace"
            className="tap-target block w-full rounded-lg border border-border bg-card px-5 py-3.5 text-center text-[15px] font-semibold text-foreground hover:bg-muted"
          >
            Cancelar
          </Link>
        </div>
      </main>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right text-foreground">{children}</span>
    </div>
  );
}

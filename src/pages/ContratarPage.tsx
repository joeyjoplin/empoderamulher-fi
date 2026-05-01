import { AppHeader } from "@/components/AppHeader";
import { marketplaceListings } from "@/data/impactData";
import { formatBRL } from "@/lib/format";
import { useImpact } from "@/context/ImpactContext";
import { Heart, Loader2 } from "lucide-react";
import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";

const STEPS = [
  "Registrando transação na blockchain...",
  "Notificando vendedora...",
  "Concluindo...",
];

export default function ContratarPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { registerHire } = useImpact();
  const merchant = marketplaceListings.find((m) => m.id === id);
  const [step, setStep] = useState(-1);

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

  const start = () => {
    setStep(0);
    setTimeout(() => setStep(1), 1000);
    setTimeout(() => setStep(2), 2000);
    setTimeout(() => {
      registerHire();
      navigate("/marketplace/sucesso", {
        state: { merchantName: merchant.sellerName.replace(" (Você)", ""), amount: merchant.itemPrice },
      });
    }, 3000);
  };

  if (step >= 0) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader title="Contratando" showBack />
        <main className="container-mobile space-y-6 py-10">
          {STEPS.map((label, i) => (
            <div
              key={i}
              className={[
                "flex items-center gap-3 rounded-lg border p-3 transition-opacity",
                i <= step ? "border-border bg-card opacity-100" : "border-dashed border-border opacity-40",
              ].join(" ")}
            >
              {i < step ? (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-success text-[11px] text-success-foreground">
                  ✓
                </span>
              ) : i === step ? (
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
      <AppHeader title="Confirmar contratação" showBack />

      <main className="container-mobile space-y-4 py-5">
        <h1 className="text-xl font-semibold tracking-tight text-primary">
          Contratar {merchant.sellerName}
        </h1>

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

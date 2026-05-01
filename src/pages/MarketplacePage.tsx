import { AppHeader } from "@/components/AppHeader";
import { marketplaceListings } from "@/data/impactData";
import { useImpact } from "@/context/ImpactContext";
import { ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { formatBRL } from "@/lib/format";

export default function MarketplacePage() {
  const { hiredThisMonth } = useImpact();
  const [showSoon, setShowSoon] = useState(false);

  return (
    <div className="min-h-screen bg-background pb-12">
      <AppHeader title="Marketplace" showBack />

      <main className="container-mobile space-y-4 py-5">
        <div className="rounded-xl border border-highlight bg-highlight p-4 animate-fade-in">
          <p className="text-sm leading-relaxed text-primary">
            💝 Comprar de outras empreendedoras fortalece toda a rede. Cada transação é registrada
            em <strong>blockchain</strong> para auditoria de impacto.
          </p>
        </div>

        <div className="text-xs text-muted-foreground">
          Você contratou <strong className="text-foreground">{hiredThisMonth}</strong>{" "}
          empreendedora(s) este mês
        </div>

        <section className="space-y-3">
          {marketplaceListings.map((m) => (
            <article
              key={m.id}
              className={[
                "rounded-xl border p-4 shadow-sm",
                m.isSelf
                  ? "border-accent/40 bg-highlight/40"
                  : "border-border bg-card",
              ].join(" ")}
            >
              <div className="flex items-start gap-3">
                <div
                  className={[
                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                    m.isSelf
                      ? "bg-accent text-accent-foreground"
                      : "bg-secondary text-primary",
                  ].join(" ")}
                >
                  {m.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="truncate text-[15px] font-semibold text-foreground">
                      {m.sellerName}
                    </h3>
                    {m.verified && !m.isSelf ? (
                      <ShieldCheck className="h-4 w-4 shrink-0 text-success" />
                    ) : null}
                  </div>
                  <div className="text-xs text-muted-foreground">{m.city}</div>

                  {m.isSelf ? (
                    <p className="mt-1 text-sm text-foreground">
                      Você está oferecendo:{" "}
                      <strong>{m.specialty}</strong> — {m.itemHighlight}
                    </p>
                  ) : (
                    <>
                      <p className="mt-1 text-sm text-foreground">{m.specialty}</p>
                      <p className="mt-1 text-sm">
                        <span className="text-muted-foreground">Item destaque: </span>
                        <strong className="text-foreground">
                          {m.itemHighlight} — {formatBRL(m.itemPrice)}
                        </strong>
                      </p>
                      <span className="mt-2 inline-block rounded-full bg-highlight px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent">
                        ✓ Verificada na rede EmpowerFI
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-3">
                {m.isSelf ? (
                  <button
                    onClick={() => setShowSoon(true)}
                    className="tap-target w-full rounded-lg border border-accent bg-card px-4 py-2.5 text-center text-sm font-semibold text-accent hover:bg-accent/10"
                  >
                    Editar minha oferta
                  </button>
                ) : (
                  <Link
                    to={`/marketplace/contratar/${m.id}`}
                    className="tap-target block w-full rounded-lg bg-primary px-4 py-2.5 text-center text-sm font-semibold text-primary-foreground hover:bg-primary/95"
                  >
                    Contratar
                  </Link>
                )}
              </div>
            </article>
          ))}
        </section>

        {showSoon ? (
          <>
            <div
              className="fixed inset-0 z-40 bg-foreground/40"
              onClick={() => setShowSoon(false)}
            />
            <div className="fixed inset-x-4 top-1/3 z-50 mx-auto max-w-sm rounded-xl border border-border bg-card p-5 shadow-xl animate-scale-in">
              <h3 className="text-base font-semibold text-primary">Em breve</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Edição da sua oferta estará disponível em breve.
              </p>
              <button
                onClick={() => setShowSoon(false)}
                className="tap-target mt-4 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
              >
                Entendi
              </button>
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}

import { useState } from "react";
import { Heart, ChevronDown } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { MerchantCard } from "@/components/marketplace/MerchantCard";
import { merchants } from "@/data/marketplace";
import { Link } from "react-router-dom";

const categories = ["todas", "insumos", "embalagens", "serviços", "parcerias"] as const;

export default function MarketplacePage() {
  const [filterOpen, setFilterOpen] = useState(false);
  const [category, setCategory] = useState<string>("todas");

  const list = merchants.filter((m) => category === "todas" || m.category === category);

  return (
    <div className="min-h-screen bg-background pb-12">
      <AppHeader title="Marketplace" showBack />

      <main className="container-mobile space-y-4 py-5">
        <div className="rounded-xl border border-highlight bg-highlight p-4 animate-fade-in">
          <div className="flex items-start gap-3">
            <Heart className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            <p className="text-sm leading-relaxed text-primary">
              Comprar de outras empreendedoras fortalece toda a rede. Cada transação registrada gera
              dados de impacto.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Link
            to="/marketplace/cobrar"
            className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted"
          >
            + Cobrar alguém
          </Link>
          <button
            onClick={() => setFilterOpen((o) => !o)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            Filtros <ChevronDown className={["h-3 w-3 transition-transform", filterOpen ? "rotate-180" : ""].join(" ")} />
          </button>
        </div>

        {filterOpen ? (
          <div className="rounded-lg border border-border bg-card p-3 animate-fade-in">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Categoria
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={[
                    "rounded-full border px-3 py-1.5 text-xs font-medium capitalize",
                    category === c
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-foreground hover:bg-muted",
                  ].join(" ")}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <section className="space-y-3">
          {list.map((m) => (
            <MerchantCard key={m.id} merchant={m} />
          ))}
        </section>
      </main>
    </div>
  );
}

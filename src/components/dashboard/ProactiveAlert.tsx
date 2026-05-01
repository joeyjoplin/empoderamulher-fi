import { AlertCircle, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { usePersona } from "@/context/PersonaContext";
import { formatBRL } from "@/lib/format";

export function ProactiveAlert() {
  const { current } = usePersona();

  const actions = [
    {
      id: "antecipar",
      label: "Antecipar recebíveis",
      sub: "Custo estimado: R$ 18",
      primary: false,
    },
    {
      id: "renegociar",
      label: "Renegociar com fornecedor",
      sub: "Já consultei: ele aceita 2x",
      primary: false,
    },
    {
      id: "credito",
      label: "Crédito EmpowerFI",
      sub: "R$ 380 a 4% a.m. — economia de R$ 20 vs cheque especial",
      primary: true,
    },
  ];

  return (
    <article
      className="rounded-xl border border-highlight bg-highlight p-5 shadow-sm animate-slide-in"
      style={{ borderLeftWidth: 4, borderLeftColor: "hsl(var(--accent))" }}
      aria-labelledby="alert-title"
    >
      <div className="mb-3 flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-accent" aria-hidden />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-accent">
          Atenção importante
        </span>
      </div>

      <h2 id="alert-title" className="text-lg font-semibold leading-snug text-primary">
        {current.firstName}, vi uma coisa que precisa da sua atenção
      </h2>

      <p className="mt-2 text-[15px] leading-relaxed text-foreground/90">
        Daqui {current.obligationsDays} dias você tem {formatBRL(current.obligationsTotal)} em obrigações
        (DAS, fornecedor e aluguel). No seu ritmo de recebimento, vai faltar{" "}
        <strong className="font-semibold">{formatBRL(current.obligationsShortfall)}</strong>.
      </p>

      <div className="mt-5 flex flex-col gap-2.5">
        {actions.map((a) => (
          <Link
            key={a.id}
            to={`/insights/${a.id}`}
            className={[
              "tap-target group flex items-center justify-between rounded-lg border px-4 py-3 transition-colors",
              a.primary
                ? "border-primary bg-primary text-primary-foreground hover:bg-primary/95"
                : "border-border bg-card text-foreground hover:bg-muted",
            ].join(" ")}
          >
            <div className="text-left">
              <div className="text-[15px] font-semibold">{a.label}</div>
              <div className={["mt-0.5 text-xs", a.primary ? "text-primary-foreground/80" : "text-muted-foreground"].join(" ")}>
                {a.sub}
              </div>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
          </Link>
        ))}
      </div>
    </article>
  );
}

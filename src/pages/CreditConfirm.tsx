import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Loader2 } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";

const steps = [
  { id: 1, label: "Analisando seu perfil financeiro..." },
  { id: 2, label: "Aprovando empréstimo..." },
  { id: 3, label: "Liberando o crédito na blockchain..." },
];

export default function CreditConfirm() {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timers: number[] = [];
    timers.push(window.setTimeout(() => setCurrent(1), 1500));
    timers.push(window.setTimeout(() => setCurrent(2), 3000));
    timers.push(window.setTimeout(() => setCurrent(3), 4500));
    timers.push(window.setTimeout(() => navigate("/credit/success"), 5200));
    return () => timers.forEach(clearTimeout);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title="Confirmação" />

      <main className="container-mobile py-12">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h1 className="text-lg font-semibold text-primary">Estamos preparando seu crédito</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pode levar alguns segundos. Não feche essa tela.
          </p>

          <ul className="mt-6 space-y-4">
            {steps.map((s, i) => {
              const done = i < current;
              const active = i === current;
              return (
                <li key={s.id} className="flex items-start gap-3">
                  <div
                    className={[
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                      done ? "border-success bg-success text-success-foreground" : "",
                      active ? "border-primary text-primary" : "",
                      !done && !active ? "border-border text-muted-foreground" : "",
                    ].join(" ")}
                  >
                    {done ? <Check className="h-4 w-4" /> : active ? <Loader2 className="h-4 w-4 animate-spin" /> : <span className="text-xs">{s.id}</span>}
                  </div>
                  <div className="pt-1.5">
                    <div
                      className={[
                        "text-sm font-medium",
                        done ? "text-success" : active ? "text-foreground" : "text-muted-foreground",
                      ].join(" ")}
                    >
                      {s.label}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </main>
    </div>
  );
}

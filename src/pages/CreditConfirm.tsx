import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AlertCircle, Check, Loader2 } from "lucide-react";

import { useApiClient } from "@/api/ApiClientProvider";
import { ApiError } from "@/api/client";
import { requestCredit, type DisbursedLoan } from "@/api/credit";
import { AppHeader } from "@/components/AppHeader";

const STEPS = [
  "Analisando seu perfil financeiro...",
  "Aprovando empréstimo...",
  "Liberando o crédito na blockchain...",
  "Pronto!",
] as const;

type Status =
  | { kind: "loading"; step: number }
  | { kind: "success"; loan: DisbursedLoan }
  | { kind: "error"; error: ApiError };

export default function CreditConfirm() {
  const navigate = useNavigate();
  const client = useApiClient();
  const [params] = useSearchParams();
  const [status, setStatus] = useState<Status>({ kind: "loading", step: 0 });
  const startedRef = useRef(false);

  const amountReais = Number(params.get("amount") ?? "380");
  const termMonths = Math.max(1, Number(params.get("termMonths") ?? "1"));
  const monthlyRate = Number(params.get("monthlyRate") ?? "0.04");

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const stepTicker = window.setInterval(() => {
      setStatus((s) =>
        s.kind === "loading" && s.step < STEPS.length - 2
          ? { kind: "loading", step: s.step + 1 }
          : s,
      );
    }, 800);

    requestCredit(client, {
      amountCents: Math.round(amountReais * 100),
      termMonths,
      interestRateBps: Math.round(monthlyRate * 10_000),
    })
      .then((loan) => {
        window.clearInterval(stepTicker);
        setStatus({ kind: "success", loan });
      })
      .catch((err) => {
        window.clearInterval(stepTicker);
        const apiError =
          err instanceof ApiError
            ? err
            : new ApiError(0, "unknown_error", String(err));
        setStatus({ kind: "error", error: apiError });
      });

    return () => {
      window.clearInterval(stepTicker);
    };
  }, [client, amountReais, termMonths, monthlyRate]);

  useEffect(() => {
    if (status.kind !== "success") return;
    navigate("/credit/success", {
      replace: true,
      state: { loan: status.loan, amount: amountReais },
    });
  }, [status, navigate, amountReais]);

  if (status.kind === "error") {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader title="Confirmação" showBack />
        <main className="container-mobile py-12">
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-7 w-7 text-destructive" />
            </div>
            <h1 className="mt-4 text-lg font-semibold text-primary">
              Algo deu errado
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {status.error.message ||
                "Não conseguimos processar seu crédito agora."}{" "}
              Pode acontecer com a rede da blockchain — vamos tentar de novo.
            </p>
            <button
              type="button"
              onClick={() => {
                startedRef.current = false;
                setStatus({ kind: "loading", step: 0 });
              }}
              className="tap-target mt-5 w-full rounded-lg bg-primary px-5 py-3 text-[15px] font-semibold text-primary-foreground hover:bg-primary/95"
            >
              Tentar novamente
            </button>
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="tap-target mt-2 w-full rounded-lg border border-border bg-card px-5 py-3 text-[15px] font-semibold text-foreground hover:bg-muted"
            >
              Voltar para o início
            </button>
          </div>
        </main>
      </div>
    );
  }

  const currentStep = status.kind === "loading" ? status.step : STEPS.length - 1;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title="Confirmação" />

      <main className="container-mobile py-12">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h1 className="text-lg font-semibold text-primary">
            Estamos preparando seu crédito
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pode levar alguns segundos. Não feche essa tela.
          </p>

          <ul className="mt-6 space-y-4">
            {STEPS.map((label, i) => {
              const done = i < currentStep;
              const active = i === currentStep;
              return (
                <li key={label} className="flex items-start gap-3">
                  <div
                    className={[
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                      done ? "border-success bg-success text-success-foreground" : "",
                      active ? "border-primary text-primary" : "",
                      !done && !active ? "border-border text-muted-foreground" : "",
                    ].join(" ")}
                  >
                    {done ? (
                      <Check className="h-4 w-4" />
                    ) : active ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <span className="text-xs">{i + 1}</span>
                    )}
                  </div>
                  <div className="pt-1.5">
                    <div
                      className={[
                        "text-sm font-medium",
                        done ? "text-success" : active ? "text-foreground" : "text-muted-foreground",
                      ].join(" ")}
                    >
                      {label}
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

import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Loader2, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";

import { useAuth } from "@/auth/AuthProvider";

export default function Landing() {
  const navigate = useNavigate();
  const { mode, state, login } = useAuth();

  // In web3auth mode, jumping straight to /dashboard the moment Web3Auth
  // reports `authenticated` keeps the post-login UX smooth — the modal
  // closes and the user lands on the persona picker without an extra tap.
  useEffect(() => {
    if (mode === "web3auth" && state.status === "authenticated") {
      navigate("/dashboard", { replace: true });
    }
  }, [mode, state.status, navigate]);

  const isAuthenticating =
    mode === "web3auth" && state.status === "authenticating";
  const errorMessage = state.status === "error" ? state.message : null;

  return (
    <div className="min-h-screen bg-background">
      <header className="container-mobile flex h-14 items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <span className="text-sm font-bold">E</span>
          </div>
          <span className="text-base font-semibold tracking-tight text-primary">EmpowerFI</span>
        </div>
      </header>

      <main className="container-mobile pb-12 pt-8">
        <section className="animate-fade-in">
          <span className="inline-block rounded-full bg-highlight px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent">
            Para quem empreende de verdade
          </span>
          <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-primary sm:text-4xl">
            Crédito justo, organização e uma assistente que olha pelo seu negócio.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            EmpowerFI é a fintech feita para microempreendedoras brasileiras.
            Sem letra miúda, sem cheque especial caro, sem juízo.
          </p>

          {mode === "web3auth" ? (
            <button
              type="button"
              onClick={() => {
                void login();
              }}
              disabled={isAuthenticating}
              className="tap-target mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3.5 text-[15px] font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/95 disabled:opacity-70"
            >
              {isAuthenticating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Conectando...
                </>
              ) : (
                <>
                  Entrar com login social
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          ) : (
            <Link
              to="/dashboard"
              className="tap-target mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3.5 text-[15px] font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/95"
            >
              Entrar com email
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}

          {errorMessage ? (
            <p className="mt-3 text-center text-xs text-destructive">
              {errorMessage}
            </p>
          ) : (
            <p className="mt-3 text-center text-xs text-muted-foreground">
              {mode === "web3auth"
                ? "Login social com Google, Apple, e-mail ou X."
                : "Demo: você entra como Maria, confeiteira em SP."}
            </p>
          )}
        </section>

        <section className="mt-12 grid gap-4">
          {[
            { Icon: Sparkles, title: "IA proativa", desc: "Avisa antes da quebra de fluxo, com soluções concretas." },
            { Icon: TrendingUp, title: "Score gamificado", desc: "Construa reputação financeira com ações reais." },
            { Icon: ShieldCheck, title: "Crédito justo", desc: "4% ao mês, sem surpresas. Lastreado em Tesouro Nacional." },
          ].map(({ Icon, title, desc }) => (
            <div key={title} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-[15px] font-semibold text-foreground">{title}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{desc}</div>
                </div>
              </div>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}

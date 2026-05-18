/**
 * Compact dashboard card surfacing the buyer's active BNPL plans.
 *
 * Hidden when there are zero active plans — the dashboard already shows
 * plenty of cards and the empty state would just be noise. When at least
 * one plan exists, the card highlights the soonest unpaid installment and
 * (in dev mode) exposes a button that POSTs the next installment to the
 * backend — purely a demo affordance so a judge can see the on-chain
 * `InstallmentPaid` event land in the impact dashboard.
 */
import { CalendarClock, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { useApiClient } from "@/api/ApiClientProvider";
import {
  fetchMyBnplPlans,
  recordBnplInstallment,
  type PublicBnplPlan,
} from "@/api/marketplace";
import { friendlyError } from "@/lib/error-copy";
import { formatBRL } from "@/lib/format";

const ONE_DAY_SECONDS = 86_400;
const DEMO_ADMIN_ENABLED =
  import.meta.env.DEV || import.meta.env.VITE_DEMO_ADMIN === "true";

type State =
  | { kind: "loading" }
  | { kind: "ready"; plans: PublicBnplPlan[] }
  | { kind: "error" };

function nextDueDate(plan: PublicBnplPlan): number {
  return (
    plan.firstDueAt + plan.paidInstallments * 30 * ONE_DAY_SECONDS
  );
}

function formatRelativeDue(epochSec: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diffDays = Math.round((epochSec - now) / ONE_DAY_SECONDS);
  if (diffDays > 1) return `em ${diffDays} dias`;
  if (diffDays === 1) return "amanhã";
  if (diffDays === 0) return "hoje";
  if (diffDays === -1) return "vencida ontem";
  return `vencida há ${Math.abs(diffDays)} dias`;
}

export function BnplActivePlansCard() {
  const client = useApiClient();
  const [state, setState] = useState<State>({ kind: "loading" });
  const [recording, setRecording] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const { plans } = await fetchMyBnplPlans(client);
      setState({ kind: "ready", plans });
    } catch {
      setState({ kind: "error" });
    }
  }, [client]);

  useEffect(() => {
    void load();
  }, [load]);

  if (state.kind === "loading") {
    return (
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Carregando seus parcelamentos...
        </div>
      </div>
    );
  }

  // Don't render anything when the buyer has no active plans or when the
  // fetch failed — keeps the dashboard tidy.
  if (state.kind === "error") return null;

  const activePlans = state.plans.filter((p) => p.status === "active");
  if (activePlans.length === 0) return null;

  // Soonest-due first
  const next = [...activePlans].sort(
    (a, b) => nextDueDate(a) - nextDueDate(b),
  )[0];
  if (!next) return null;
  const nextDue = nextDueDate(next);

  const payNextInstallment = async () => {
    setActionError(null);
    setRecording(true);
    try {
      await recordBnplInstallment(client, next.planId, next.paidInstallments);
      await load();
    } catch (err) {
      setActionError(friendlyError(err));
    } finally {
      setRecording(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <CalendarClock className="h-3.5 w-3.5 text-primary" /> Parcelas BNPL
        </div>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
          {activePlans.length} ativo{activePlans.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="mt-3 space-y-1">
        <div className="text-sm font-semibold text-foreground">
          Próxima parcela {formatRelativeDue(nextDue)}
        </div>
        <div className="text-xs text-muted-foreground">
          Parcela {next.paidInstallments + 1}/{next.installmentCount} —{" "}
          {formatBRL(next.installmentCents / 100)}
        </div>
      </div>

      {DEMO_ADMIN_ENABLED ? (
        <div className="mt-3 border-t border-border pt-3">
          <button
            type="button"
            onClick={payNextInstallment}
            disabled={recording}
            className="tap-target w-full rounded-lg border border-primary/40 bg-primary/5 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/10 disabled:opacity-50"
          >
            {recording ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Registrando
                on-chain...
              </span>
            ) : (
              "Demo: pagar próxima parcela"
            )}
          </button>
          {actionError ? (
            <p className="mt-2 text-xs text-destructive">{actionError}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

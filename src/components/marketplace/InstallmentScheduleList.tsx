/**
 * Renders the installment schedule for a BNPL plan as a numbered list with
 * due dates + status. Used on the success page and (later) on the plan
 * detail/dashboard widget.
 */
import { CheckCircle2, Circle } from "lucide-react";
import { formatBRL } from "@/lib/format";

type Props = {
  installmentCount: number;
  installmentCents: number;
  paidInstallments: number;
  /** Unix epoch seconds for installment #0. Subsequent ones are +30d each. */
  firstDueAt: number;
};

const ONE_DAY_SECONDS = 86_400;

function formatDate(epochSec: number): string {
  return new Date(epochSec * 1000).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function InstallmentScheduleList({
  installmentCount,
  installmentCents,
  paidInstallments,
  firstDueAt,
}: Props) {
  const rows = Array.from({ length: installmentCount }, (_, i) => ({
    index: i,
    paid: i < paidInstallments,
    dueAt: firstDueAt + i * 30 * ONE_DAY_SECONDS,
  }));

  return (
    <ol className="space-y-2">
      {rows.map((r) => (
        <li
          key={r.index}
          className={[
            "flex items-center justify-between rounded-lg border p-3 text-sm",
            r.paid
              ? "border-success/30 bg-success/5"
              : "border-border bg-card",
          ].join(" ")}
        >
          <div className="flex items-center gap-3">
            {r.paid ? (
              <CheckCircle2 className="h-5 w-5 text-success" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground" />
            )}
            <div>
              <div className="font-semibold text-foreground">
                Parcela {r.index + 1}/{installmentCount}
              </div>
              <div className="text-xs text-muted-foreground">
                Vence em {formatDate(r.dueAt)}
              </div>
            </div>
          </div>
          <div className="font-semibold text-foreground">
            {formatBRL(installmentCents / 100)}
          </div>
        </li>
      ))}
    </ol>
  );
}

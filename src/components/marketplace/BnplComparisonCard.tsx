/**
 * Side-by-side (sm+) / stacked (mobile) comparison of "à vista" vs the
 * selected BNPL option. Used on `BnplComparePage` so the buyer sees the
 * trade-off in one glance: principal vs total repayable + per-installment.
 */
import { formatBRL } from "@/lib/format";
import type { BnplQuoteOption } from "@/api/marketplace";

type Props = {
  upfrontCents: number;
  selected: BnplQuoteOption;
};

export function BnplComparisonCard({ upfrontCents, selected }: Props) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Side
        label="À vista"
        bigAmount={formatBRL(upfrontCents / 100)}
        helper="Pagamento único, agora"
      />
      <Side
        label={`Parcelado em ${selected.installmentCount}x`}
        bigAmount={`${selected.installmentCount}x ${formatBRL(
          selected.installmentCents / 100,
        )}`}
        helper={`Total: ${formatBRL(selected.totalRepayableCents / 100)}`}
        accent
      />
    </div>
  );
}

type SideProps = {
  label: string;
  bigAmount: string;
  helper: string;
  accent?: boolean;
};

function Side({ label, bigAmount, helper, accent }: SideProps) {
  return (
    <div
      className={[
        "rounded-xl border p-4 shadow-sm",
        accent ? "border-primary/30 bg-primary/5" : "border-border bg-card",
      ].join(" ")}
    >
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div
        className={[
          "mt-2 font-semibold",
          accent ? "text-xl text-primary" : "text-xl text-foreground",
        ].join(" ")}
      >
        {bigAmount}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">{helper}</div>
    </div>
  );
}

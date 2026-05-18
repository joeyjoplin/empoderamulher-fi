/**
 * Reassurance badge shown on the supplier-side (`CobrarPage`) when the
 * payment was a BNPL hire: makes it clear the supplier was paid the full
 * amount upfront — the installment risk sits with EmpowerFI's pool, not them.
 */
import { Zap } from "lucide-react";
import { formatBRL } from "@/lib/format";

type Props = {
  amountCents: number;
};

export function SupplierUpfrontBadge({ amountCents }: Props) {
  return (
    <div className="rounded-xl border border-success/30 bg-success/5 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-success/15 text-success">
          <Zap className="h-5 w-5" />
        </div>
        <div>
          <div className="text-[15px] font-semibold text-foreground">
            Você recebeu {formatBRL(amountCents / 100)} à vista
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            A compradora pagará em parcelas para a EmpowerFI. Você já foi paga
            integralmente.
          </p>
        </div>
      </div>
    </div>
  );
}

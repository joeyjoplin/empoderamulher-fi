/**
 * Two-button toggle for "à vista" (direct pay) vs "parcelado" (BNPL). Vertical
 * stack on mobile, side-by-side from sm+ — keeps the tap targets comfortable
 * at 380px without losing the comparison framing on bigger screens.
 */
export type PaymentMode = "direct" | "bnpl";

type Props = {
  value: PaymentMode;
  onChange: (mode: PaymentMode) => void;
  /** Optional hint shown under "Parcelado" when BNPL is unavailable. */
  bnplDisabledReason?: string;
};

export function PaymentModeToggle({ value, onChange, bnplDisabledReason }: Props) {
  const bnplDisabled = Boolean(bnplDisabledReason);
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <Option
        active={value === "direct"}
        onClick={() => onChange("direct")}
        title="À vista"
        subtitle="Pagamento imediato, registrado on-chain"
      />
      <Option
        active={value === "bnpl"}
        onClick={() => !bnplDisabled && onChange("bnpl")}
        disabled={bnplDisabled}
        title="Parcelado"
        subtitle={bnplDisabledReason ?? "Receba à vista, pague em parcelas"}
      />
    </div>
  );
}

type OptionProps = {
  active: boolean;
  onClick: () => void;
  title: string;
  subtitle: string;
  disabled?: boolean;
};

function Option({ active, onClick, title, subtitle, disabled }: OptionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={[
        "tap-target rounded-xl border-2 p-4 text-left transition",
        active
          ? "border-primary bg-primary/5"
          : "border-border bg-card hover:border-primary/40",
        disabled ? "cursor-not-allowed opacity-50" : "",
      ].join(" ")}
    >
      <div className="text-[15px] font-semibold text-foreground">{title}</div>
      <div className="mt-1 text-xs text-muted-foreground">{subtitle}</div>
    </button>
  );
}

/**
 * `/marketplace/parcelado/sucesso` — confirmation screen for a BNPL hire.
 * Shows both Solana signatures (createPlan + paySupplier), the upfront badge
 * (the supplier was paid in full), and the installment schedule.
 */
import { motion } from "framer-motion";
import { CheckCircle2, ExternalLink } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

import { AppHeader } from "@/components/AppHeader";
import { InstallmentScheduleList } from "@/components/marketplace/InstallmentScheduleList";
import { SupplierUpfrontBadge } from "@/components/marketplace/SupplierUpfrontBadge";
import type { CompletedBnplHire } from "@/api/marketplace";

type LocationState = {
  merchantName?: string;
  hire?: CompletedBnplHire;
};

function shortenSig(sig: string): string {
  if (sig.length <= 14) return sig;
  return `${sig.slice(0, 8)}…${sig.slice(-4)}`;
}

function explorerUrl(signature: string): string {
  return `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
}

export default function BnplSucessoPage() {
  const location = useLocation();
  const state = (location.state as LocationState) ?? {};
  const merchantName = state.merchantName ?? "vendedora";
  const hire = state.hire;

  if (!hire) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader title="Parcelado" showBack />
        <main className="container-mobile py-10 text-center">
          <p className="text-sm text-muted-foreground">
            Dados da transação não disponíveis.
          </p>
          <Link
            to="/marketplace"
            className="mt-4 inline-block text-sm font-semibold text-primary"
          >
            Voltar para o marketplace
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-12">
      <AppHeader title="Plano BNPL criado" showBack />
      <main className="container-mobile space-y-5 py-8">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <motion.div
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/15"
          >
            <CheckCircle2 className="h-10 w-10 text-success" />
          </motion.div>
          <h1 className="mt-4 text-xl font-bold text-primary">
            Plano de parcelamento criado! 🎉
          </h1>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            {merchantName} já recebeu o valor à vista. Você pagará em{" "}
            {hire.installmentCount} parcelas.
          </p>
        </motion.div>

        <SupplierUpfrontBadge amountCents={hire.principalCents} />

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">
            Suas parcelas
          </h2>
          <InstallmentScheduleList
            installmentCount={hire.installmentCount}
            installmentCents={hire.installmentCents}
            paidInstallments={0}
            firstDueAt={hire.firstDueAt}
          />
        </section>

        <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Hashes on-chain
          </div>
          <SignatureRow
            label="Pagamento ao fornecedor"
            signature={hire.signatures.paySupplier}
          />
          <SignatureRow
            label="Abertura do plano"
            signature={hire.signatures.createPlan}
          />
        </section>

        <div className="space-y-2 pt-2">
          <Link
            to="/dashboard"
            className="tap-target block w-full rounded-lg bg-primary px-5 py-3.5 text-center text-[15px] font-semibold text-primary-foreground hover:bg-primary/95"
          >
            Voltar para o início
          </Link>
          <Link
            to="/impacto"
            className="tap-target block w-full rounded-lg border border-border bg-card px-5 py-3.5 text-center text-[15px] font-semibold text-foreground hover:bg-muted"
          >
            Ver dashboard de impacto
          </Link>
        </div>
      </main>
    </div>
  );
}

function SignatureRow({ label, signature }: { label: string; signature: string }) {
  return (
    <div className="mt-2 border-t border-border pt-2 first:mt-0 first:border-t-0 first:pt-0">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-sm text-foreground break-all">
        {shortenSig(signature)}
      </div>
      <a
        href={explorerUrl(signature)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
      >
        Ver no Solana Explorer <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );
}

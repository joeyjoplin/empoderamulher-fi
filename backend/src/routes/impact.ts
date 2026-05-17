/**
 * `GET /api/impact/dashboard` — aggregate impact view used by the
 * `/impacto` page in the consumer app.
 *
 * Mocked aggregate metrics (entrepreneurs, debts renegotiated, pool size)
 * come from `data/impact_mock.ts`. The "real on-chain transactions" list
 * is sourced from the `impact_events` table populated by the indexer
 * worker — that's the part the demo highlights as auditable.
 */

import { Hono } from "hono";

import { IMPACT_MOCK } from "../data/impact_mock.js";
import type { ImpactEvent, ImpactRepository } from "../services/impact.js";

const RECENT_TX_LIMIT = 5;
const RECENT_TX_FETCH = 30;

export type ImpactTransactionType =
  | "loan_disbursed"
  | "marketplace_payment"
  | "marketplace_bnpl_supplier_paid"
  | "marketplace_bnpl_installment_paid"
  | "marketplace_bnpl_completed";

export type ImpactTransaction = {
  /** Stable composite key — `<signature>:<eventIndex>`. */
  id: string;
  type: ImpactTransactionType;
  description: string;
  /**
   * Cents for events that carry a monetary value (loan amount, supplier
   * payment, total repaid). `null` for `InstallmentPaid`, which only records
   * a progress counter on-chain.
   */
  amountCents: number | null;
  signature: string;
  /** ISO-8601 string when the chain reported a block time, null otherwise. */
  blockTime: string | null;
};

export type ImpactDashboardResponse = {
  metrics: {
    activeEntrepreneurs: number;
    interestSavedCents: number;
    debtsRenegotiatedCents: number;
    marketplaceTransactions: number;
    monthOverMonth: typeof IMPACT_MOCK.monthOverMonth;
    poolTotalCents: number;
    yieldDistributedCents: number;
    qualifiedInvestors: number;
    cityDistribution: typeof IMPACT_MOCK.cityDistribution;
  };
  recentTransactions: ImpactTransaction[];
};

export function impactRoute(deps: { impacts: ImpactRepository }) {
  const app = new Hono();

  app.get("/dashboard", async (c) => {
    const events = await deps.impacts.recentEvents(RECENT_TX_FETCH);
    const projected = events
      .map(toTransaction)
      .filter((t): t is ImpactTransaction => t !== null)
      .slice(0, RECENT_TX_LIMIT);

    const body: ImpactDashboardResponse = {
      metrics: {
        activeEntrepreneurs: IMPACT_MOCK.activeEntrepreneurs,
        interestSavedCents: IMPACT_MOCK.interestSavedCents,
        debtsRenegotiatedCents: IMPACT_MOCK.debtsRenegotiatedCents,
        marketplaceTransactions:
          IMPACT_MOCK.marketplaceTransactionsBaseline +
          countPaymentCompleted(events),
        monthOverMonth: IMPACT_MOCK.monthOverMonth,
        poolTotalCents: IMPACT_MOCK.poolTotalCents,
        yieldDistributedCents: IMPACT_MOCK.yieldDistributedCents,
        qualifiedInvestors: IMPACT_MOCK.qualifiedInvestors,
        cityDistribution: IMPACT_MOCK.cityDistribution,
      },
      recentTransactions: projected,
    };
    return c.json({ data: body });
  });

  return app;
}

function toTransaction(event: ImpactEvent): ImpactTransaction | null {
  if (
    event.programName === "loan_origination" &&
    event.eventName === "LoanRequested"
  ) {
    const amountCents = readU64(event.payload, "amount");
    if (amountCents === null) return null;
    return {
      id: `${event.signature}:${event.eventIndex}`,
      type: "loan_disbursed",
      description: `Empréstimo de ${formatBRL(amountCents)} concedido on-chain`,
      amountCents,
      signature: event.signature,
      blockTime: event.blockTime?.toISOString() ?? null,
    };
  }
  if (
    event.programName === "marketplace" &&
    event.eventName === "PaymentCompleted"
  ) {
    const amountCents = readU64(event.payload, "amount");
    if (amountCents === null) return null;
    const isBnpl = event.payload.bnpl === true;
    return {
      id: `${event.signature}:${event.eventIndex}`,
      type: isBnpl ? "marketplace_bnpl_supplier_paid" : "marketplace_payment",
      description: isBnpl
        ? `Fornecedor recebeu ${formatBRL(amountCents)} à vista (BNPL)`
        : `Pagamento de ${formatBRL(amountCents)} no marketplace`,
      amountCents,
      signature: event.signature,
      blockTime: event.blockTime?.toISOString() ?? null,
    };
  }
  if (
    event.programName === "marketplace" &&
    event.eventName === "InstallmentPaid"
  ) {
    const paid = readU64(event.payload, "paid_installments");
    const total = readU64(event.payload, "installment_count");
    if (paid === null || total === null) return null;
    return {
      id: `${event.signature}:${event.eventIndex}`,
      type: "marketplace_bnpl_installment_paid",
      description: `Parcela ${paid}/${total} registrada on-chain`,
      amountCents: null,
      signature: event.signature,
      blockTime: event.blockTime?.toISOString() ?? null,
    };
  }
  if (
    event.programName === "marketplace" &&
    event.eventName === "BnplPlanCompleted"
  ) {
    const totalRepaid = readU64(event.payload, "total_repaid");
    if (totalRepaid === null) return null;
    return {
      id: `${event.signature}:${event.eventIndex}`,
      type: "marketplace_bnpl_completed",
      description: `Plano BNPL quitado: ${formatBRL(totalRepaid)}`,
      amountCents: totalRepaid,
      signature: event.signature,
      blockTime: event.blockTime?.toISOString() ?? null,
    };
  }
  return null;
}

/**
 * Count of `PaymentCompleted` events captured by the indexer — drives the
 * headline `marketplaceTransactions` metric. Direct-pay AND BNPL hires both
 * emit one `PaymentCompleted` for the supplier-upfront leg, so this counts
 * them uniformly. `InstallmentPaid` is deliberately excluded so a single
 * 4-installment plan doesn't appear as 4 separate marketplace transactions.
 */
function countPaymentCompleted(events: ImpactEvent[]): number {
  return events.filter(
    (e) => e.programName === "marketplace" && e.eventName === "PaymentCompleted",
  ).length;
}

/**
 * BorshEventCoder leaves u64 as a BN-shaped object after JSON round-trip;
 * stringified bigints are also possible if a payload was mutated en route.
 * Read either form, return null when absent or unparseable.
 */
function readU64(
  payload: Record<string, unknown>,
  key: string,
): number | null {
  const raw = payload[key];
  if (raw === undefined || raw === null) return null;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string") {
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }
  if (typeof raw === "object" && "toString" in raw) {
    const n = Number((raw as { toString: () => string }).toString());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function formatBRL(cents: number): string {
  const reais = cents / 100;
  return reais.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

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

export type ImpactTransactionType = "loan_disbursed" | "marketplace_payment";

export type ImpactTransaction = {
  /** Stable composite key — `<signature>:<eventIndex>`. */
  id: string;
  type: ImpactTransactionType;
  description: string;
  amountCents: number;
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
          countByType(events, "marketplace_payment"),
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
    return {
      id: `${event.signature}:${event.eventIndex}`,
      type: "marketplace_payment",
      description: `Pagamento de ${formatBRL(amountCents)} no marketplace`,
      amountCents,
      signature: event.signature,
      blockTime: event.blockTime?.toISOString() ?? null,
    };
  }
  return null;
}

function countByType(
  events: ImpactEvent[],
  type: ImpactTransactionType,
): number {
  if (type === "marketplace_payment") {
    return events.filter(
      (e) =>
        e.programName === "marketplace" && e.eventName === "PaymentCompleted",
    ).length;
  }
  return events.filter(
    (e) =>
      e.programName === "loan_origination" && e.eventName === "LoanRequested",
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

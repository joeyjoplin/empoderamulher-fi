import { describe, expect, it, vi } from "vitest";

import { createApp } from "../src/app.js";
import { IMPACT_MOCK } from "../src/data/impact_mock.js";
import type { ImpactDashboardResponse } from "../src/routes/impact.js";
import type { ImpactEvent } from "../src/services/impact.js";
import { InMemoryImpactRepository } from "../src/services/impact.js";
import { InMemoryPersonaService } from "../src/services/persona.js";

type DataBody<T> = { data: T };

function buildApp(events: ImpactEvent[] = []) {
  return createApp({
    personaService: new InMemoryPersonaService([]),
    insightsService: { getProactiveAlert: vi.fn() },
    loanService: { requestAndDisburse: vi.fn() },
    loanRepository: { save: vi.fn() },
    scoreService: {
      fetchOnChainForPersona: vi.fn(),
      attestForPersona: vi.fn(),
    },
    publicScoreService: { lookupByCnpj: vi.fn() },
    publicScoreApiKeys: [],
    marketplaceService: { hireProvider: vi.fn() },
    marketplaceRepository: { save: vi.fn(), countHiresByBuyer: vi.fn() },
    impactRepository: new InMemoryImpactRepository(events),
    chatService: { sendMessage: vi.fn() },
    authMode: "mock",
  });
}

describe("GET /api/impact/dashboard", () => {
  it("returns the mocked metric envelope with an empty tx list when the indexer has no rows", async () => {
    const app = buildApp([]);
    const res = await app.request("/api/impact/dashboard");
    expect(res.status).toBe(200);
    const body = (await res.json()) as DataBody<ImpactDashboardResponse>;
    expect(body.data.metrics.activeEntrepreneurs).toBe(
      IMPACT_MOCK.activeEntrepreneurs,
    );
    expect(body.data.metrics.poolTotalCents).toBe(IMPACT_MOCK.poolTotalCents);
    // The marketplace counter starts at the baseline when the indexer is
    // empty, then gets bumped by the count of `PaymentCompleted` events
    // already captured on devnet.
    expect(body.data.metrics.marketplaceTransactions).toBe(
      IMPACT_MOCK.marketplaceTransactionsBaseline,
    );
    expect(body.data.recentTransactions).toEqual([]);
  });

  it("projects LoanRequested + PaymentCompleted events into the public tx shape, newest first", async () => {
    const olderTime = new Date("2026-05-12T10:00:00Z");
    const newerTime = new Date("2026-05-12T12:00:00Z");
    const app = buildApp([
      {
        programName: "loan_origination",
        eventName: "LoanRequested",
        signature: "SigLoanA",
        eventIndex: 0,
        blockTime: olderTime,
        payload: {
          borrower: "BorrowerPubkey",
          loan_id: "1",
          amount: 38000,
          total_due: 39520,
          term_months: 1,
        },
      },
      {
        programName: "marketplace",
        eventName: "PaymentCompleted",
        signature: "SigPay",
        eventIndex: 0,
        blockTime: newerTime,
        payload: {
          request: "RequestPda",
          from: "BuyerPubkey",
          to: "ProviderPubkey",
          amount: 8000,
        },
      },
      // Irrelevant event types must be dropped from the projection.
      {
        programName: "marketplace",
        eventName: "PaymentRequestCreated",
        signature: "SigCreate",
        eventIndex: 0,
        blockTime: newerTime,
        payload: { request: "RequestPda", amount: 8000 },
      },
    ]);

    const res = await app.request("/api/impact/dashboard");
    expect(res.status).toBe(200);
    const body = (await res.json()) as DataBody<ImpactDashboardResponse>;
    expect(body.data.recentTransactions).toHaveLength(2);
    expect(body.data.recentTransactions[0]).toMatchObject({
      type: "marketplace_payment",
      amountCents: 8000,
      signature: "SigPay",
      id: "SigPay:0",
      blockTime: newerTime.toISOString(),
    });
    expect(body.data.recentTransactions[1]).toMatchObject({
      type: "loan_disbursed",
      amountCents: 38000,
      signature: "SigLoanA",
    });
    // marketplace counter = baseline + 1 (the single PaymentCompleted)
    expect(body.data.metrics.marketplaceTransactions).toBe(
      IMPACT_MOCK.marketplaceTransactionsBaseline + 1,
    );
  });

  it("caps recentTransactions at 5 even when the indexer returns more", async () => {
    const events: ImpactEvent[] = Array.from({ length: 8 }, (_, i) => ({
      programName: "marketplace",
      eventName: "PaymentCompleted",
      signature: `Sig${i}`,
      eventIndex: 0,
      blockTime: new Date(`2026-05-12T${String(10 + i).padStart(2, "0")}:00:00Z`),
      payload: { amount: 1000 + i },
    }));
    const app = buildApp(events);
    const res = await app.request("/api/impact/dashboard");
    const body = (await res.json()) as DataBody<ImpactDashboardResponse>;
    expect(body.data.recentTransactions).toHaveLength(5);
    // Newest first → Sig7, Sig6, …
    expect(body.data.recentTransactions[0]?.signature).toBe("Sig7");
  });

  it("skips events whose payload is missing the amount field instead of crashing", async () => {
    const app = buildApp([
      {
        programName: "loan_origination",
        eventName: "LoanRequested",
        signature: "SigBad",
        eventIndex: 0,
        blockTime: new Date("2026-05-12T10:00:00Z"),
        payload: { borrower: "X", loan_id: "1" },
      },
    ]);
    const res = await app.request("/api/impact/dashboard");
    expect(res.status).toBe(200);
    const body = (await res.json()) as DataBody<ImpactDashboardResponse>;
    expect(body.data.recentTransactions).toEqual([]);
  });
});

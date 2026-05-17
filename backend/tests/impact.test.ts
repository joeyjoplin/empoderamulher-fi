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
    marketplaceService: { hireProvider: vi.fn(), quoteBnpl: vi.fn(), hireBnpl: vi.fn(), recordInstallment: vi.fn() },
      bnplEligibility: { evaluate: vi.fn() },
    marketplaceRepository: { save: vi.fn(), countHiresByBuyer: vi.fn(), saveBnplPlan: vi.fn(), findBnplPlanById: vi.fn(), updateBnplPlan: vi.fn(), listBnplPlansByBuyer: vi.fn().mockResolvedValue([]) },
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

  it("projects PaymentCompleted with bnpl=true into marketplace_bnpl_supplier_paid", async () => {
    const blockTime = new Date("2026-05-17T10:00:00Z");
    const app = buildApp([
      {
        programName: "marketplace",
        eventName: "PaymentCompleted",
        signature: "SigSupplierUpfront",
        eventIndex: 0,
        blockTime,
        payload: {
          request: "RequestPda",
          from: "BuyerPubkey",
          to: "SupplierPubkey",
          amount: 20_000,
          bnpl: true,
        },
      },
    ]);
    const res = await app.request("/api/impact/dashboard");
    const body = (await res.json()) as DataBody<ImpactDashboardResponse>;
    expect(body.data.recentTransactions).toHaveLength(1);
    expect(body.data.recentTransactions[0]).toMatchObject({
      type: "marketplace_bnpl_supplier_paid",
      amountCents: 20_000,
      signature: "SigSupplierUpfront",
    });
    expect(body.data.recentTransactions[0]?.description).toContain("BNPL");
  });

  it("projects InstallmentPaid into marketplace_bnpl_installment_paid with null amount", async () => {
    const app = buildApp([
      {
        programName: "marketplace",
        eventName: "InstallmentPaid",
        signature: "SigInstall1",
        eventIndex: 0,
        blockTime: new Date("2026-05-17T12:00:00Z"),
        payload: {
          plan: "PlanPda",
          installment_index: 0,
          paid_installments: 1,
          installment_count: 2,
        },
      },
    ]);
    const res = await app.request("/api/impact/dashboard");
    const body = (await res.json()) as DataBody<ImpactDashboardResponse>;
    expect(body.data.recentTransactions).toHaveLength(1);
    expect(body.data.recentTransactions[0]).toMatchObject({
      type: "marketplace_bnpl_installment_paid",
      amountCents: null,
      signature: "SigInstall1",
    });
    expect(body.data.recentTransactions[0]?.description).toContain("1/2");
  });

  it("projects BnplPlanCompleted with total_repaid into marketplace_bnpl_completed", async () => {
    const app = buildApp([
      {
        programName: "marketplace",
        eventName: "BnplPlanCompleted",
        signature: "SigPlanDone",
        eventIndex: 0,
        blockTime: new Date("2026-05-17T15:00:00Z"),
        payload: { plan: "PlanPda", total_repaid: 21_600 },
      },
    ]);
    const res = await app.request("/api/impact/dashboard");
    const body = (await res.json()) as DataBody<ImpactDashboardResponse>;
    expect(body.data.recentTransactions[0]).toMatchObject({
      type: "marketplace_bnpl_completed",
      amountCents: 21_600,
    });
  });

  it("does NOT bump marketplaceTransactions for InstallmentPaid events", async () => {
    // One supplier-upfront PaymentCompleted (counts) + four InstallmentPaid
    // (must NOT count) — counter increments by 1, not 5.
    const events: ImpactEvent[] = [
      {
        programName: "marketplace",
        eventName: "PaymentCompleted",
        signature: "SigSupplierUpfront",
        eventIndex: 0,
        blockTime: new Date("2026-05-17T10:00:00Z"),
        payload: { amount: 20_000, bnpl: true },
      },
      ...Array.from({ length: 4 }, (_, i) => ({
        programName: "marketplace",
        eventName: "InstallmentPaid",
        signature: `SigInstall${i}`,
        eventIndex: 0,
        blockTime: new Date(`2026-05-17T${11 + i}:00:00Z`),
        payload: {
          plan: "PlanPda",
          installment_index: i,
          paid_installments: i + 1,
          installment_count: 4,
        },
      })),
    ];
    const app = buildApp(events);
    const res = await app.request("/api/impact/dashboard");
    const body = (await res.json()) as DataBody<ImpactDashboardResponse>;
    expect(body.data.metrics.marketplaceTransactions).toBe(
      IMPACT_MOCK.marketplaceTransactionsBaseline + 1,
    );
  });
});

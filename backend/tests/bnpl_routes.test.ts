import { describe, expect, it, vi } from "vitest";

import { createApp } from "../src/app.js";
import type { BnplEligibilityService } from "../src/services/bnpl_eligibility.js";
import type { InsightsService } from "../src/services/insights.js";
import type { LoanRepository, LoanService } from "../src/services/loans.js";
import {
  MarketplaceServiceError,
  type BnplQuote,
  type CompletedBnplHire,
  type MarketplaceRepository,
  type MarketplaceService,
  type RecordedInstallment,
} from "../src/services/marketplace.js";
import { InMemoryPersonaService } from "../src/services/persona.js";
import type { Persona } from "../src/types/domain.js";
import {
  makeMarketplaceRepoStub,
  makeMarketplaceStub,
} from "./fixtures/marketplace_stubs.js";

type ErrorBody = { error: { code: string; message?: string } };
type DataBody<T> = { data: T };

const MARIA: Persona = {
  id: "0e6c7f0b-7c3a-5f3a-9c4f-1f5b4d2e6a11",
  name: "Maria Silva",
  businessType: "confeiteira",
  city: "São Paulo",
  monthlyRevenueAvg: "4500.00",
  stage: 2,
  walletPubkey: "BcZmHLn41QZcvEvnmQkbqYz1Jo6iRdy4U3Y8BcwaCZNX",
  cnpjDigits: null,
};

const ANA: Persona = {
  id: "1f7d8e1c-8d4b-6e4b-0d5f-2e6c5d3f7b22",
  name: "Ana Souza",
  businessType: "marmiteira",
  city: "Belo Horizonte",
  monthlyRevenueAvg: "3200.00",
  stage: 1,
  walletPubkey: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  cnpjDigits: null,
};

function buildApp(overrides: {
  marketplace: MarketplaceService;
  marketplaceRepo?: MarketplaceRepository;
  bnplEligibility?: BnplEligibilityService;
}) {
  const insights: InsightsService = { getProactiveAlert: vi.fn() };
  const loans: LoanService = { requestAndDisburse: vi.fn() };
  const loanRepo: LoanRepository = { save: vi.fn() };
  const repo = overrides.marketplaceRepo ?? makeMarketplaceRepoStub();
  return createApp({
    personaService: new InMemoryPersonaService([MARIA, ANA]),
    insightsService: insights,
    loanService: loans,
    loanRepository: loanRepo,
    marketplaceService: overrides.marketplace,
    marketplaceRepository: repo,
    bnplEligibility: overrides.bnplEligibility ?? { evaluate: vi.fn() },
    scoreService: {
      fetchOnChainForPersona: vi.fn(),
      attestForPersona: vi.fn(),
    },
    publicScoreService: { lookupByCnpj: vi.fn() },
    publicScoreApiKeys: [],
    impactRepository: { recentEvents: vi.fn().mockResolvedValue([]) },
    chatService: { sendMessage: vi.fn() },
    authMode: "mock",
  });
}

describe("POST /marketplace/bnpl/quote", () => {
  it("returns the orchestrator's quote envelope", async () => {
    const quote: BnplQuote = {
      tier: "B",
      upfrontCents: 20_000,
      maxInstallmentCount: 3,
      options: [
        {
          installmentCount: 2,
          installmentCents: 10_800,
          totalRepayableCents: 21_600,
          interestRateBps: 400,
        },
        {
          installmentCount: 3,
          installmentCents: 7_600,
          totalRepayableCents: 22_400,
          interestRateBps: 400,
        },
      ],
    };
    const quoteBnpl = vi.fn().mockResolvedValue(quote);
    const app = buildApp({
      marketplace: makeMarketplaceStub({ quoteBnpl }),
    });

    const res = await app.request("/marketplace/bnpl/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Persona-Id": MARIA.id },
      body: JSON.stringify({ providerPersonaId: ANA.id, principalCents: 20_000 }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as DataBody<BnplQuote>;
    expect(body.data).toEqual(quote);
    expect(quoteBnpl).toHaveBeenCalledWith({
      buyerPersonaId: MARIA.id,
      providerPersonaId: ANA.id,
      principalCents: 20_000,
    });
  });

  it("rejects self-hire with 409", async () => {
    const app = buildApp({ marketplace: makeMarketplaceStub() });
    const res = await app.request("/marketplace/bnpl/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Persona-Id": MARIA.id },
      body: JSON.stringify({ providerPersonaId: MARIA.id, principalCents: 20_000 }),
    });
    expect(res.status).toBe(409);
    const body = (await res.json()) as ErrorBody;
    expect(body.error.code).toBe("self_hire_forbidden");
  });

  it("maps no_score_on_chain to 409", async () => {
    const quoteBnpl = vi
      .fn()
      .mockRejectedValue(
        new MarketplaceServiceError("no_score_on_chain", "no score yet"),
      );
    const app = buildApp({ marketplace: makeMarketplaceStub({ quoteBnpl }) });
    const res = await app.request("/marketplace/bnpl/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Persona-Id": MARIA.id },
      body: JSON.stringify({ providerPersonaId: ANA.id, principalCents: 20_000 }),
    });
    expect(res.status).toBe(409);
    const body = (await res.json()) as ErrorBody;
    expect(body.error.code).toBe("no_score_on_chain");
  });
});

describe("POST /marketplace/bnpl/hire", () => {
  const futureSec = Math.floor(Date.now() / 1000) + 86_400 * 30;

  it("returns the completed BNPL hire envelope on the happy path", async () => {
    const completed: CompletedBnplHire = {
      planId: "PlanPda111",
      requestAddress: "RequestPda111",
      nonce: "1",
      status: "active",
      signatures: { createPlan: "sigCreate", paySupplier: "sigPay" },
      principalCents: 20_000,
      totalRepayableCents: 21_600,
      installmentCount: 2,
      installmentCents: 10_800,
      interestRateBps: 400,
      category: "supplies",
      firstDueAt: futureSec,
      buyerPubkey: "BuyerPub",
      providerPubkey: "ProviderPub",
    };
    const hireBnpl = vi.fn().mockResolvedValue(completed);
    const app = buildApp({ marketplace: makeMarketplaceStub({ hireBnpl }) });

    const res = await app.request("/marketplace/bnpl/hire", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Persona-Id": MARIA.id },
      body: JSON.stringify({
        providerPersonaId: ANA.id,
        principalCents: 20_000,
        installmentCount: 2,
        category: "supplies",
        memo: "Insumos atelier",
        firstDueAt: futureSec,
      }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as DataBody<CompletedBnplHire>;
    expect(body.data).toEqual(completed);
  });

  it("rejects installmentCount=1 with 422 (must be >=2)", async () => {
    const app = buildApp({ marketplace: makeMarketplaceStub() });
    const res = await app.request("/marketplace/bnpl/hire", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Persona-Id": MARIA.id },
      body: JSON.stringify({
        providerPersonaId: ANA.id,
        principalCents: 20_000,
        installmentCount: 1,
        category: "supplies",
        memo: "x",
        firstDueAt: futureSec,
      }),
    });
    expect(res.status).toBe(422);
    const body = (await res.json()) as ErrorBody;
    expect(body.error.code).toBe("invalid_input");
  });

  it("maps first_due_in_past to 409", async () => {
    const hireBnpl = vi
      .fn()
      .mockRejectedValue(
        new MarketplaceServiceError("first_due_in_past", "must be future"),
      );
    const app = buildApp({ marketplace: makeMarketplaceStub({ hireBnpl }) });
    const res = await app.request("/marketplace/bnpl/hire", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Persona-Id": MARIA.id },
      body: JSON.stringify({
        providerPersonaId: ANA.id,
        principalCents: 20_000,
        installmentCount: 2,
        category: "supplies",
        memo: "x",
        firstDueAt: futureSec,
      }),
    });
    expect(res.status).toBe(409);
    const body = (await res.json()) as ErrorBody;
    expect(body.error.code).toBe("first_due_in_past");
  });
});

describe("POST /marketplace/bnpl/:planId/installment", () => {
  it("delegates to the service and returns the recorded envelope", async () => {
    const recorded: RecordedInstallment = {
      planId: "PlanPda111",
      installmentIndex: 0,
      paidInstallments: 1,
      installmentCount: 2,
      status: "active",
      signature: "sigInstallment0",
    };
    const recordInstallment = vi.fn().mockResolvedValue(recorded);
    const app = buildApp({
      marketplace: makeMarketplaceStub({ recordInstallment }),
    });
    const res = await app.request("/marketplace/bnpl/PlanPda111/installment", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Persona-Id": MARIA.id },
      body: JSON.stringify({ installmentIndex: 0 }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as DataBody<RecordedInstallment>;
    expect(body.data).toEqual(recorded);
    expect(recordInstallment).toHaveBeenCalledWith({
      buyerPersonaId: MARIA.id,
      planId: "PlanPda111",
      installmentIndex: 0,
    });
  });

  it("maps bnpl_plan_not_found to 404", async () => {
    const recordInstallment = vi
      .fn()
      .mockRejectedValue(
        new MarketplaceServiceError("bnpl_plan_not_found", "missing"),
      );
    const app = buildApp({
      marketplace: makeMarketplaceStub({ recordInstallment }),
    });
    const res = await app.request("/marketplace/bnpl/UnknownPlan/installment", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Persona-Id": MARIA.id },
      body: JSON.stringify({ installmentIndex: 0 }),
    });
    expect(res.status).toBe(404);
    const body = (await res.json()) as ErrorBody;
    expect(body.error.code).toBe("bnpl_plan_not_found");
  });

  it("maps invalid_installment_order to 409", async () => {
    const recordInstallment = vi
      .fn()
      .mockRejectedValue(
        new MarketplaceServiceError("invalid_installment_order", "out of order"),
      );
    const app = buildApp({
      marketplace: makeMarketplaceStub({ recordInstallment }),
    });
    const res = await app.request("/marketplace/bnpl/PlanPda111/installment", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Persona-Id": MARIA.id },
      body: JSON.stringify({ installmentIndex: 3 }),
    });
    expect(res.status).toBe(409);
    const body = (await res.json()) as ErrorBody;
    expect(body.error.code).toBe("invalid_installment_order");
  });
});

describe("GET /marketplace/me/bnpl", () => {
  it("returns the buyer's BNPL plans without buyerSecretKey", async () => {
    const plans = [
      {
        planId: "PlanPda111",
        requestAddress: "RequestPda111",
        buyerPersonaId: MARIA.id,
        providerPersonaId: ANA.id,
        buyerPubkey: "BuyerPub",
        providerPubkey: "ProviderPub",
        nonce: "1",
        principalCents: 20_000,
        totalRepayableCents: 21_600,
        installmentCount: 2,
        installmentCents: 10_800,
        interestRateBps: 400,
        paidInstallments: 1,
        status: "active" as const,
        category: "supplies" as const,
        firstDueAt: 1_800_000_000,
        memo: "Insumos atelier",
        createdAt: new Date("2026-05-17T00:00:00Z"),
        signatures: {
          createPlan: "sigCreate",
          paySupplier: "sigPay",
          installments: ["sigInstall0"],
        },
      },
    ];
    const listBnplPlansByBuyer = vi.fn().mockResolvedValue(plans);
    const repo = makeMarketplaceRepoStub({ listBnplPlansByBuyer });
    const app = buildApp({
      marketplace: makeMarketplaceStub(),
      marketplaceRepo: repo,
    });
    const res = await app.request("/marketplace/me/bnpl", {
      headers: { "X-Persona-Id": MARIA.id },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as DataBody<{ plans: unknown[] }>;
    expect(body.data.plans).toHaveLength(1);
    expect(listBnplPlansByBuyer).toHaveBeenCalledWith(MARIA.id);
    // buyerSecretKey must never leak via the route surface.
    expect(JSON.stringify(body.data)).not.toContain("buyerSecretKey");
  });
});

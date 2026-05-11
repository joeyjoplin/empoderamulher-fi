import { describe, expect, it, vi } from "vitest";

import { createApp } from "../src/app.js";
import type { InsightsService } from "../src/services/insights.js";
import type { LoanRepository, LoanService } from "../src/services/loans.js";
import type {
  CompletedHire,
  HireProviderParams,
  MarketplaceRepository,
  MarketplaceService,
} from "../src/services/marketplace.js";
import { InMemoryPersonaService } from "../src/services/persona.js";
import type { Persona } from "../src/types/domain.js";

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
};

const ANA: Persona = {
  id: "1f7d8e1c-8d4b-6e4b-0d5f-2e6c5d3f7b22",
  name: "Ana Souza",
  businessType: "marmiteira",
  city: "Belo Horizonte",
  monthlyRevenueAvg: "3200.00",
  stage: 1,
  walletPubkey: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
};

const FAKE_HIRE: CompletedHire = {
  requestAddress: "RequestPdaBase58",
  nonce: "1714000000123",
  status: "paid",
  signatures: {
    create: "5xrSigCreate11111111111111111111111111111111111111111111111111",
    pay: "5xrSigPay22222222222222222222222222222222222222222222222222222",
  },
  amountCents: 8000,
  category: "packaging",
  buyerPubkey: "BuyerPubkeyBase58",
  providerPubkey: "ProviderPubkeyBase58",
};

function buildApp(overrides: {
  marketplace: MarketplaceService;
  marketplaceRepo?: MarketplaceRepository;
}) {
  const insights: InsightsService = { getProactiveAlert: vi.fn() };
  const loans: LoanService = { requestAndDisburse: vi.fn() };
  const loanRepo: LoanRepository = { save: vi.fn() };
  const repo: MarketplaceRepository =
    overrides.marketplaceRepo ?? {
      save: vi.fn().mockResolvedValue(undefined),
      countHiresByBuyer: vi.fn().mockResolvedValue(0),
    };
  return {
    app: createApp({
      personaService: new InMemoryPersonaService([MARIA, ANA]),
      insightsService: insights,
      loanService: loans,
      loanRepository: loanRepo,
      marketplaceService: overrides.marketplace,
      marketplaceRepository: repo,
      scoreService: {
        fetchOnChainForPersona: vi.fn(),
        attestForPersona: vi.fn(),
      },
      publicScoreService: { lookupByCnpj: vi.fn() },
      chatService: { sendMessage: vi.fn() },
      authMode: "mock",
    }),
    repo,
  };
}

describe("POST /marketplace/hire", () => {
  it("returns 401 when X-Persona-Id is missing", async () => {
    const marketplace: MarketplaceService = { hireProvider: vi.fn() };
    const { app } = buildApp({ marketplace });
    const res = await app.request("/marketplace/hire", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        providerPersonaId: ANA.id,
        amountCents: 8000,
        category: "packaging",
        memo: "Embalagens artesanais — kit 50un",
      }),
    });
    expect(res.status).toBe(401);
    expect(marketplace.hireProvider).not.toHaveBeenCalled();
  });

  it("returns 422 when the body fails Zod validation", async () => {
    const marketplace: MarketplaceService = { hireProvider: vi.fn() };
    const { app } = buildApp({ marketplace });
    const res = await app.request("/marketplace/hire", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Persona-Id": MARIA.id,
      },
      body: JSON.stringify({
        providerPersonaId: "not-a-uuid",
        amountCents: 0,
        category: "weird",
      }),
    });
    expect(res.status).toBe(422);
    const body = (await res.json()) as ErrorBody;
    expect(body.error.code).toBe("invalid_input");
    expect(marketplace.hireProvider).not.toHaveBeenCalled();
  });

  it("returns 409 when buyer and provider are the same persona", async () => {
    const marketplace: MarketplaceService = { hireProvider: vi.fn() };
    const { app } = buildApp({ marketplace });
    const res = await app.request("/marketplace/hire", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Persona-Id": MARIA.id,
      },
      body: JSON.stringify({
        providerPersonaId: MARIA.id,
        amountCents: 5000,
        category: "other",
        memo: "Não deveria",
      }),
    });
    expect(res.status).toBe(409);
    const body = (await res.json()) as ErrorBody;
    expect(body.error.code).toBe("self_hire_forbidden");
    expect(marketplace.hireProvider).not.toHaveBeenCalled();
  });

  it("returns 200 with the completed hire envelope on the happy path", async () => {
    const hireProvider = vi.fn().mockResolvedValue(FAKE_HIRE);
    const marketplace: MarketplaceService = { hireProvider };
    const repo: MarketplaceRepository = {
      save: vi.fn().mockResolvedValue(undefined),
      countHiresByBuyer: vi.fn().mockResolvedValue(0),
    };
    const { app } = buildApp({ marketplace, marketplaceRepo: repo });

    const res = await app.request("/marketplace/hire", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Persona-Id": MARIA.id,
      },
      body: JSON.stringify({
        providerPersonaId: ANA.id,
        amountCents: 8000,
        category: "packaging",
        memo: "Embalagens artesanais — kit 50un",
      }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as DataBody<CompletedHire>;
    expect(body.data).toEqual(FAKE_HIRE);

    const params = (hireProvider.mock.calls[0]?.[0] ?? {}) as HireProviderParams;
    expect(params.buyerPersonaId).toBe(MARIA.id);
    expect(params.providerPersonaId).toBe(ANA.id);
    expect(params.amountCents).toBe(8000);
    expect(params.category).toBe("packaging");

    expect(repo.save).toHaveBeenCalledTimes(1);
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        buyerPersonaId: MARIA.id,
        providerPersonaId: ANA.id,
        signatures: FAKE_HIRE.signatures,
        memo: "Embalagens artesanais — kit 50un",
      }),
    );
  });

  it("returns 502 when the on-chain orchestration fails", async () => {
    const hireProvider = vi
      .fn()
      .mockRejectedValue(
        Object.assign(new Error("rpc timeout"), {
          code: "create_payment_request_failed",
        }),
      );
    const marketplace: MarketplaceService = { hireProvider };
    const repo: MarketplaceRepository = {
      save: vi.fn(),
      countHiresByBuyer: vi.fn().mockResolvedValue(0),
    };
    const { app } = buildApp({ marketplace, marketplaceRepo: repo });

    const res = await app.request("/marketplace/hire", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Persona-Id": MARIA.id,
      },
      body: JSON.stringify({
        providerPersonaId: ANA.id,
        amountCents: 8000,
        category: "packaging",
        memo: "Embalagens",
      }),
    });
    expect(res.status).toBe(502);
    const body = (await res.json()) as ErrorBody;
    expect(body.error.code).toBe("create_payment_request_failed");
    expect(repo.save).not.toHaveBeenCalled();
  });
});

describe("GET /marketplace/me/hires", () => {
  it("returns the buyer's hire count from the repository", async () => {
    const marketplace: MarketplaceService = { hireProvider: vi.fn() };
    const countHiresByBuyer = vi.fn().mockResolvedValue(3);
    const repo: MarketplaceRepository = {
      save: vi.fn(),
      countHiresByBuyer,
    };
    const { app } = buildApp({ marketplace, marketplaceRepo: repo });

    const res = await app.request("/marketplace/me/hires", {
      headers: { "X-Persona-Id": MARIA.id },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as DataBody<{ count: number }>;
    expect(body.data.count).toBe(3);
    expect(countHiresByBuyer).toHaveBeenCalledWith(MARIA.id);
  });
});

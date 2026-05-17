import { describe, expect, it, vi } from "vitest";

import { createApp } from "../src/app.js";
import type { InsightsService } from "../src/services/insights.js";
import type {
  DisbursedLoan,
  LoanRepository,
  LoanService,
  RequestAndDisburseParams,
} from "../src/services/loans.js";
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
  cnpjDigits: null,
};

const FAKE_DISBURSED: DisbursedLoan = {
  loanId: "1714000000000",
  loanAddress: "LoanPdaAddressBase58",
  status: "disbursed",
  signatures: {
    request: "5xrSig111111111111111111111111111111111111111111111111111111",
    approve: "5xrSig222222222222222222222222222222222222222222222222222222",
    disburse: "5xrSig333333333333333333333333333333333333333333333333333333",
  },
  principalCents: 38000,
  termMonths: 1,
  interestRateBps: 400,
  borrowerPubkey: MARIA.walletPubkey ?? "",
};

function buildApp(overrides: {
  loans: LoanService;
  loanRepo?: LoanRepository;
}) {
  const insights: InsightsService = { getProactiveAlert: vi.fn() };
  const repo: LoanRepository =
    overrides.loanRepo ?? {
      save: vi.fn().mockResolvedValue(undefined),
    };
  return {
    app: createApp({
      personaService: new InMemoryPersonaService([MARIA]),
      insightsService: insights,
      loanService: overrides.loans,
      loanRepository: repo,
      scoreService: {
        fetchOnChainForPersona: vi.fn(),
        attestForPersona: vi.fn(),
      },
      publicScoreService: { lookupByCnpj: vi.fn() },
      publicScoreApiKeys: [],
      marketplaceService: { hireProvider: vi.fn(), quoteBnpl: vi.fn(), hireBnpl: vi.fn(), recordInstallment: vi.fn() },
      bnplEligibility: { evaluate: vi.fn() },
      marketplaceRepository: { save: vi.fn(), countHiresByBuyer: vi.fn(), saveBnplPlan: vi.fn(), findBnplPlanById: vi.fn(), updateBnplPlan: vi.fn(), listBnplPlansByBuyer: vi.fn().mockResolvedValue([]) },
      impactRepository: { recentEvents: vi.fn().mockResolvedValue([]) },
      chatService: { sendMessage: vi.fn() },
      authMode: "mock",
    }),
    repo,
  };
}

describe("POST /credit/request", () => {
  it("returns 401 when X-Persona-Id is missing", async () => {
    const loans: LoanService = { requestAndDisburse: vi.fn() };
    const { app } = buildApp({ loans });
    const res = await app.request("/credit/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountCents: 38000, termMonths: 1, interestRateBps: 400 }),
    });
    expect(res.status).toBe(401);
    expect(loans.requestAndDisburse).not.toHaveBeenCalled();
  });

  it("returns 422 when the body fails Zod validation", async () => {
    const loans: LoanService = { requestAndDisburse: vi.fn() };
    const { app } = buildApp({ loans });
    const res = await app.request("/credit/request", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Persona-Id": MARIA.id,
      },
      body: JSON.stringify({ amountCents: -10, termMonths: 0 }),
    });
    expect(res.status).toBe(422);
    const body = (await res.json()) as ErrorBody;
    expect(body.error.code).toBe("invalid_input");
    expect(loans.requestAndDisburse).not.toHaveBeenCalled();
  });

  it("returns 200 with the disbursed loan envelope on the happy path", async () => {
    const requestAndDisburse = vi.fn().mockResolvedValue(FAKE_DISBURSED);
    const loans: LoanService = { requestAndDisburse };
    const repo: LoanRepository = { save: vi.fn().mockResolvedValue(undefined) };
    const { app } = buildApp({ loans, loanRepo: repo });

    const res = await app.request("/credit/request", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Persona-Id": MARIA.id,
      },
      body: JSON.stringify({
        amountCents: 38000,
        termMonths: 1,
        interestRateBps: 400,
      }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as DataBody<DisbursedLoan>;
    expect(body.data).toEqual(FAKE_DISBURSED);

    const params = (requestAndDisburse.mock.calls[0]?.[0] ?? {}) as RequestAndDisburseParams;
    expect(params.personaId).toBe(MARIA.id);
    expect(params.borrowerPubkey).toBe(MARIA.walletPubkey);
    expect(params.amountCents).toBe(38000);
    expect(params.termMonths).toBe(1);
    expect(params.interestRateBps).toBe(400);

    expect(repo.save).toHaveBeenCalledTimes(1);
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        personaId: MARIA.id,
        loanId: FAKE_DISBURSED.loanId,
        status: "disbursed",
        signatures: FAKE_DISBURSED.signatures,
      }),
    );
  });

  it("returns 409 when the persona has no on-chain wallet pubkey", async () => {
    const personaWithoutWallet: Persona = { ...MARIA, walletPubkey: null };
    const loans: LoanService = { requestAndDisburse: vi.fn() };
    const app = createApp({
      personaService: new InMemoryPersonaService([personaWithoutWallet]),
      insightsService: { getProactiveAlert: vi.fn() },
      loanService: loans,
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
      impactRepository: { recentEvents: vi.fn().mockResolvedValue([]) },
      chatService: { sendMessage: vi.fn() },
      authMode: "mock",
    });
    const res = await app.request("/credit/request", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Persona-Id": MARIA.id,
      },
      body: JSON.stringify({
        amountCents: 38000,
        termMonths: 1,
        interestRateBps: 400,
      }),
    });
    expect(res.status).toBe(409);
    const body = (await res.json()) as ErrorBody;
    expect(body.error.code).toBe("wallet_not_linked");
    expect(loans.requestAndDisburse).not.toHaveBeenCalled();
  });

  it("returns 502 when the on-chain orchestration fails", async () => {
    const requestAndDisburse = vi
      .fn()
      .mockRejectedValue(
        Object.assign(new Error("rpc timeout"), { code: "solana_rpc_error" }),
      );
    const loans: LoanService = { requestAndDisburse };
    const repo: LoanRepository = { save: vi.fn() };
    const { app } = buildApp({ loans, loanRepo: repo });

    const res = await app.request("/credit/request", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Persona-Id": MARIA.id,
      },
      body: JSON.stringify({
        amountCents: 38000,
        termMonths: 1,
        interestRateBps: 400,
      }),
    });
    expect(res.status).toBe(502);
    const body = (await res.json()) as ErrorBody;
    expect(body.error.code).toBe("solana_rpc_error");
    expect(repo.save).not.toHaveBeenCalled();
  });
});

import { describe, expect, it, vi } from "vitest";

import { createApp } from "../src/app.js";
import {
  ChatServiceError,
  type ChatReply,
  type ChatService,
} from "../src/services/chat.js";
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
  walletPubkey: null,
  cnpjDigits: null,
};

const REPLY: ChatReply = {
  response: "Maria, sua receita está saudável este mês.",
  suggestedActions: [{ label: "Ver minha pontuação", target: "score" }],
};

function buildApp(chat: ChatService) {
  return createApp({
    personaService: new InMemoryPersonaService([MARIA]),
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
    impactRepository: { recentEvents: vi.fn().mockResolvedValue([]) },
    chatService: chat,
    authMode: "mock",
  });
}

describe("POST /chat", () => {
  it("returns 401 when X-Persona-Id is missing", async () => {
    const chat: ChatService = { sendMessage: vi.fn() };
    const app = buildApp(chat);
    const res = await app.request("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "oi" }),
    });
    expect(res.status).toBe(401);
    expect(chat.sendMessage).not.toHaveBeenCalled();
  });

  it("returns 422 when message is empty", async () => {
    const chat: ChatService = { sendMessage: vi.fn() };
    const app = buildApp(chat);
    const res = await app.request("/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Persona-Id": MARIA.id,
      },
      body: JSON.stringify({ message: "" }),
    });
    expect(res.status).toBe(422);
    const body = (await res.json()) as ErrorBody;
    expect(body.error.code).toBe("invalid_input");
    expect(chat.sendMessage).not.toHaveBeenCalled();
  });

  it("forwards the message + persona id to the chat service", async () => {
    const chat: ChatService = {
      sendMessage: vi.fn().mockResolvedValue(REPLY),
    };
    const app = buildApp(chat);
    const res = await app.request("/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Persona-Id": MARIA.id,
      },
      body: JSON.stringify({
        message: "Como está minha pontuação?",
        history: [{ role: "user", content: "oi" }],
      }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as DataBody<ChatReply>;
    expect(body.data).toEqual(REPLY);
    expect(chat.sendMessage).toHaveBeenCalledWith({
      personaId: MARIA.id,
      message: "Como está minha pontuação?",
      history: [{ role: "user", content: "oi" }],
    });
  });

  it("maps ChatServiceError to the matching status code", async () => {
    const chat: ChatService = {
      sendMessage: vi
        .fn()
        .mockRejectedValue(
          new ChatServiceError("persona_not_found", "unknown", 404),
        ),
    };
    const app = buildApp(chat);
    const res = await app.request("/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Persona-Id": MARIA.id,
      },
      body: JSON.stringify({ message: "oi" }),
    });
    expect(res.status).toBe(404);
    const body = (await res.json()) as ErrorBody;
    expect(body.error.code).toBe("persona_not_found");
  });

  it("returns 502 for ai_service_error", async () => {
    const chat: ChatService = {
      sendMessage: vi
        .fn()
        .mockRejectedValue(
          new ChatServiceError("ai_service_error", "boom"),
        ),
    };
    const app = buildApp(chat);
    const res = await app.request("/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Persona-Id": MARIA.id,
      },
      body: JSON.stringify({ message: "oi" }),
    });
    expect(res.status).toBe(502);
    const body = (await res.json()) as ErrorBody;
    expect(body.error.code).toBe("ai_service_error");
  });
});

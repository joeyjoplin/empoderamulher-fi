import { z } from "zod";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type SuggestedActionTarget =
  | "dashboard"
  | "credit"
  | "score"
  | "marketplace"
  | "insight";

export type SuggestedAction = {
  label: string;
  target: SuggestedActionTarget;
};

export type ChatReply = {
  response: string;
  suggestedActions: SuggestedAction[];
};

export type SendMessageParams = {
  personaId: string;
  message: string;
  history: ChatMessage[];
};

export interface ChatService {
  sendMessage(params: SendMessageParams): Promise<ChatReply>;
}

export class ChatServiceError extends Error {
  override readonly name = "ChatServiceError";
  readonly code:
    | "ai_service_unavailable"
    | "ai_service_error"
    | "persona_not_found";
  readonly status: number;

  constructor(
    code: ChatServiceError["code"],
    message: string,
    status = 502,
  ) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

const aiActionSchema = z.object({
  label: z.string().min(1),
  target: z.enum(["dashboard", "credit", "score", "marketplace", "insight"]),
});

const aiResponseSchema = z.object({
  response: z.string(),
  suggested_actions: z.array(aiActionSchema).default([]),
});

export type HttpChatServiceOptions = {
  baseUrl: string;
  fetch?: typeof fetch;
};

export class HttpChatService implements ChatService {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: HttpChatServiceOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/$/, "");
    this.fetchImpl = opts.fetch ?? globalThis.fetch;
  }

  async sendMessage(params: SendMessageParams): Promise<ChatReply> {
    const url = `${this.baseUrl}/api/v1/chat`;
    let res: Response;
    try {
      res = await this.fetchImpl(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          persona_id: params.personaId,
          message: params.message,
          history: params.history,
        }),
      });
    } catch (err) {
      throw new ChatServiceError(
        "ai_service_unavailable",
        err instanceof Error ? err.message : "AI service unreachable",
      );
    }

    if (res.status === 404) {
      throw new ChatServiceError(
        "persona_not_found",
        "AI service did not recognize this persona",
        404,
      );
    }
    if (!res.ok) {
      throw new ChatServiceError(
        "ai_service_error",
        `AI service returned HTTP ${res.status}`,
      );
    }

    const json = (await res.json()) as unknown;
    const parsed = aiResponseSchema.safeParse(json);
    if (!parsed.success) {
      throw new ChatServiceError(
        "ai_service_error",
        "AI service response failed schema validation",
      );
    }
    return {
      response: parsed.data.response,
      suggestedActions: parsed.data.suggested_actions.map((a) => ({
        label: a.label,
        target: a.target,
      })),
    };
  }
}

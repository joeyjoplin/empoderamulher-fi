import type { ApiClient } from "./client";

export type ChatRole = "user" | "assistant";

export type ChatHistoryMessage = {
  role: ChatRole;
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

export type SendChatMessageParams = {
  message: string;
  history: ChatHistoryMessage[];
};

export function sendChatMessage(
  client: ApiClient,
  params: SendChatMessageParams,
): Promise<ChatReply> {
  return client.post<ChatReply>("/chat", params);
}

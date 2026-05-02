import type { ApiClient } from "./client";
import type { BackendPersona } from "./types";

export function getMe(client: ApiClient): Promise<BackendPersona> {
  return client.get<BackendPersona>("/me");
}

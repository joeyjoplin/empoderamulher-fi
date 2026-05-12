/**
 * Public Score-as-a-Service client used by the `/api-sandbox` page.
 *
 * Deliberately separate from `client.ts` because the public API:
 *   - is authenticated via `Authorization: Bearer …` (not `X-Persona-Id`)
 *   - returns snake_case fields per the third-party contract
 *   - has no shared session — each call carries its own credential
 *
 * Plain `fetch` keeps the contract obvious to anyone reading the page
 * code (and matches the cURL snippet shown in the UI).
 */

import { backendBaseUrl } from "@/data/sandbox";

export type PublicScoreData = {
  total_score: number;
  breakdown: {
    discipline: number;
    organization: number;
    cash_flow: number;
    engagement: number;
  };
  last_updated_at: number;
  attestor: string;
  on_chain_address: string;
};

export type LookupOk = { kind: "ok"; data: PublicScoreData };
export type LookupErr = {
  kind: "err";
  status: number;
  code: string;
  message: string;
};
export type LookupResult = LookupOk | LookupErr;

export async function lookupScore(args: {
  cnpjDigits: string;
  apiKey: string;
}): Promise<LookupResult> {
  const url = `${backendBaseUrl()}/api/v1/score/${encodeURIComponent(args.cnpjDigits)}`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${args.apiKey}`,
      },
    });
  } catch (err) {
    return {
      kind: "err",
      status: 0,
      code: "network_error",
      message: err instanceof Error ? err.message : "Falha de rede",
    };
  }

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (res.ok && body && typeof body === "object" && "data" in body) {
    return { kind: "ok", data: (body as { data: PublicScoreData }).data };
  }

  const errPayload =
    body && typeof body === "object" && "error" in body
      ? (body as { error: { code?: string; message?: string } }).error
      : undefined;

  return {
    kind: "err",
    status: res.status,
    code: errPayload?.code ?? "unknown_error",
    message: errPayload?.message ?? `HTTP ${res.status}`,
  };
}

/**
 * Build the cURL snippet shown in the UI. Mirrors the live request shape
 * exactly so a partner lender can copy-paste it into their terminal and
 * get the same response the page just rendered.
 */
export function buildCurlSnippet(args: {
  cnpjDigits: string;
  apiKey: string;
}): string {
  const url = `${backendBaseUrl()}/api/v1/score/${encodeURIComponent(args.cnpjDigits)}`;
  return [
    `curl '${url}' \\`,
    `  -H 'Accept: application/json' \\`,
    `  -H 'Authorization: Bearer ${args.apiKey}'`,
  ].join("\n");
}

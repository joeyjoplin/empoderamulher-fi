import type { ApiFailure, ApiSuccess } from "./types";

export type ApiClientConfig = {
  baseUrl: string;
  /** Active persona id; sent on every protected request as `X-Persona-Id`. */
  personaId?: string;
  /** Optional default headers (merged before per-request overrides). */
  defaultHeaders?: Record<string, string>;
};

export type ApiClient = {
  get<T>(path: string, init?: RequestInit): Promise<T>;
  post<T>(path: string, body: unknown, init?: RequestInit): Promise<T>;
  /** Returns a fresh client with `personaId` overridden — useful for swapping users. */
  withPersona(personaId: string | undefined): ApiClient;
  baseUrl: string;
  personaId: string | undefined;
};

export class ApiError extends Error {
  override readonly name = "ApiError";
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function createApiClient(config: ApiClientConfig): ApiClient {
  const baseUrl = config.baseUrl.replace(/\/$/, "");

  function buildUrl(path: string): string {
    return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
  }

  function buildHeaders(extra?: HeadersInit): Headers {
    const headers = new Headers(config.defaultHeaders);
    if (config.personaId) {
      headers.set("X-Persona-Id", config.personaId);
    }
    headers.set("Accept", "application/json");
    if (extra) {
      new Headers(extra).forEach((value, key) => headers.set(key, value));
    }
    return headers;
  }

  async function request<T>(path: string, init: RequestInit): Promise<T> {
    const res = await fetch(buildUrl(path), {
      ...init,
      headers: buildHeaders(init.headers),
    });
    const body = (await res.json().catch(() => ({}))) as
      | ApiSuccess<T>
      | ApiFailure
      | Record<string, never>;

    if (!res.ok || (body && typeof body === "object" && "error" in body)) {
      const error = "error" in body ? body.error : undefined;
      throw new ApiError(
        res.status,
        error?.code ?? "unknown_error",
        error?.message ?? `HTTP ${res.status}`,
      );
    }

    if (body && typeof body === "object" && "data" in body) {
      return body.data;
    }
    return body as T;
  }

  const client: ApiClient = {
    baseUrl,
    personaId: config.personaId,
    get<T>(path: string, init: RequestInit = {}) {
      return request<T>(path, { ...init, method: "GET" });
    },
    post<T>(path: string, body: unknown, init: RequestInit = {}) {
      return request<T>(path, {
        ...init,
        method: "POST",
        headers: new Headers({
          "Content-Type": "application/json",
          ...(init.headers ? Object.fromEntries(new Headers(init.headers)) : {}),
        }),
        body: JSON.stringify(body),
      });
    },
    withPersona(personaId) {
      return createApiClient({ ...config, personaId });
    },
  };
  return client;
}

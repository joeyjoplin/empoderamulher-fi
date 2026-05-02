import { createContext, useContext, useMemo, type ReactNode } from "react";

import { createApiClient, type ApiClient } from "./client";

const ApiClientContext = createContext<ApiClient | null>(null);

export function ApiClientProvider({
  value,
  children,
}: {
  value: ApiClient;
  children: ReactNode;
}) {
  return (
    <ApiClientContext.Provider value={value}>{children}</ApiClientContext.Provider>
  );
}

export function useApiClient(): ApiClient {
  const ctx = useContext(ApiClientContext);
  if (!ctx) {
    throw new Error("useApiClient must be used within ApiClientProvider");
  }
  return ctx;
}

/**
 * Convenience helper to build an ApiClient from Vite env vars and an optional
 * persona id. Use at the root of the app:
 *
 *   const client = useDefaultApiClient(personaId);
 *   <ApiClientProvider value={client}>...</ApiClientProvider>
 */
export function useDefaultApiClient(personaId: string | undefined): ApiClient {
  const baseUrl =
    (import.meta.env.VITE_BACKEND_URL as string | undefined) ??
    "http://localhost:3001";
  return useMemo(
    () => createApiClient({ baseUrl, personaId }),
    [baseUrl, personaId],
  );
}

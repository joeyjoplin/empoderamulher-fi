/**
 * Static configuration for the public Score-as-a-Service sandbox page
 * (TASK 3.5.2). The keys here MUST stay in sync with the backend's
 * `SCORE_SAAS_DEMO_KEYS` env var — otherwise the page will 401 against
 * its own configured allowlist.
 *
 * Build-time override: `VITE_SCORE_SAAS_DEMO_KEYS=<comma,list>` lets each
 * deployment ship a fresh allowlist without code changes. The first key
 * from the resolved list is the one pre-filled in the API-key card.
 */

const FALLBACK_KEYS = [
  "lender_demo_a1b2c3d4ef",
  "lender_demo_9z8y7x6w5v",
];

function readDemoKeys(): readonly string[] {
  const raw = import.meta.env.VITE_SCORE_SAAS_DEMO_KEYS as string | undefined;
  if (!raw) return FALLBACK_KEYS;
  const list = raw
    .split(",")
    .map((k) => k.trim())
    .filter((k) => k.length > 0);
  return list.length > 0 ? list : FALLBACK_KEYS;
}

export const DEMO_API_KEYS: readonly string[] = readDemoKeys();

/** Maria's calibrated CNPJ — used as the pre-filled value in the lookup form. */
export const DEMO_CNPJ = "12345678000190";

/** Backend origin used by the sandbox page's plain `fetch` calls. */
export function backendBaseUrl(): string {
  return (
    (import.meta.env.VITE_BACKEND_URL as string | undefined) ??
    "http://localhost:3001"
  );
}

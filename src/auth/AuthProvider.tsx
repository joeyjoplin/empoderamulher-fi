/**
 * Auth boundary for the consumer app.
 *
 * Two backends, one consumer-facing context:
 *
 * - **mock**: today's behavior. Every visitor is treated as authenticated;
 *   the persona picker is the only "who am I" gate. Used in dev and as a
 *   fallback if Web3Auth is misconfigured one hour before the demo.
 * - **web3auth**: real social login via `@web3auth/modal`, lazy-loaded
 *   from `./Web3AuthMode` so the SDK bundle (large) never ships when
 *   we're in mock mode and so jsdom test environments don't crash on
 *   the SDK's module-level crypto calls.
 *
 * The choice is driven by `VITE_AUTH_MODE` + `VITE_WEB3AUTH_CLIENT_ID`.
 * If web3auth is requested but the client id is missing, we degrade to
 * mock with a console warning rather than crashing the app — the demo
 * machine should never go to a white screen because of an env typo.
 *
 * Backend integration is intentionally out of scope here (per TASK 3.4
 * "demo-shaped" scope). The backend stays in `AUTH_MODE=mock` and accepts
 * `X-Persona-Id`; auth status is purely a frontend gate that controls
 * whether the persona picker / dashboard is reachable.
 */

import {
  Suspense,
  lazy,
  useContext,
  useMemo,
  type ReactNode,
} from "react";

import {
  AuthContext,
  type AuthContextValue,
  type AuthMode,
} from "./AuthContext";

const Web3AuthMode = lazy(() => import("./Web3AuthMode"));

export type {
  AuthContextValue,
  AuthMode,
  AuthProfile,
  AuthState,
} from "./AuthContext";

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}

// ────────────────────────────────────────────────────────────────────────────
// Mock provider — always authenticated, login/logout are no-ops.
// ────────────────────────────────────────────────────────────────────────────

function MockAuthProvider({ children }: { children: ReactNode }) {
  const value = useMemo<AuthContextValue>(
    () => ({
      mode: "mock",
      state: {
        status: "authenticated",
        profile: { name: "Demo" },
      },
      login: async () => {
        /* no-op */
      },
      logout: async () => {
        /* no-op */
      },
    }),
    [],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ────────────────────────────────────────────────────────────────────────────
// Root — picks the right backend based on env.
// ────────────────────────────────────────────────────────────────────────────

function readMode(): AuthMode {
  return import.meta.env.VITE_AUTH_MODE === "web3auth" ? "web3auth" : "mock";
}

function readClientId(): string {
  return (import.meta.env.VITE_WEB3AUTH_CLIENT_ID as string | undefined) ?? "";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const mode = readMode();
  const clientId = readClientId();

  if (mode === "web3auth" && clientId.length > 0) {
    return (
      <Suspense fallback={null}>
        <Web3AuthMode clientId={clientId}>{children}</Web3AuthMode>
      </Suspense>
    );
  }

  if (mode === "web3auth" && clientId.length === 0) {
    // Fail soft so a missing env var doesn't take the demo down.
    // eslint-disable-next-line no-console
    console.warn(
      "[auth] VITE_AUTH_MODE=web3auth but VITE_WEB3AUTH_CLIENT_ID is empty. Falling back to mock.",
    );
  }

  return <MockAuthProvider>{children}</MockAuthProvider>;
}

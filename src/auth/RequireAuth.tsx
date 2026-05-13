/**
 * Route gate — bounces visitors back to the landing page if they aren't
 * authenticated. In `mock` mode this is always a no-op (every visitor is
 * authenticated by definition). In `web3auth` mode it redirects to `/`
 * until `useWeb3AuthConnect` reports `isConnected`.
 *
 * Wraps `<Outlet />` so it can be dropped on the existing PersonaShell
 * layout route in `App.tsx` without restructuring the route tree.
 */

import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "./AuthProvider";

export function RequireAuth({ children }: { children?: React.ReactNode }) {
  const { mode, state } = useAuth();
  const location = useLocation();

  if (mode === "mock") return <>{children ?? <Outlet />}</>;

  // Web3Auth mode: only `authenticated` may pass. `authenticating` keeps
  // the previous render to avoid a flash of the landing page on reload
  // while Web3Auth is rehydrating its session from storage.
  if (state.status === "authenticated") return <>{children ?? <Outlet />}</>;
  if (state.status === "authenticating") return null;

  return <Navigate to="/" replace state={{ from: location.pathname }} />;
}

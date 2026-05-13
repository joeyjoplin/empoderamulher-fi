/**
 * Bare React context + types shared between AuthProvider and the
 * lazy-loaded Web3AuthMode adapter. Kept in a separate module so the
 * lazy-loaded chunk doesn't pull AuthProvider's imports back in.
 */

import { createContext } from "react";

export type AuthMode = "mock" | "web3auth";

export type AuthProfile = {
  name?: string;
  email?: string;
  profileImage?: string;
};

export type AuthState =
  | { status: "unauthenticated" }
  | { status: "authenticating" }
  | { status: "authenticated"; profile: AuthProfile }
  | { status: "error"; message: string };

export type AuthContextValue = {
  mode: AuthMode;
  state: AuthState;
  login: () => Promise<void>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

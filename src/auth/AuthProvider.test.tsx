/**
 * Mock-mode AuthProvider behaviour. The web3auth-mode branch is not unit
 * tested here — it pulls in the full `@web3auth/modal` SDK which expects
 * a real browser environment (window.crypto subtle, indexedDB, popups).
 * Smoke-testing that branch is the manual job before the demo.
 */

import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthProvider, useAuth } from "./AuthProvider";

function Probe() {
  const { mode, state } = useAuth();
  return (
    <div>
      <span data-testid="mode">{mode}</span>
      <span data-testid="status">{state.status}</span>
      {state.status === "authenticated" ? (
        <span data-testid="name">{state.profile.name ?? ""}</span>
      ) : null}
    </div>
  );
}

describe("<AuthProvider /> in mock mode", () => {
  const originalEnv = { ...import.meta.env };

  beforeEach(() => {
    vi.stubEnv("VITE_AUTH_MODE", "mock");
    vi.stubEnv("VITE_WEB3AUTH_CLIENT_ID", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    Object.assign(import.meta.env, originalEnv);
  });

  it("treats every visitor as authenticated", () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    expect(screen.getByTestId("mode").textContent).toBe("mock");
    expect(screen.getByTestId("status").textContent).toBe("authenticated");
    expect(screen.getByTestId("name").textContent).toBe("Demo");
  });

  it("falls back to mock when web3auth is requested without a client id", () => {
    vi.stubEnv("VITE_AUTH_MODE", "web3auth");
    vi.stubEnv("VITE_WEB3AUTH_CLIENT_ID", "");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    expect(screen.getByTestId("mode").textContent).toBe("mock");
    expect(screen.getByTestId("status").textContent).toBe("authenticated");
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

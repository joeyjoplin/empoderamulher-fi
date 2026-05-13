import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { AuthProvider } from "./AuthProvider";
import { RequireAuth } from "./RequireAuth";

function renderRoute(initial: string) {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[initial]}>
        <Routes>
          <Route path="/" element={<div>landing</div>} />
          <Route element={<RequireAuth />}>
            <Route path="/dashboard" element={<div>protected dashboard</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
}

describe("<RequireAuth />", () => {
  // VITE_AUTH_MODE defaults to mock in the test env, so the gate should
  // always pass — no Web3Auth, no redirect.
  it("renders the protected children directly in mock mode", () => {
    renderRoute("/dashboard");
    expect(screen.getByText("protected dashboard")).toBeInTheDocument();
  });
});

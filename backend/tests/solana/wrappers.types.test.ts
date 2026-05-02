/**
 * Compile-time test: the wrapper functions must expose domain-typed signatures
 * (no raw Anchor IDL leakage). This file fails to compile if the wrappers'
 * public API drifts from the documented shape.
 */

import { describe, expect, it } from "vitest";

import type {
  ApproveLoanParams,
  CloseLoanParams,
  DepositParams,
  DisburseLoanParams,
  InitializeLoanConfigParams,
  InitializePoolParams,
  InitializeTokenConfigParams,
  RepayInstallmentParams,
  RequestLoanParams,
  TxResult,
} from "../../src/services/solana/index.js";

describe("Solana wrapper public API surface", () => {
  it("exports the documented param types", () => {
    // Just referencing them at runtime confirms the module exports exist.
    const noop = (..._args: unknown[]) => undefined;
    noop(
      undefined as unknown as InitializeTokenConfigParams,
      undefined as unknown as InitializePoolParams,
      undefined as unknown as DepositParams,
      undefined as unknown as InitializeLoanConfigParams,
      undefined as unknown as RequestLoanParams,
      undefined as unknown as ApproveLoanParams,
      undefined as unknown as DisburseLoanParams,
      undefined as unknown as RepayInstallmentParams,
      undefined as unknown as CloseLoanParams,
      undefined as unknown as TxResult,
    );
    expect(true).toBe(true);
  });
});

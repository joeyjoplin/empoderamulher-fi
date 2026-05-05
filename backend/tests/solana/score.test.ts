import { createHmac } from "node:crypto";
import { PublicKey } from "@solana/web3.js";
import { describe, expect, it } from "vitest";

import { PROGRAM_IDS, scoreConfigPda, scorePda } from "../../src/services/solana/pdas.js";
import { cnpjHmac } from "../../src/services/solana/score.js";

const SCORE = new PublicKey(PROGRAM_IDS.score);

describe("cnpjHmac", () => {
  it("returns 32 bytes (HMAC-SHA256 output length)", () => {
    const out = cnpjHmac("12345678000190", "any-pepper");
    expect(out.length).toBe(32);
  });

  it("strips non-digit characters from the CNPJ before hashing", () => {
    const stripped = cnpjHmac("12.345.678/0001-90", "pepper");
    const raw = cnpjHmac("12345678000190", "pepper");
    expect(Buffer.from(stripped).equals(Buffer.from(raw))).toBe(true);
  });

  it("rejects CNPJs that don't have exactly 14 digits", () => {
    expect(() => cnpjHmac("123", "pepper")).toThrow(/14 digits/);
  });

  it("matches a manual HMAC-SHA256 reference implementation", () => {
    const manual = createHmac("sha256", "pepper").update("12345678000190").digest();
    const ours = cnpjHmac("12345678000190", "pepper");
    expect(Buffer.from(ours).equals(manual)).toBe(true);
  });

  it("produces a different mac for the same CNPJ under a different pepper", () => {
    const a = cnpjHmac("12345678000190", "pepper-a");
    const b = cnpjHmac("12345678000190", "pepper-b");
    expect(Buffer.from(a).equals(Buffer.from(b))).toBe(false);
  });
});

describe("score PDAs", () => {
  it("scoreConfigPda matches manual derivation with [SCORE_CONFIG_SEED]", () => {
    const [via] = scoreConfigPda(SCORE);
    const [manual] = PublicKey.findProgramAddressSync(
      [Buffer.from("score_config")],
      SCORE,
    );
    expect(via.toBase58()).toBe(manual.toBase58());
  });

  it("scorePda matches [SCORE_SEED, cnpj_hmac]", () => {
    const hmac = cnpjHmac("12345678000190", "pepper");
    const [via] = scorePda(SCORE, hmac);
    const [manual] = PublicKey.findProgramAddressSync(
      [Buffer.from("score"), Buffer.from(hmac)],
      SCORE,
    );
    expect(via.toBase58()).toBe(manual.toBase58());
  });

  it("scorePda rejects a non-32-byte input", () => {
    expect(() => scorePda(SCORE, new Uint8Array(16))).toThrow(/32 bytes/);
  });
});

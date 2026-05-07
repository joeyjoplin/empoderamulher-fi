/**
 * Pure event-parsing helpers for the on-chain indexer.
 *
 * Kept free of Solana RPC / DB dependencies so the parsing logic is trivially
 * unit-testable with fixture log strings — the same way the on-chain program
 * tests assert against `emit!` output.
 */

import { BorshEventCoder, type Idl } from "@coral-xyz/anchor";
import BN from "bn.js";
import { PublicKey } from "@solana/web3.js";

export type ParsedEvent = {
  eventName: string;
  /** 0-based position of this event within the transaction's event stream. */
  eventIndex: number;
  /** Decoded event payload, with BN/PublicKey/Buffer normalised to JSON-safe scalars. */
  payload: Record<string, unknown>;
};

export type ProgramRegistration = {
  /** Stable program identifier used in DB rows + cursor lookup. */
  name: string;
  /** Program ID as a base58 string; the worker converts to PublicKey when needed. */
  programId: string;
  /** Anchor IDL — the BorshEventCoder uses it to discriminate + decode events. */
  idl: Idl;
};

export type RegisteredProgram = ProgramRegistration & {
  coder: BorshEventCoder;
};

export function registerPrograms(
  programs: ProgramRegistration[],
): RegisteredProgram[] {
  return programs.map((p) => ({ ...p, coder: new BorshEventCoder(p.idl) }));
}

/**
 * Parse all events emitted by a single transaction, scoped to a specific
 * program. We re-implement the simple "Program data: <base64>" scan instead
 * of using `EventParser.parseLogs` because the latter requires an
 * `EventParser` per Anchor `Program` instance and we want zero coupling to
 * the Anchor `Provider` (the worker never sends transactions).
 */
export function parseProgramEvents(
  program: RegisteredProgram,
  logs: readonly string[],
): ParsedEvent[] {
  const events: ParsedEvent[] = [];
  let index = 0;
  for (const line of logs) {
    if (!line.startsWith("Program data: ")) continue;
    const data = line.slice("Program data: ".length).trim();
    if (data.length === 0) continue;
    const decoded = program.coder.decode(data);
    if (decoded === null) continue;
    events.push({
      eventName: decoded.name,
      eventIndex: index,
      payload: normalisePayload(decoded.data as Record<string, unknown>),
    });
    index += 1;
  }
  return events;
}

/**
 * Recursively coerce Anchor's decoded event data into JSON-safe values:
 *   BN → decimal string, PublicKey/Buffer → base58/hex, nested objects/arrays
 *   handled in place. Strings instead of numbers for u64 to avoid silent
 *   precision loss when the payload round-trips through JSONB.
 */
export function normalisePayload(
  input: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => [key, normaliseValue(value)]),
  );
}

function normaliseValue(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (BN.isBN(value)) return value.toString(10);
  if (value instanceof PublicKey) return value.toBase58();
  if (value instanceof Uint8Array) return Buffer.from(value).toString("hex");
  if (Array.isArray(value)) return value.map(normaliseValue);
  if (typeof value === "object") {
    return normalisePayload(value as Record<string, unknown>);
  }
  return value;
}

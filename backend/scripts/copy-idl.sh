#!/usr/bin/env bash
# Copies the latest Anchor IDLs and TS types from smartcontracts/target/
# into backend/src/services/solana/idl/. Run after `anchor build`.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SRC="$ROOT/smartcontracts/target"
DEST="$ROOT/backend/src/services/solana/idl"

mkdir -p "$DEST"
for prog in rwa_token collateral_pool loan_origination; do
  cp "$SRC/idl/$prog.json" "$DEST/$prog.json"
  cp "$SRC/types/$prog.ts" "$DEST/$prog.ts"
done

echo "Copied 3 IDLs + types to $DEST"

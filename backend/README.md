# EmpowerFI Backend

Hono + Drizzle orchestrator. See [BLUEPRINT.md](../BLUEPRINT.md) for the full architecture.

## Run locally

```bash
cp .env.example .env   # fill in DATABASE_URL, SOLANA_RPC_URL, SOLANA_PAYER_SECRET_KEY, SCORE_HMAC_PEPPER
npm install
npm run dev
```

## Public API: Score-as-a-Service

`GET /api/v1/score/:cnpj` returns the on-chain behavioural score for a Brazilian CNPJ. The CNPJ is HMAC-hashed before any on-chain lookup, so the raw value never appears on-chain.

- **No auth header required** — third-party lenders integrate without an EmpowerFI persona session. (Production gating ships in TASK 3.5.2 with a `lender_demo_*` API key.)
- **Rate limit:** 30 requests / minute per IP.
- **CNPJ format:** 14 digits, with optional `.` `/` `-` separators (stripped server-side).

```bash
# 14 raw digits or formatted — both work.
curl https://api.empowerfi.app/api/v1/score/12345678000190
curl https://api.empowerfi.app/api/v1/score/12.345.678/0001-90
```

Response on success (`200 OK`):

```json
{
  "data": {
    "total_score": 612,
    "breakdown": {
      "discipline": 158,
      "organization": 142,
      "cash_flow": 167,
      "engagement": 145
    },
    "last_updated_at": 1714579800,
    "attestor": "<solana-pubkey-base58>",
    "on_chain_address": "<score-pda-base58>"
  }
}
```

The `on_chain_address` is the Solana `Score` PDA — fetch it independently via any Solana RPC to verify the EmpowerFI backend isn't lying:

```bash
solana account <on_chain_address> --url devnet
```

Errors:

| Status | `error.code`             | Meaning                                              |
|--------|--------------------------|------------------------------------------------------|
| 404    | `score_not_attested`     | No score on file for this CNPJ.                      |
| 422    | `invalid_cnpj`           | Wrong digit count or non-numeric input.              |
| 429    | `rate_limited`           | Per-IP bucket exhausted; honour `Retry-After`.       |
| 502    | `solana_rpc_error`       | EmpowerFI couldn't reach the Solana RPC.             |

## Tests

```bash
npm run typecheck
npm test
```

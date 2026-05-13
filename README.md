# EmpowerFI

A sustainable prosperity system for Brazilian women microentrepreneurs who are
invisible to the traditional banking system. Tokenized treasury funding,
alternative credit scoring auditable on-chain, a proactive AI assistant, and a
B2B marketplace between entrepreneurs — all built on Solana.

> Built for the Solana RWA hackathon. MVP, devnet.

## The demo loop

Every part of the product points at this one scripted flow:

1. **Maria** (synthetic persona — confeiteira in São Paulo) opens the app.
2. The **AI assistant proactively detects** an upcoming cash-flow gap from her
   transaction history and surfaces it on the dashboard.
3. She's offered three paths — anticipate receivables, renegotiate with a
   supplier, or take an **EmpowerFI credit** at 4% a.m.
4. She picks credit. The loan is **originated on-chain**: request → approve →
   disburse, three Anchor instructions, three transaction signatures.
5. Her **on-chain score goes up**. The success screen links the disburse
   signature to Solana Explorer.
6. She opens the **marketplace** and hires Ana (another entrepreneur in the
   network) for packaging — a `PaymentRequest` PDA is created and paid in two
   more on-chain instructions.
7. The **impact dashboard** at `/impacto` aggregates these transactions live —
   the indexer worker tails the chain and feeds the public dashboard.
8. A partner lender opens the **API sandbox** at `/api-sandbox`, pastes Maria's
   CNPJ + a demo Bearer token, and reads her score from the public
   Score-as-a-Service endpoint. Same data Maria saw in her own dashboard.

## Architecture

```
┌──────────────┐     ┌─────────────┐     ┌────────────┐     ┌────────────┐
│   Frontend   │────►│  Backend    │────►│ AI Service │────►│ Anthropic  │
│  Vite/React  │     │  Node/Hono  │     │  FastAPI   │     │   Claude   │
│  Tailwind    │     │  Drizzle    │     │  pytest    │     └────────────┘
└──────┬───────┘     └──────┬──────┘     └──────┬─────┘
       │                    │                   │
       │  Web3Auth modal    │  Postgres         │  Postgres
       │  (Sapphire devnet) │  (Supabase)       │  (Supabase)
       │                    │                   │
       └────────────────────┴───────────────────┘
                            │
                            ▼
                ┌────────────────────────┐
                │  Solana Devnet         │
                │  (5 Anchor programs)   │
                └────────────────────────┘
```

**Five Anchor programs** under `smartcontracts/programs/`:

| Program | Purpose |
|---|---|
| `rwa_token` | Token-2022 RWA mint (controlled, audit-ready) |
| `collateral_pool` | Tokenized funding pool backed by Brazilian Treasury |
| `loan_origination` | Loan lifecycle: request → approve → disburse |
| `score` | Privacy-preserving on-chain score (HMAC-keyed by CNPJ) |
| `marketplace` | B2B payment requests between entrepreneurs |

`impact_hooks` (Token-2022 transfer hook) deferred post-MVP.

**Score-as-a-Service** (Phase-2 monetization wedge): Maria's behavioral score is
attested on-chain at `Score` PDA seeded by `HMAC-SHA256(server_pepper, cnpj)` —
the raw CNPJ never appears on-chain. A public REST API
(`GET /api/v1/score/:cnpj`) lets third-party lenders verify and consume the
score; gated by Bearer-token API keys + per-key rate limit.

## Repo layout

The frontend lives at the **repo root** (`src/`) — Lovable scaffolded it that
way. Don't create a parallel `frontend/` folder.

```
empoderamulher-fi/
├── src/                  # Frontend (Vite + React + Tailwind + shadcn/ui)
├── public/               # Frontend static assets
├── backend/              # Node + Hono + Drizzle (orchestrator)
│   └── tests/            # Vitest
├── ai_service/           # Python + FastAPI (Anthropic gateway)
│   └── tests/            # pytest
├── smartcontracts/       # Anchor programs
│   └── tests/            # Anchor TS tests
├── docs/                 # Reference documents
└── BLUEPRINT.md          # Full architecture (gitignored)
```

## Quick start

You need: Node 20+, pnpm 10, Python 3.11+, Rust + Anchor 0.31+ (only if you
want to build/deploy the programs), and a Postgres URL (Supabase works).

### 1. Clone + install

```bash
pnpm install
cd backend && pnpm install && cd ..
cd ai_service && python -m venv .venv && source .venv/bin/activate \
  && pip install -r requirements.txt && cd ..
```

### 2. Environment

Copy each `.env.example` and fill it in:

```bash
cp .env.example .env                     # frontend
cp backend/.env.example backend/.env     # backend
cp ai_service/.env.example ai_service/.env   # AI service
```

Required values:
- `DATABASE_URL` — Postgres (same DB for backend + AI service)
- `ANTHROPIC_API_KEY` — only in `ai_service/.env`, never in frontend or backend
- `SOLANA_RPC_URL` + `SOLANA_PAYER_SECRET_KEY` — backend, for on-chain ops
- `SCORE_HMAC_PEPPER` — backend, 32+ random bytes (rotation re-derives all PDAs)
- `VITE_AUTH_MODE=mock` — frontend, default. Set to `web3auth` and provide
  `VITE_WEB3AUTH_CLIENT_ID` to enable real social login.

### 3. Seed personas

The demo personas (Maria, Ana, Julia) are generated synthetically and stamped
with stable wallet pubkeys + CNPJs:

```bash
cd ai_service && source .venv/bin/activate
python -m app.cli seed-personas
```

> ⚠️ Re-running `seed-personas` resets persona dates; the wallet pubkeys are
> stable. See `BLUEPRINT.md` for the synthetic persona shape.

### 4. Run the three services (three terminals)

```bash
# Terminal 1 — Backend (Hono on :3001)
cd backend && pnpm dev

# Terminal 2 — AI service (FastAPI on :8000)
cd ai_service && source .venv/bin/activate
uvicorn app.main:app --reload --port 8000

# Terminal 3 — Frontend (Vite on :8080)
npm run dev
```

Open `http://localhost:8080` and click **"Entrar com email"**.

## Auth modes

The frontend has two backends behind a single `useAuth()` context:

- **`mock`** (default) — every visitor is treated as authenticated; the persona
  picker is the only "who am I" gate. Use this for dev and as a fallback if
  Web3Auth misconfigures one hour before the demo.
- **`web3auth`** — real social login via `@web3auth/modal` (Solana devnet).
  The `RequireAuth` route gate redirects to `/` until connected.

To enable Web3Auth:

1. Register a "Plug & Play" project at https://dashboard.web3auth.io →
   select Solana → copy the Client ID
2. Set in `.env`:
   ```
   VITE_AUTH_MODE=web3auth
   VITE_WEB3AUTH_CLIENT_ID=<your-client-id>
   ```
3. Restart `npm run dev`

> The backend stays in `AUTH_MODE=mock` and accepts `X-Persona-Id` headers.
> JWKS verification + DB linkage to Web3Auth `sub` are post-MVP.

## Tests

```bash
# Backend (Vitest)
cd backend && pnpm test                   # 86 tests

# Frontend (Vitest)
npx vitest run                            # 54 tests

# AI service (pytest)
cd ai_service && source .venv/bin/activate && pytest    # 32 tests

# Anchor programs (Anchor + Mocha)
cd smartcontracts && anchor test --provider.cluster localnet    # 35 tests
```

> Always pass `--provider.cluster localnet` to `anchor test`. The repo's
> `Anchor.toml` defaults to devnet, which burns airdrop quota.

## Tech stack

**Frontend**: Vite, React 18, TypeScript, Tailwind, shadcn/ui, React Router 6,
Framer Motion, `@web3auth/modal` (lazy-loaded).

**Backend**: Node 20, Hono, Zod, Drizzle ORM, Postgres, `@coral-xyz/anchor`,
`@solana/web3.js`, Pino logging.

**AI service**: Python 3.11, FastAPI, SQLAlchemy, Anthropic SDK (Claude),
Pydantic for I/O contracts.

**Smart contracts**: Rust, Anchor 0.31+, Token-2022 (rwa_token), Borsh
event coder for the indexer.

**Infra**: Supabase Postgres, Solana devnet (program ID
`2BVJn1DY6Kzni1rXgc1ysZRNPRyKhmWZpyRYSh8x6ouh` for marketplace).

## Status

MVP loop end-to-end on devnet:
- ✅ Synthetic personas (Maria / Ana / Julia) with on-chain wallets
- ✅ Proactive AI alerts (cash-flow gap detection from transaction history)
- ✅ Loan origination (request → approve → disburse, 3 on-chain txs)
- ✅ On-chain behavioral score with HMAC-keyed PDAs
- ✅ Score-as-a-Service public API with API key gate + rate limit
- ✅ Marketplace (create payment request → pay)
- ✅ Indexer worker tailing all 5 programs, populating `impact_events`
- ✅ Impact dashboard pulling live events from the indexer
- ✅ Partner sandbox at `/api-sandbox` for B2B score lookups
- ✅ Web3Auth social login (demo-shaped — frontend gate only)
- 🔜 Stable public deploy + demo rehearsal

## Project language

**English is the source-of-truth language for code, comments, identifiers,
and commit messages.** User-facing copy (UI strings, AI responses to
end-users) may be in Portuguese for the Brazilian audience, but the
surrounding source stays in English.

## License

MIT — see [LICENSE](LICENSE).

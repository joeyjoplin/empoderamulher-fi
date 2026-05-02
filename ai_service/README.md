# EmpowerFI AI Service

FastAPI service that wraps the Anthropic Claude API for the EmpowerFI MVP.

## Run locally

```bash
cd ai_service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in ANTHROPIC_API_KEY
uvicorn app.main:app --reload --port 8000
```

Smoke checks:

```bash
curl http://localhost:8000/health
curl -X POST http://localhost:8000/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Olá"}'
```

## Tests

```bash
pytest
```

Tests do not call the real Anthropic API — `tests/conftest.py` overrides the
`get_anthropic_client` dependency with an `AsyncMock`.

## Environment variables

| Var | Required | Default | Notes |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | yes | — | Server-side only. Never exposed to the frontend. |
| `ANTHROPIC_MODEL` | no | `claude-sonnet-4-6` | |
| `ANTHROPIC_MAX_TOKENS` | no | `1024` | |
| `ANTHROPIC_TIMEOUT_SECONDS` | no | `30` | |
| `ANTHROPIC_MAX_RETRIES` | no | `2` | |
| `LOG_LEVEL` | no | `info` | |
| `CORS_ALLOW_ORIGINS` | no | `["*"]` | JSON list. |

## Docker

```bash
docker build -t empowerfi-ai-service .
docker run --rm -p 8000:8000 --env-file .env empowerfi-ai-service
```

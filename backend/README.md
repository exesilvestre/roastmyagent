# RoastMyAgent backend

FastAPI + PostgreSQL (async SQLAlchemy) + Alembic. LLM API keys are encrypted at rest with Fernet (`FERNET_KEY`).

## Environment

Copy `.env.example` to `.env` in this folder (same file is used when you run Docker Compose from the repo root).

Generate a Fernet key (Python):

```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

Put the output in `FERNET_KEY` in `.env`.

## Database migrations

With Postgres running (e.g. `docker compose up -d db` from the repo root):

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
alembic upgrade head
```

## Run API locally

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

OpenAPI: `http://localhost:8000/docs`

### Main endpoints (v1)

- `GET /health`
- `GET /api/v1/sessions` — list evaluation sessions
- `POST /api/v1/sessions` — create session (optional `agentConnection` in body; HTTP agent endpoints only)
- `PATCH /api/v1/sessions/{id}` — update title/status
- `POST /api/v1/agent-connection/verify` — test an HTTP agent connection without saving
- `POST /api/v1/sessions/{id}/agent-connection/test` — test using stored encrypted secrets
- `GET /api/v1/llm-providers` — list providers (no raw keys)
- `PATCH /api/v1/llm-providers/{provider_id}` — set `api_key` / `model` (JSON body, camelCase accepted)
- `POST /api/v1/llm-providers/{provider_id}/activate` — mark provider active (requires key + model)

## Docker (API + Postgres + frontend)

From repo root, easiest: `./roastmyagent up` or `roastmyagent.cmd up` (generates `FERNET_KEY` into `backend/.env` when empty). Or copy `backend/.env.example` to `backend/.env`, set `FERNET_KEY`, then:

```bash
docker compose up --build
```

The API container runs `alembic upgrade head` on startup before serving. Use `PATCH /api/v1/llm-providers/{id}` only after `FERNET_KEY` is set; otherwise encryption returns `503`.

## Frontend

In `frontend/`, copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_API_URL` (default `http://localhost:8000`) so the UI calls this API.

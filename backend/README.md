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

## Docker (API + Postgres + frontend)

From repo root, easiest: `./roastmyagent up` or `roastmyagent.cmd up` (generates `FERNET_KEY` into `backend/.env` when empty). Or copy `backend/.env.example` to `backend/.env`, set `FERNET_KEY`, then:

```bash
docker compose up --build
```

The API container runs `alembic upgrade head` on startup before serving. Use `PATCH /api/v1/llm-providers/{id}` only after `FERNET_KEY` is set; otherwise encryption returns `503`.

## Frontend

In `frontend/`, copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_API_URL` (default `http://localhost:8000`) so the UI calls this API.

# RoastMyAgent

Open-source, local-first tool to **stress-test AI agents** with adversarial-style prompts and structured evaluation sessions. You run it on your machine and bring your own LLM provider keys—nothing is sent to us.

## Goals

- Help teams and builders **probe agent boundaries** (safety, tool misuse, jailbreaks, data leakage) before production.
- **Session-based workflows**: describe the agent under test, keep configuration in your database, and iterate on runs.
- **Privacy by default**: API keys never leave your infrastructure except to the providers you configure.

## LLM keys and Fernet

The backend stores LLM API keys in PostgreSQL **encrypted at rest** using **Fernet** (symmetric AES, from the `cryptography` library). Each deployment uses a secret **`FERNET_KEY`** you generate once; without it, the API will not persist or decrypt provider keys.

Generate a key:

```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

Put the value in `.env` as `FERNET_KEY`. Treat it like a master password: back it up if you care about recovering stored keys after a restore.

## Stack

| Part       | Tech                          |
| ---------- | ----------------------------- |
| Frontend   | Next.js, TypeScript, Zustand  |
| Backend    | FastAPI, SQLAlchemy, Alembic  |
| Database   | PostgreSQL 16                 |

## Local setup

### Prerequisites

- Docker & Docker Compose **or** Node 20+, Python 3.12+, and a local PostgreSQL instance.

### Option A — Docker (API + Postgres)

From the repo root:

1. Copy `.env.example` → `.env` and set **`FERNET_KEY`** (see above).
2. Start services and apply migrations:

   ```bash
   docker compose up --build -d
   docker compose run --rm api alembic upgrade head
   ```

3. API: `http://localhost:8000` · OpenAPI: `/docs`

4. Frontend (separate terminal):

   ```bash
   cd frontend
   cp .env.example .env.local
   npm install
   npm run dev
   ```

   App: `http://localhost:3000` (uses `NEXT_PUBLIC_API_URL`, default `http://localhost:8000`).

### Option B — Dev without Docker for the API

1. Run PostgreSQL (e.g. same URL as in `.env.example` or adjust `DATABASE_URL`).
2. In `backend/`: create a venv, `pip install -r requirements.txt`, copy `.env.example` → `.env`, set **`FERNET_KEY`** and **`DATABASE_URL`**, then `alembic upgrade head` and `uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`.
3. In `frontend/`: same as step 4 above.

More API detail: [backend/README.md](backend/README.md).

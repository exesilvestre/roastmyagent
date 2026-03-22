# RoastMyAgent

Open-source, local-first tool to **stress-test AI agents** with adversarial-style prompts and structured evaluation sessions. You run it on your machine and bring your own LLM provider keys-nothing is sent to us.

## Goals

- Help teams and builders **probe agent boundaries** (safety, tool misuse, jailbreaks, data leakage) before production.
- **Session-based workflows**: describe the agent under test, keep configuration in your database, and iterate on runs.
- **Privacy by default**: API keys never leave your infrastructure except to the providers you configure.

## LLM keys and Fernet

The backend stores LLM API keys in PostgreSQL **encrypted at rest** using **Fernet** (symmetric AES, from the `cryptography` library). Each deployment needs a **`FERNET_KEY`**; without it, the API will not persist or decrypt provider keys.

**If you use the recommended [`roastmyagent up`](#quick-start-recommended) flow**, the script can create `backend/.env` and generate or write **`FERNET_KEY`** for you (Python with `cryptography`, or Docker, is used only to generate the key when needed).

To set the key yourself, generate one and put it in `backend/.env` as `FERNET_KEY`:

```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

Treat it like a master password: back it up if you care about recovering stored keys after a restore.

Session **agent connection** secrets (bearer token, basic auth password, etc.) use the same `FERNET_KEY`.

Agent connections are **HTTP-only** for now (your agent’s URL, method, and body template). Other transports (for example WebSocket) may be added later.

### Docker and reaching an agent on your host

If the API runs in Docker and your HTTP agent listens on your machine’s `localhost`, use `http://host.docker.internal:<port>` in URLs (not `http://localhost`). The Compose file maps `host.docker.internal` for Linux; Docker Desktop on Windows/macOS provides it by default.

## Stack

| Part       | Tech                          |
| ---------- | ----------------------------- |
| Frontend   | Next.js, TypeScript, Zustand  |
| Backend    | FastAPI, SQLAlchemy, Alembic  |
| Database   | PostgreSQL 16                 |

## Quick start (recommended)

**Prerequisite:** [Docker](https://docs.docker.com/get-docker/) with Compose. Clone the repo, then from the **repository root**:

| Platform | Command |
| -------- | ------- |
| macOS / Linux / Git Bash | `./roastmyagent up` |
| Windows (cmd or PowerShell) | `roastmyagent.cmd up` |

On first run this script: copies [`backend/.env.example`](backend/.env.example) to `backend/.env` if missing; if **`FERNET_KEY`** is empty, asks whether to generate one and **writes it into `backend/.env`**; then runs **`docker compose up --build`** (PostgreSQL, API, Next.js). Same behavior: `scripts/docker-up.sh` or `scripts/docker-up.ps1`.

- **Non-interactive / CI:** `./roastmyagent up --yes` or `CI=true` (generates and writes the key without prompting when `FERNET_KEY` is empty).
- On first build, expect several minutes while images build.

**URLs:** app `http://localhost:3000` · API `http://localhost:8000` · OpenAPI `/docs`

The API container runs Alembic migrations on startup. For production-style deploys you may prefer running migrations outside the container instead of on every boot.

### Alternative: Docker Compose only

If you prefer not to use the script, copy [`backend/.env.example`](backend/.env.example) → `backend/.env`, set **`FERNET_KEY`** (see [LLM keys and Fernet](#llm-keys-and-fernet)), then:

```bash
docker compose up --build
```

### Environment files

- **Backend:** one template, [`backend/.env.example`](backend/.env.example) → `backend/.env` (used by Compose and by local `uvicorn`). `DATABASE_URL` in Compose is overridden for Docker; local dev uses `localhost` in that file.
- **Frontend (dev outside Docker):** [`frontend/.env.example`](frontend/.env.example) → `frontend/.env.local` (`NEXT_PUBLIC_API_URL`, default `http://localhost:8000`). The Dockerized frontend bakes this at build time.

## Local setup

### Prerequisites

- Docker & Docker Compose **or** Node 20+, Python 3.12+, and a local PostgreSQL instance.

### Option A: Docker (full stack)

Use **[Quick start (recommended)](#quick-start-recommended)** (`./roastmyagent up` or `roastmyagent.cmd up`). The manual Compose-only flow is documented there as an alternative.

### Option B: Dev without Docker for the API

1. Run PostgreSQL (e.g. same URL as in `backend/.env.example` or adjust `DATABASE_URL`).
2. In `backend/`: create a venv, `pip install -r requirements.txt`, copy `.env.example` → `.env`, set **`FERNET_KEY`** and **`DATABASE_URL`**, then `alembic upgrade head` and `uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`.
3. In `frontend/`: `cp .env.example .env.local`, `npm install`, `npm run dev` — app at `http://localhost:3000`.

More API detail: [backend/README.md](backend/README.md).

## License

[MIT](LICENSE)

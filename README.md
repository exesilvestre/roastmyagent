# RoastMyAgent

Open-source, local-first tool to **stress-test AI agents** with adversarial prompts and evaluation sessions. You run it on your machine and bring your own provider keys; nothing is sent to us.

## Goals

- Probe agent boundaries (safety, tool misuse, jailbreaks, data leakage) before production.
- Session-based workflows with config stored in your database.
- Privacy by default: keys stay on your infrastructure.

![RoastMyAgent LOGO](frontend/public/roast_my_agent_2.png.png)

## Stack

| Part     | Tech                         |
| -------- | ---------------------------- |
| Frontend | Next.js, TypeScript, Zustand |
| Backend  | FastAPI, SQLAlchemy, Alembic |
| Database | PostgreSQL 16                |

## Quick start (recommended)

**Requires:** [Docker](https://docs.docker.com/get-docker/) with Compose. From the **repo root** after cloning:

| Platform                    | Command             |
| --------------------------- | ------------------- |
| macOS / Linux / Git Bash    | `./roastmyagent up` |
| Windows (cmd / PowerShell)  | `roastmyagent.cmd up` |

The script prepares `backend/.env`, can create a **`FERNET_KEY`** for you (encrypts stored LLM and agent-connection secrets in the DB), then runs **`docker compose up --build`**. Same as `scripts/docker-up.sh` / `scripts/docker-up.ps1`. Non-interactive: `./roastmyagent up --yes`.

**If you run Compose yourself:** copy [`backend/.env.example`](backend/.env.example) → `backend/.env`, set `FERNET_KEY`, then `docker compose up --build`. To generate a key manually (needs Python + `cryptography`):

```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

**URLs:** `http://localhost:3000` (app) · `http://localhost:8000` (API, `/docs` for OpenAPI). First build can take several minutes.

If the API runs in Docker and your agent listens on the host, use `http://host.docker.internal:<port>` in URLs, not `localhost`.

## Local dev (no Docker for the API)

PostgreSQL, then in `backend/`: venv, `pip install -r requirements.txt`, `.env` from `.env.example`, `alembic upgrade head`, `uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`. In `frontend/`: `.env.local` from `.env.example`, `npm install`, `npm run dev`.

Details: [backend/README.md](backend/README.md).

## License

[MIT](LICENSE)

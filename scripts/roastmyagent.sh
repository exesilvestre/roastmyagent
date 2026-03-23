#!/usr/bin/env bash
# RoastMyAgent CLI: prepare backend/.env (Fernet), then docker compose up --build
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

YES=false
CMD="up"
while [[ $# -gt 0 ]]; do
  case "$1" in
    up) CMD="up"; shift ;;
    -y|--yes) YES=true; shift ;;
    -h|--help|help)
      cat <<'EOF'
Usage: roastmyagent up [options]

  Prepares backend/.env (from .env.example if missing), optionally generates
  FERNET_KEY, then runs: docker compose up --build

Options:
  -y, --yes    Generate and write FERNET_KEY without prompting (non-interactive)
  -h, --help   Show this help

Environment:
  CI=true      Same as --yes for key generation when FERNET_KEY is empty
EOF
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      echo "Try: roastmyagent --help" >&2
      exit 1
      ;;
  esac
done

if [[ "$CMD" != "up" ]]; then
  echo "Only 'up' is supported for now." >&2
  exit 1
fi

ENV_FILE="$ROOT/backend/.env"
EXAMPLE="$ROOT/backend/.env.example"

if [[ ! -f "$EXAMPLE" ]]; then
  echo "Missing $EXAMPLE" >&2
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  cp "$EXAMPLE" "$ENV_FILE"
  echo "Created backend/.env from backend/.env.example"
fi

fernet_key_empty() {
  local line
  line="$(grep -E '^FERNET_KEY=' "$ENV_FILE" || true)"
  if [[ -z "$line" ]]; then
    return 0
  fi
  local val="${line#FERNET_KEY=}"
  val="${val//$'\r'/}"
  val="${val#"${val%%[![:space:]]*}"}"
  val="${val%"${val##*[![:space:]]}"}"
  [[ -z "$val" ]]
}

generate_fernet_key() {
  if command -v python3 >/dev/null 2>&1; then
    if python3 -c "from cryptography.fernet import Fernet" >/dev/null 2>&1; then
      python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
      return 0
    fi
  fi
  if command -v python >/dev/null 2>&1; then
    if python -c "from cryptography.fernet import Fernet" >/dev/null 2>&1; then
      python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
      return 0
    fi
  fi
  if command -v docker >/dev/null 2>&1; then
    echo "Generating Fernet key with Docker (python:3.12-slim)…" >&2
    docker run --rm python:3.12-slim sh -c "pip install -q cryptography && python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
    return 0
  fi
  echo "Cannot generate a Fernet key: install Python 3 with the cryptography package," >&2
  echo "or install Docker and retry." >&2
  exit 1
}

write_fernet_key() {
  local key="$1"
  local tmp
  tmp="$(mktemp)"
  if grep -qE '^FERNET_KEY=' "$ENV_FILE"; then
    sed "s|^FERNET_KEY=.*|FERNET_KEY=${key}|" "$ENV_FILE" > "$tmp"
  else
    cp "$ENV_FILE" "$tmp"
    printf '\nFERNET_KEY=%s\n' "$key" >> "$tmp"
  fi
  mv "$tmp" "$ENV_FILE"
}

if fernet_key_empty; then
  auto="${YES}"
  if [[ "${CI:-}" == "true" ]]; then
    auto=true
  fi
  if [[ "$auto" != "true" ]] && [[ -t 0 ]]; then
    read -r -p "FERNET_KEY is empty. Generate one and write it to backend/.env? [Y/n] " ans
    if [[ -n "$ans" ]] && [[ "$ans" =~ ^[Nn] ]]; then
      echo "Set FERNET_KEY in backend/.env, then run: roastmyagent up" >&2
      exit 1
    fi
  elif [[ "$auto" != "true" ]]; then
    echo "FERNET_KEY is empty. Re-run with --yes or set FERNET_KEY in backend/.env" >&2
    exit 1
  fi
  KEY="$(generate_fernet_key)"
  write_fernet_key "$KEY"
  echo "FERNET_KEY written to backend/.env"
  echo "Keep a backup of this key if you need to decrypt existing data after restore."
fi

exec docker compose up --build

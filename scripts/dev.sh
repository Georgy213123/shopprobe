#!/usr/bin/env bash
# Локальный стенд без Docker: миграции, наполнение, API и Vite dev-сервер.
set -euo pipefail
cd "$(dirname "$0")/.."
: "${API_PORT:=8201}" "${WEB_PORT:=5201}"

(cd backend && uv run alembic upgrade head && uv run python -m app.seed)

trap 'kill 0' EXIT INT TERM
(cd backend && uv run uvicorn app.main:app --port "$API_PORT" --reload) &
(cd frontend && API_URL="http://localhost:$API_PORT" npx vite --port "$WEB_PORT" --strictPort) &
echo "витрина: http://localhost:$WEB_PORT  API: http://localhost:$API_PORT/docs  (SEEDED_BUGS=${SEEDED_BUGS:-0})"
wait

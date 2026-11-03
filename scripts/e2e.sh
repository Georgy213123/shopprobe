#!/usr/bin/env bash
# Полный браузерный прогон:
#   1) браузерные тесты ShopProbe на фикстурах;
#   2) витрина в чистом режиме: e2e покупателя + мета-тест «ноль подтверждённых»;
#   3) витрина с SEEDED_BUGS=1: мета-тест «все посаженные дефекты найдены».
# Витрина собирается и отдаётся через `vite preview` (как в проде, без HMR).
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT=$PWD
: "${API_PORT:=8201}" "${WEB_PORT:=5201}"
export E2E_BASE_URL="http://localhost:$WEB_PORT"
LOGS="${E2E_LOGS:-$ROOT/e2e/.logs}"
mkdir -p "$LOGS"

API_PID=""
WEB_PID=""
stop_api() {
  [ -z "$API_PID" ] && return 0
  kill "$API_PID" 2>/dev/null || true
  wait "$API_PID" 2>/dev/null || true
  API_PID=""
  # Следующий запуск не должен попасть на старый процесс.
  for _ in $(seq 1 40); do
    curl -fsS "http://localhost:$API_PORT/api/health" >/dev/null 2>&1 || return 0
    sleep 0.25
  done
  echo "API на :$API_PORT не остановился" >&2; return 1
}
cleanup() {
  stop_api || true
  [ -n "$WEB_PID" ] && kill "$WEB_PID" 2>/dev/null
  return 0
}
trap cleanup EXIT

wait_for() { # url
  for _ in $(seq 1 60); do curl -fsS "$1" >/dev/null 2>&1 && return 0; sleep 0.5; done
  echo "не дождался $1" >&2; return 1
}

start_api() { # seeded 0|1
  (cd backend && SEEDED_BUGS="$1" exec uv run uvicorn app.main:app --port "$API_PORT" \
    >"$LOGS/api-seeded-$1.log" 2>&1) &
  API_PID=$!
  wait_for "http://localhost:$API_PORT/api/health"
}

echo "== ShopProbe: браузерные тесты на фикстурах"
(cd probe && npx vitest run tests/browser)

echo "== стенд: миграции, наполнение, сборка фронта"
(cd backend && uv run alembic upgrade head && uv run python -m app.seed)
(cd frontend && npm run build >/dev/null)
(cd frontend && API_URL="http://localhost:$API_PORT" exec npx vite preview --port "$WEB_PORT" --strictPort \
  >"$LOGS/web.log" 2>&1) &
WEB_PID=$!

echo "== чистая витрина: e2e покупателя и мета-тест"
start_api 0
wait_for "$E2E_BASE_URL/"
(cd e2e && npx playwright test --grep-invert @seeded)
stop_api

echo "== витрина с SEEDED_BUGS=1: мета-тест"
start_api 1
(cd e2e && PLAYWRIGHT_HTML_OUTPUT_DIR=playwright-report-seeded npx playwright test --grep @seeded)
echo "== e2e: всё зелёное"

# ShopProbe + демо-витрина «Чайная полка». Единый интерфейс кейса.
SHELL := /bin/bash
.DEFAULT_GOAL := help

DATABASE_URL ?= postgresql+psycopg://postgres@localhost:55201/shopprobe
# Интеграционные тесты пересоздают схему — только в отдельной базе с суффиксом _test.
TEST_DATABASE_URL ?= postgresql+psycopg://postgres@localhost:55201/shopprobe_test
API_PORT ?= 8201
WEB_PORT ?= 5201
BASE_URL ?= http://localhost:$(WEB_PORT)
export DATABASE_URL TEST_DATABASE_URL API_PORT WEB_PORT

.PHONY: help install up down dev lint format test e2e probe audit openapi

help: ## список целей
	@grep -E '^[a-z-]+:.*##' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  %-10s %s\n", $$1, $$2}'

install: ## зависимости всех пакетов и Chromium для Playwright
	cd backend && uv sync --frozen
	cd frontend && npm ci
	cd probe && npm ci
	cd e2e && npm ci
	cd probe && npx playwright install chromium

up: ## весь стенд в Docker (postgres, backend, frontend); SEEDED_BUGS=1 — с дефектами
	docker compose up --build

down: ## остановить стенд Docker
	docker compose down -v

dev: ## локальный запуск без Docker: API :8201 + Vite :5201 (нужен PostgreSQL в DATABASE_URL)
	./scripts/dev.sh

lint: ## ruff, mypy, eslint, tsc, prettier
	cd backend && uv run ruff check . && uv run ruff format --check . && uv run mypy .
	cd frontend && npx eslint . && npx tsc --noEmit && npx prettier --check .
	cd probe && npx eslint . && npx tsc --noEmit && npx prettier --check .
	cd e2e && npx tsc --noEmit && npx prettier --check .

format: ## автоформат
	cd backend && uv run ruff format . && uv run ruff check --fix .
	cd frontend && npx prettier --write .
	cd probe && npx prettier --write .
	cd e2e && npx prettier --write .

test: ## unit + integration бэкенда (TEST_DATABASE_URL), unit фронта и ShopProbe
	cd backend && uv run pytest
	cd frontend && npx vitest run
	cd probe && npx vitest run tests/unit

e2e: ## стенд + браузерные тесты ShopProbe + e2e витрины + мета-тест (чистый и SEEDED_BUGS=1)
	./scripts/e2e.sh

probe: ## прогон ShopProbe по запущенной витрине (BASE_URL), отчёт в probe/reports/latest
	cd probe && BASE_URL=$(BASE_URL) npx tsx src/cli.ts

audit: ## уязвимости зависимостей
	cd backend && uv run pip-audit --strict --progress-spinner off
	cd frontend && npm audit --audit-level=high
	cd probe && npm audit --audit-level=high
	cd e2e && npm audit --audit-level=high

openapi: ## выгрузить контракт в docs/03-design/openapi.yaml
	cd backend && uv run python -m app.export_openapi

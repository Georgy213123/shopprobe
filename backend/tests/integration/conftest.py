import os
from collections.abc import Iterator
from pathlib import Path

import pytest
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

from alembic import command
from app.config import Settings
from app.db import make_session_factory
from app.main import create_app
from app.seed import seed
from tests.db_guard import require_test_database

BACKEND = Path(__file__).resolve().parents[2]


@pytest.fixture(scope="session")
def database_url() -> str:
    url = os.environ.get("TEST_DATABASE_URL")
    if not url:
        pytest.skip("TEST_DATABASE_URL не задан — интеграционные тесты пропущены")
    # Схема пересоздаётся с нуля: на dev-базе это стёрло бы данные.
    return require_test_database(url)


@pytest.fixture(scope="session")
def migrated(database_url: str) -> str:
    """Схема с нуля через Alembic: тест заодно проверяет миграции."""
    engine = create_engine(database_url)
    with engine.begin() as conn:
        conn.execute(text("DROP SCHEMA public CASCADE; CREATE SCHEMA public"))
    engine.dispose()
    cfg = Config(str(BACKEND / "alembic.ini"))
    cfg.set_main_option("script_location", str(BACKEND / "alembic"))
    cfg.set_main_option("sqlalchemy.url", database_url)
    command.upgrade(cfg, "head")
    engine = create_engine(database_url)
    with make_session_factory(engine)() as session:
        seed(session, reset=True)
    engine.dispose()
    return database_url


@pytest.fixture
def session(migrated: str) -> Iterator[Session]:
    engine = create_engine(migrated)
    with make_session_factory(engine)() as s:
        yield s
    engine.dispose()


@pytest.fixture
def client(migrated: str) -> Iterator[TestClient]:
    with TestClient(create_app(Settings(database_url=migrated, seeded_bugs=False))) as c:
        yield c


@pytest.fixture
def buggy_client(migrated: str) -> Iterator[TestClient]:
    with TestClient(create_app(Settings(database_url=migrated, seeded_bugs=True))) as c:
        yield c

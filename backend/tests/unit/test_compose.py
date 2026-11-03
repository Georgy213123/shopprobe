"""Стенд Docker наружу не открыт (ревью Codex, R1)."""

from pathlib import Path

import yaml

COMPOSE = Path(__file__).resolve().parents[3] / "docker-compose.yml"


def test_published_ports_bound_to_localhost() -> None:
    services = yaml.safe_load(COMPOSE.read_text(encoding="utf-8"))["services"]
    for name, service in services.items():
        for port in service.get("ports", []):
            assert str(port).startswith("127.0.0.1:"), (
                f"{name}: порт {port} открыт на всех интерфейсах"
            )


def test_postgres_password_from_environment() -> None:
    env = yaml.safe_load(COMPOSE.read_text(encoding="utf-8"))["services"]["postgres"]["environment"]
    assert env["POSTGRES_PASSWORD"].startswith("${POSTGRES_PASSWORD")

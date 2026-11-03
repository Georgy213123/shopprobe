"""Выгрузка контракта: `python -m app.export_openapi [путь]`."""

import sys
from pathlib import Path
from typing import Any

import yaml

from app.config import Settings
from app.main import create_app

DEFAULT_PATH = Path(__file__).resolve().parents[2] / "docs" / "03-design" / "openapi.yaml"


def render() -> str:
    spec: dict[str, Any] = create_app(Settings()).openapi()
    return yaml.safe_dump(spec, allow_unicode=True, sort_keys=False)


def main() -> None:
    target = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_PATH
    target.write_text(render(), encoding="utf-8")
    print(f"openapi: {target}")


if __name__ == "__main__":
    main()

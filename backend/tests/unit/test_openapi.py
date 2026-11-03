"""Контракт в docs/03-design/openapi.yaml совпадает с кодом (NFR-05)."""

import yaml

from app.export_openapi import DEFAULT_PATH, render


def test_openapi_file_matches_code() -> None:
    assert DEFAULT_PATH.exists(), "выполните `make openapi`"
    on_disk = yaml.safe_load(DEFAULT_PATH.read_text(encoding="utf-8"))
    assert on_disk == yaml.safe_load(render()), "контракт разошёлся с кодом: `make openapi`"

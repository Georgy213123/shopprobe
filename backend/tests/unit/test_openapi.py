"""Контракт в docs/03-design/openapi.yaml совпадает с кодом (NFR-05)."""

import yaml

from app.export_openapi import DEFAULT_PATH, render


def test_openapi_file_matches_code() -> None:
    assert DEFAULT_PATH.exists(), "выполните `make openapi`"
    on_disk = yaml.safe_load(DEFAULT_PATH.read_text(encoding="utf-8"))
    assert on_disk == yaml.safe_load(render()), "контракт разошёлся с кодом: `make openapi`"


def test_error_responses_have_problem_schema() -> None:
    spec = yaml.safe_load(render())
    for path, code in [
        ("/api/products/{slug}", "404"),
        ("/api/recommendations", "503"),
        ("/api/images/{slug}.svg", "404"),
    ]:
        schema = spec["paths"][path]["get"]["responses"][code]["content"]["application/json"][
            "schema"
        ]
        assert schema == {"$ref": "#/components/schemas/Problem"}

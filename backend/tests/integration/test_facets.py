"""Фасетные счётчики (FR-03, US-02) и регрессия BUG-03."""

from typing import Any

from fastapi.testclient import TestClient


def facet(data: dict[str, Any], key: str) -> dict[str, int]:
    group = next(g for g in data["facets"] if g["key"] == key)
    return {v["value"]: v["count"] for v in group["values"]}


def test_facets_without_filters_cover_whole_catalog(client: TestClient) -> None:
    data = client.get("/api/catalog").json()
    assert facet(data, "category") == {
        "green": 5,
        "black": 6,
        "oolong": 4,
        "puer": 3,
        "white": 3,
        "herbal": 3,
    }
    assert sum(facet(data, "form").values()) == data["total"]


def test_bug03_selected_group_keeps_other_values(client: TestClient) -> None:
    """После выбора «Зелёный» остальные типы видны с честными счётчиками."""
    data = client.get("/api/catalog", params={"category": "green"}).json()
    counts = facet(data, "category")
    assert counts["black"] == 6, "группа сжалась до выбранного значения"
    assert counts["green"] == 5
    # Чужие группы считают с учётом выбранной категории.
    assert facet(data, "origin") == {
        "china": 3,
        "india": 0,
        "japan": 2,
        "srilanka": 0,
        "kenya": 0,
        "russia": 0,
    }


def test_selected_flag(client: TestClient) -> None:
    data = client.get("/api/catalog", params=[("origin", "india"), ("origin", "kenya")]).json()
    group = next(g for g in data["facets"] if g["key"] == "origin")
    assert {v["value"] for v in group["values"] if v["selected"]} == {"india", "kenya"}


def test_in_stock_reduces_every_group(client: TestClient) -> None:
    data = client.get("/api/catalog", params={"in_stock": "true"}).json()
    assert facet(data, "category")["green"] == 4
    assert data["total"] == 21

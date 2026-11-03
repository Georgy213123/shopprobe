"""Валидация параметров каталога (FR-02, NFR-04)."""

import pytest
from pydantic import ValidationError

from app.schemas import CatalogQuery


def test_defaults() -> None:
    q = CatalogQuery()
    assert q.sort == "popular" and q.page == 1 and q.per_page == 24


def test_price_min_greater_than_max_rejected() -> None:
    with pytest.raises(ValidationError, match="price_min"):
        CatalogQuery(price_min=1000, price_max=100)


@pytest.mark.parametrize("per_page", [0, 49])
def test_per_page_bounds(per_page: int) -> None:
    with pytest.raises(ValidationError):
        CatalogQuery(per_page=per_page)


def test_to_filters_keeps_lists_as_tuples() -> None:
    f = CatalogQuery(category=["green", "white"], in_stock=True).to_filters()
    assert f.category == ("green", "white")
    assert f.in_stock is True

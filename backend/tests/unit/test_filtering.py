"""Условия фильтрации каталога (FR-02, FR-03, US-02)."""

from sqlalchemy.dialects import postgresql

from app.filtering import CatalogFilters, FacetGroup, conditions


def sql(filters: CatalogFilters, **kw: object) -> str:
    parts = conditions(filters, **kw)  # type: ignore[arg-type]
    return " AND ".join(
        str(p.compile(dialect=postgresql.dialect(), compile_kwargs={"literal_binds": True}))
        for p in parts
    )


def test_no_filters_no_conditions() -> None:
    assert conditions(CatalogFilters()) == []


def test_all_filters_applied() -> None:
    f = CatalogFilters(
        category=("green",),
        origin=("china", "japan"),
        form=("leaf",),
        price_min=100,
        price_max=900,
        in_stock=True,
    )
    text = sql(f)
    assert "categories.slug IN ('green')" in text
    assert "products.origin IN ('china', 'japan')" in text
    assert "products.form IN ('leaf')" in text
    assert "products.price >= 100" in text
    assert "products.price <= 900" in text
    assert "products.in_stock IS true" in text


def test_bug03_facet_group_ignores_its_own_filter() -> None:
    """BUG-03: счётчик группы не должен учитывать выбор в этой же группе."""
    f = CatalogFilters(category=("green",), origin=("japan",))
    text = sql(f, exclude=FacetGroup.CATEGORY)
    assert "categories.slug" not in text
    assert "products.origin IN ('japan')" in text


def test_price_range_ignores_price_filter() -> None:
    f = CatalogFilters(price_min=500, in_stock=True)
    text = sql(f, include_price=False)
    assert "price" not in text
    assert "in_stock" in text

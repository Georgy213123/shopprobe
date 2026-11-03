"""Фильтры каталога и условия SQL для них.

Фасетный счётчик группы считается по всем фильтрам, кроме фильтра самой группы
(см. docs/06-bugs.md, BUG-03). Иначе после выбора «Зелёный» группа «Тип чая»
сжимается до одного значения и выбрать второй тип уже нельзя.
"""

from dataclasses import dataclass, field
from enum import StrEnum

from sqlalchemy import ColumnElement

from app.models import Category, Product


class FacetGroup(StrEnum):
    CATEGORY = "category"
    ORIGIN = "origin"
    FORM = "form"


@dataclass(frozen=True)
class CatalogFilters:
    category: tuple[str, ...] = field(default_factory=tuple)
    origin: tuple[str, ...] = field(default_factory=tuple)
    form: tuple[str, ...] = field(default_factory=tuple)
    price_min: int | None = None
    price_max: int | None = None
    in_stock: bool = False

    def selected(self, group: FacetGroup) -> tuple[str, ...]:
        values: tuple[str, ...] = getattr(self, group.value)
        return values


def conditions(
    filters: CatalogFilters,
    *,
    exclude: FacetGroup | None = None,
    include_price: bool = True,
) -> list[ColumnElement[bool]]:
    """Условия WHERE. `exclude` — группа, чей собственный фильтр не применяется."""
    result: list[ColumnElement[bool]] = []
    if filters.category and exclude is not FacetGroup.CATEGORY:
        result.append(Category.slug.in_(filters.category))
    if filters.origin and exclude is not FacetGroup.ORIGIN:
        result.append(Product.origin.in_(filters.origin))
    if filters.form and exclude is not FacetGroup.FORM:
        result.append(Product.form.in_(filters.form))
    if include_price and filters.price_min is not None:
        result.append(Product.price >= filters.price_min)
    if include_price and filters.price_max is not None:
        result.append(Product.price <= filters.price_max)
    if filters.in_stock:
        result.append(Product.in_stock.is_(True))
    return result

from sqlalchemy import Select, func, select
from sqlalchemy.orm import InstrumentedAttribute, Session, joinedload

from app.dictionaries import FORMS, ORIGINS
from app.filtering import CatalogFilters, FacetGroup, conditions
from app.models import Category, Product
from app.schemas import (
    CategoryOut,
    FacetGroupOut,
    FacetValue,
    PriceRange,
    ProductCard,
    ProductDetail,
    SortOrder,
)

FACET_TITLES: dict[FacetGroup, str] = {
    FacetGroup.CATEGORY: "Тип чая",
    FacetGroup.ORIGIN: "Страна",
    FacetGroup.FORM: "Форма",
}


def image_url(slug: str) -> str:
    return f"/api/images/{slug}.svg"


def to_card(p: Product) -> ProductCard:
    return ProductCard(
        slug=p.slug,
        name=p.name,
        category=p.category.slug,
        category_title=p.category.title,
        origin=p.origin,
        origin_title=ORIGINS.get(p.origin, p.origin),
        form=p.form,
        form_title=FORMS.get(p.form, p.form),
        price=p.price,
        weight_g=p.weight_g,
        in_stock=p.in_stock,
        image_url=image_url(p.slug),
    )


def _base() -> Select[Product]:
    return select(Product).join(Product.category).options(joinedload(Product.category))


def _order(stmt: Select[Product], sort: SortOrder) -> Select[Product]:
    match sort:
        case "price_asc":
            return stmt.order_by(Product.price.asc(), Product.id)
        case "price_desc":
            return stmt.order_by(Product.price.desc(), Product.id)
        case "name":
            return stmt.order_by(Product.name, Product.id)
        case _:
            return stmt.order_by(Product.id)


def list_products(
    session: Session, filters: CatalogFilters, sort: SortOrder, page: int, per_page: int
) -> tuple[list[ProductCard], int]:
    where = conditions(filters)
    total = session.scalar(select(func.count(Product.id)).join(Product.category).where(*where))
    stmt = _order(_base().where(*where), sort).offset((page - 1) * per_page).limit(per_page)
    items = [to_card(p) for p in session.scalars(stmt).unique()]
    return items, int(total or 0)


def compute_facets(session: Session, filters: CatalogFilters) -> list[FacetGroupOut]:
    """Счётчики по каждой группе: фильтры остальных групп применены, своей — нет."""
    category_titles = dict(
        session.execute(select(Category.slug, Category.title).order_by(Category.sort_order)).all()
    )
    groups: list[FacetGroupOut] = []
    columns: dict[FacetGroup, tuple[InstrumentedAttribute[str], dict[str, str]]] = {
        FacetGroup.CATEGORY: (Category.slug, category_titles),
        FacetGroup.ORIGIN: (Product.origin, ORIGINS),
        FacetGroup.FORM: (Product.form, FORMS),
    }
    for group in FacetGroup:
        column_expr, labels = columns[group]
        rows = session.execute(
            select(column_expr, func.count(Product.id))
            .join(Product.category)
            .where(*conditions(filters, exclude=group))
            .group_by(column_expr)
        ).all()
        counts = dict(rows)
        selected = set(filters.selected(group))
        groups.append(
            FacetGroupOut(
                key=group.value,
                title=FACET_TITLES[group],
                values=[
                    FacetValue(
                        value=value,
                        label=label,
                        count=int(counts.get(value, 0)),
                        selected=value in selected,
                    )
                    for value, label in labels.items()
                ],
            )
        )
    return groups


def price_range(session: Session, filters: CatalogFilters) -> PriceRange:
    lo, hi = session.execute(
        select(func.min(Product.price), func.max(Product.price))
        .join(Product.category)
        .where(*conditions(filters, include_price=False))
    ).one()
    return PriceRange(min=lo, max=hi)


def list_categories(session: Session) -> list[CategoryOut]:
    rows = session.execute(
        select(Category.slug, Category.title, func.count(Product.id))
        .outerjoin(Product, Product.category_id == Category.id)
        .group_by(Category.id)
        .order_by(Category.sort_order)
    )
    return [CategoryOut(slug=s, title=t, product_count=int(c)) for s, t, c in rows]


def get_product(session: Session, slug: str) -> ProductDetail | None:
    p = session.scalars(_base().where(Product.slug == slug)).unique().one_or_none()
    if p is None:
        return None
    return ProductDetail(**to_card(p).model_dump(), description=p.description)


def recommendations(session: Session, limit: int = 4) -> list[ProductCard]:
    stmt = _base().where(Product.in_stock.is_(True)).order_by(Product.price.desc()).limit(limit)
    return [to_card(p) for p in session.scalars(stmt).unique()]

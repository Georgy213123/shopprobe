from typing import Annotated

from fastapi import APIRouter, Depends, FastAPI, HTTPException, Query, Request, Response
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app import repository
from app.config import Settings, get_settings
from app.db import get_session, make_engine, make_session_factory
from app.images import BROKEN_SVG, product_svg
from app.models import Product
from app.schemas import (
    CatalogPage,
    CatalogQuery,
    CategoryOut,
    Health,
    Meta,
    ProductCard,
    ProductDetail,
)
from app.seeded_bugs import BROKEN_IMAGE_SLUG, FlakyGate

SessionDep = Annotated[Session, Depends(get_session)]

router = APIRouter(prefix="/api")


def _settings(request: Request) -> Settings:
    settings: Settings = request.app.state.settings
    return settings


SettingsDep = Annotated[Settings, Depends(_settings)]


@router.get("/health", tags=["service"])
def health(session: SessionDep) -> Health:
    session.execute(text("select 1"))
    return Health(status="ok")


@router.get("/meta", tags=["service"])
def meta(settings: SettingsDep) -> Meta:
    return Meta(name="Чайная полка", seeded_bugs=settings.seeded_bugs)


@router.get("/categories", tags=["catalog"])
def categories(session: SessionDep) -> list[CategoryOut]:
    return repository.list_categories(session)


@router.get("/catalog", tags=["catalog"])
def catalog(session: SessionDep, query: Annotated[CatalogQuery, Query()]) -> CatalogPage:
    filters = query.to_filters()
    items, total = repository.list_products(
        session, filters, query.sort, query.page, query.per_page
    )
    return CatalogPage(
        items=items,
        total=total,
        page=query.page,
        per_page=query.per_page,
        facets=repository.compute_facets(session, filters),
        price_range=repository.price_range(session, filters),
    )


@router.get(
    "/products/{slug}",
    tags=["catalog"],
    responses={404: {"description": "Товар не найден"}},
)
def product(slug: str, session: SessionDep) -> ProductDetail:
    found = repository.get_product(session, slug)
    if found is None:
        raise HTTPException(status_code=404, detail="Товар не найден")
    return found


@router.get(
    "/recommendations",
    tags=["catalog"],
    responses={503: {"description": "Сервис рекомендаций недоступен (посаженный дефект)"}},
)
def recommendations(
    request: Request, session: SessionDep, settings: SettingsDep
) -> list[ProductCard]:
    gate: FlakyGate = request.app.state.flaky_gate
    if settings.seeded_bugs and gate.should_fail():
        raise HTTPException(status_code=503, detail="Сервис рекомендаций недоступен")
    return repository.recommendations(session)


@router.get(
    "/images/{slug}.svg",
    tags=["media"],
    response_class=Response,
    responses={200: {"content": {"image/svg+xml": {}}}, 404: {"description": "Нет товара"}},
)
def image(slug: str, session: SessionDep, settings: SettingsDep) -> Response:
    p = session.scalars(select(Product).where(Product.slug == slug)).one_or_none()
    if p is None:
        raise HTTPException(status_code=404, detail="Нет товара")
    body = (
        BROKEN_SVG
        if settings.seeded_bugs and slug == BROKEN_IMAGE_SLUG
        else product_svg(p.name, p.category.slug)
    )
    return Response(
        content=body,
        media_type="image/svg+xml",
        headers={"Cache-Control": "no-store"},
    )


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    app = FastAPI(
        title="Чайная полка — API демо-витрины",
        version="1.0.0",
        description="Каталог с фасетным фильтром. Демо-витрина для проверки ShopProbe.",
    )
    engine = make_engine(settings.database_url)
    app.state.settings = settings
    app.state.engine = engine
    app.state.session_factory = make_session_factory(engine)
    app.state.flaky_gate = FlakyGate()
    app.include_router(router)
    return app


app = create_app()

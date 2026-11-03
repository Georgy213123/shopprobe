from typing import Literal, Self

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.filtering import CatalogFilters

SortOrder = Literal["popular", "price_asc", "price_desc", "name"]


class CatalogQuery(BaseModel):
    """Параметры запроса каталога (query string)."""

    model_config = ConfigDict(extra="forbid")

    category: list[str] = Field(default_factory=list)
    origin: list[str] = Field(default_factory=list)
    form: list[str] = Field(default_factory=list)
    price_min: int | None = Field(default=None, ge=0)
    price_max: int | None = Field(default=None, ge=0)
    in_stock: bool = False
    sort: SortOrder = "popular"
    page: int = Field(default=1, ge=1)
    per_page: int = Field(default=24, ge=1, le=48)

    @model_validator(mode="after")
    def _price_range(self) -> Self:
        if (
            self.price_min is not None
            and self.price_max is not None
            and self.price_min > self.price_max
        ):
            raise ValueError("price_min не может быть больше price_max")
        return self

    def to_filters(self) -> CatalogFilters:
        return CatalogFilters(
            category=tuple(self.category),
            origin=tuple(self.origin),
            form=tuple(self.form),
            price_min=self.price_min,
            price_max=self.price_max,
            in_stock=self.in_stock,
        )


class CategoryOut(BaseModel):
    slug: str
    title: str
    product_count: int


class ProductCard(BaseModel):
    slug: str
    name: str
    category: str
    category_title: str
    origin: str
    origin_title: str
    form: str
    form_title: str
    price: int
    weight_g: int
    in_stock: bool
    image_url: str


class ProductDetail(ProductCard):
    description: str


class FacetValue(BaseModel):
    value: str
    label: str
    count: int
    selected: bool


class FacetGroupOut(BaseModel):
    key: str
    title: str
    values: list[FacetValue]


class PriceRange(BaseModel):
    min: int | None
    max: int | None


class CatalogPage(BaseModel):
    items: list[ProductCard]
    total: int
    page: int
    per_page: int
    facets: list[FacetGroupOut]
    price_range: PriceRange


class Meta(BaseModel):
    name: str
    seeded_bugs: bool


class Health(BaseModel):
    status: Literal["ok"]

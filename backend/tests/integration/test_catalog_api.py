"""Каталог через HTTP на реальном PostgreSQL (US-01, US-02, US-03)."""

from fastapi.testclient import TestClient

from app.seed import PRODUCTS


def test_health(client: TestClient) -> None:
    assert client.get("/api/health").json() == {"status": "ok"}


def test_meta_reports_clean_mode(client: TestClient) -> None:
    assert client.get("/api/meta").json()["seeded_bugs"] is False


def test_categories_with_counts(client: TestClient) -> None:
    data = client.get("/api/categories").json()
    assert [c["slug"] for c in data][:2] == ["green", "black"]
    assert sum(c["product_count"] for c in data) == len(PRODUCTS)


def test_catalog_unfiltered_returns_everything(client: TestClient) -> None:
    data = client.get("/api/catalog").json()
    assert data["total"] == len(PRODUCTS)
    assert len(data["items"]) == len(PRODUCTS)
    assert data["price_range"] == {"min": 240, "max": 1890}


def test_us02_filter_by_category_and_several_origins(client: TestClient) -> None:
    data = client.get(
        "/api/catalog", params=[("category", "green"), ("origin", "china"), ("origin", "japan")]
    ).json()
    assert data["total"] == 5
    assert {i["category"] for i in data["items"]} == {"green"}


def test_us02_filter_by_price_and_stock(client: TestClient) -> None:
    data = client.get(
        "/api/catalog", params={"price_min": 500, "price_max": 1000, "in_stock": "true"}
    ).json()
    prices = [i["price"] for i in data["items"]]
    assert prices and all(500 <= p <= 1000 for p in prices)
    assert all(i["in_stock"] for i in data["items"])


def test_sort_and_pagination(client: TestClient) -> None:
    pages = [
        client.get("/api/catalog", params={"sort": "price_asc", "per_page": 5, "page": n}).json()
        for n in range(1, 6)
    ]
    slugs = [i["slug"] for p in pages for i in p["items"]]
    prices = [i["price"] for p in pages for i in p["items"]]
    assert prices == sorted(prices)
    assert pages[0]["total"] == len(PRODUCTS)
    # Страницы не пересекаются и вместе дают весь каталог (ревью Codex, R11).
    assert len(slugs) == len(set(slugs)) == len(PRODUCTS)
    assert len(pages[-1]["items"]) == 4  # 24 товара по 5: на пятой странице четыре


def test_invalid_price_range_is_422(client: TestClient) -> None:
    r = client.get("/api/catalog", params={"price_min": 900, "price_max": 100})
    assert r.status_code == 422


def test_unknown_query_param_is_422(client: TestClient) -> None:
    assert client.get("/api/catalog", params={"colour": "red"}).status_code == 422


def test_us03_product_card(client: TestClient) -> None:
    data = client.get("/api/products/sencha-utrennyaya").json()
    assert data["name"] == "Сенча утренняя"
    assert data["origin_title"] == "Япония"
    assert data["image_url"] == "/api/images/sencha-utrennyaya.svg"
    assert data["description"]


def test_product_not_found(client: TestClient) -> None:
    assert client.get("/api/products/net-takogo").status_code == 404


def test_image_is_svg(client: TestClient) -> None:
    r = client.get("/api/images/sencha-utrennyaya.svg")
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("image/svg+xml")
    assert r.content.startswith(b"<svg")

"""Наполнение каталога вымышленными товарами. Идемпотентно: повторный запуск ничего не ломает."""

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import make_engine, make_session_factory
from app.models import Category, Product

CATEGORIES: list[tuple[str, str]] = [
    ("green", "Зелёный"),
    ("black", "Чёрный"),
    ("oolong", "Улун"),
    ("puer", "Пуэр"),
    ("white", "Белый"),
    ("herbal", "Травяной"),
]

# slug, название, категория, страна, форма, цена, вес, в наличии
PRODUCTS: list[tuple[str, str, str, str, str, int, int, bool]] = [
    ("lun-czin-vesennij", "Лунцзин весенний", "green", "china", "leaf", 890, 100, True),
    ("sencha-utrennyaya", "Сенча утренняя", "green", "japan", "leaf", 760, 100, True),
    ("gyokuro-tenevoj", "Гёкуро теневой", "green", "japan", "leaf", 1450, 50, True),
    ("bi-lo-chun", "Би Ло Чунь", "green", "china", "leaf", 980, 100, False),
    ("zelenyj-na-kazhdyj-den", "Зелёный на каждый день", "green", "china", "bags", 290, 50, True),
    ("assam-krepkij", "Ассам крепкий", "black", "india", "leaf", 540, 100, True),
    ("darjeeling-pervyj-sbor", "Дарджилинг первый сбор", "black", "india", "leaf", 1290, 100, True),
    ("cejlon-vysokogornyj", "Цейлон высокогорный", "black", "srilanka", "leaf", 620, 100, True),
    (
        "kenijskij-granulirovannyj",
        "Кенийский гранулированный",
        "black",
        "kenya",
        "leaf",
        380,
        200,
        True,
    ),
    ("krasnodarskij-chernyj", "Краснодарский чёрный", "black", "russia", "leaf", 450, 100, True),
    ("utrennij-v-paketikah", "Утренний в пакетиках", "black", "srilanka", "bags", 260, 50, True),
    ("te-guan-in", "Те Гуань Инь", "oolong", "china", "leaf", 960, 100, True),
    ("da-hun-pao", "Да Хун Пао", "oolong", "china", "leaf", 1380, 100, True),
    ("molochnyj-ulun", "Молочный улун", "oolong", "china", "leaf", 720, 100, True),
    ("dun-din-ulun", "Дун Дин", "oolong", "china", "leaf", 1120, 100, False),
    (
        "shu-puer-staroe-derevo",
        "Шу пуэр «Старое дерево»",
        "puer",
        "china",
        "pressed",
        1650,
        357,
        True,
    ),
    ("shen-puer-gornyj", "Шен пуэр горный", "puer", "china", "pressed", 1890, 357, True),
    ("puer-tochi", "Пуэр точа", "puer", "china", "pressed", 540, 100, True),
    ("bajhao-inchzhen", "Байхао Иньчжэнь", "white", "china", "leaf", 1790, 50, True),
    ("baj-mu-dan", "Бай Му Дань", "white", "china", "leaf", 990, 100, True),
    ("shou-mej-pressovannyj", "Шоу Мэй прессованный", "white", "china", "pressed", 830, 100, True),
    ("ivan-chaj-ferment", "Иван-чай ферментированный", "herbal", "russia", "leaf", 390, 100, True),
    ("mata-s-myatoj", "Мята и чабрец", "herbal", "russia", "bags", 240, 40, True),
    ("rojbush-klassicheskij", "Ройбуш классический", "herbal", "srilanka", "leaf", 470, 100, False),
]


def describe(name: str, category_title: str) -> str:
    return (
        f"{name} — {category_title.lower()} чай из ассортимента «Чайной полки». "
        "Заваривать 3–4 минуты, вода 80–95 °C в зависимости от сорта."
    )


def seed(session: Session, *, reset: bool = False) -> None:
    if reset:
        session.execute(delete(Product))
        session.execute(delete(Category))
    existing = {c.slug: c for c in session.scalars(select(Category))}
    for order, (slug, title) in enumerate(CATEGORIES):
        if slug not in existing:
            existing[slug] = Category(slug=slug, title=title, sort_order=order)
            session.add(existing[slug])
    session.flush()
    known = set(session.scalars(select(Product.slug)))
    for slug, name, cat, origin, form, price, weight, stock in PRODUCTS:
        if slug in known:
            continue
        category = existing[cat]
        session.add(
            Product(
                slug=slug,
                name=name,
                category_id=category.id,
                origin=origin,
                form=form,
                price=price,
                weight_g=weight,
                in_stock=stock,
                description=describe(name, category.title),
            )
        )
    session.commit()


def main() -> None:
    engine = make_engine(get_settings().database_url)
    with make_session_factory(engine)() as session:
        seed(session)
    print(f"seed: категорий {len(CATEGORIES)}, товаров {len(PRODUCTS)}")


if __name__ == "__main__":
    main()

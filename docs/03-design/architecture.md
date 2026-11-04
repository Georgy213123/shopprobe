# Архитектура

## C4: контекст

```mermaid
C4Context
  Person(dev, "Разработчик")
  Person(owner, "Владелец")
  System(probe, "ShopProbe")
  System_Ext(store, "Витрина", "любая; в демо «Чайная полка»")
  System_Ext(ci, "CI", "make e2e, make probe")
  Rel(dev, probe, "make probe")
  Rel(ci, probe, "код выхода")
  Rel(probe, store, "Chromium", "HTTP")
  Rel(owner, probe, "report.html")
```

ShopProbe видит витрину как покупатель: браузер и HTTP, без доступа к коду и базе
([ADR-0002](adr/0002-store-as-black-box.md)).

## C4: контейнеры

```mermaid
C4Container
  Person(dev, "Разработчик")
  Container(probe, "ShopProbe CLI", "TypeScript, Playwright, axe-core", "прогон, перепроверка, отчёт")
  ContainerDb(chromium, "Chromium", "Playwright 1.62.1")
  Container(web, "Фронт витрины", "React 19, Vite")
  Container(api, "API витрины", "FastAPI, Python 3.12", "каталог, фасеты, флаг SEEDED_BUGS")
  ContainerDb(db, "PostgreSQL 16", "")
  Rel(dev, probe, "make probe")
  Rel(probe, chromium, "CDP")
  Rel(chromium, web, "HTTP")
  Rel(web, api, "/api/*")
  Rel(api, db, "SQL")
```

Стек — [ADR-0001](adr/0001-stack.md).

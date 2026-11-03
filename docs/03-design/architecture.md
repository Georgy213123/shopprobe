# Архитектура

## C4: контекст

```mermaid
C4Context
  title ShopProbe — контекст
  Person(dev, "Разработчик", "запускает прогон, чинит находки")
  Person(owner, "Владелец магазина", "читает отчёт, решает о выкатке")
  System(probe, "ShopProbe", "Playwright-проверки витрины с перепроверкой находок")
  System_Ext(store, "Интернет-витрина", "любая; в демо — «Чайная полка»")
  System_Ext(ci, "CI", "гоняет make e2e / make probe на сборке")
  Rel(dev, probe, "make probe, probe.config.ts")
  Rel(ci, probe, "запускает, читает код выхода")
  Rel(probe, store, "открывает страницы в Chromium", "HTTP")
  Rel(owner, probe, "читает report.html")
```

ShopProbe смотрит на витрину как покупатель: только через браузер и HTTP, без доступа
к её коду и базе ([ADR-0002](adr/0002-store-as-black-box.md)).

## C4: контейнеры

```mermaid
C4Container
  title ShopProbe и демо-витрина — контейнеры
  Person(dev, "Разработчик")
  Container_Boundary(p, "ShopProbe (probe/)") {
    Container(cli, "CLI", "TypeScript, tsx", "читает конфиг, запускает прогон, пишет отчёт, код выхода")
    Container(runner, "Раннер и перепроверка", "TypeScript", "маршруты × вьюпорты, новый контекст на визит, N повторов")
    Container(checks, "Проверки", "Playwright, axe-core", "консоль, HTTP, картинки, скролл, h1, доступность")
    Container(report, "Отчёт", "JSON + HTML", "reports/latest/")
    ContainerDb(chromium, "Chromium", "Playwright 1.62.1", "локальный браузер")
  }
  Container_Boundary(s, "Демо-витрина «Чайная полка»") {
    Container(web, "Фронт", "React 19, Vite", "главная, каталог, карточка, корзина в localStorage")
    Container(api, "API", "FastAPI, Python 3.12", "каталог, фасеты, карточка, картинки, флаг SEEDED_BUGS")
    ContainerDb(db, "PostgreSQL 16", "", "категории и товары")
  }
  Rel(dev, cli, "make probe")
  Rel(cli, runner, "")
  Rel(runner, checks, "")
  Rel(checks, chromium, "CDP")
  Rel(chromium, web, "HTTP :5201")
  Rel(web, api, "/api/* (прокси Vite или nginx)")
  Rel(api, db, "SQLAlchemy")
  Rel(cli, report, "пишет")
```

## Как устроен визит страницы

```mermaid
sequenceDiagram
  participant R as Раннер
  participant B as Chromium (новый контекст)
  participant S as Витрина
  R->>B: newContext(viewport W×H, locale ru-RU)
  R->>B: подписка: console, pageerror, response ≥ 400, requestfailed
  R->>B: goto(url, domcontentloaded)
  B->>S: документ, скрипты, стили, /api/*
  R->>B: waitForStable: load, networkidle, document.fonts.ready, 2 кадра
  R->>B: preparePage: прокрутка до конца, картинки, сеть, наверх
  R->>B: h-scroll → single-h1 → axe → broken-image → console → http
  B-->>R: находки с отпечатками
  R->>B: context.close()
```

Прокрутка идёт до всех проверок: раскладка, h1 и axe видят то, что страница подгружает
при прокрутке (BUG-07). Консоль и сеть — последними: в них попадает всё, что случилось за визит.

## Модули probe/

| Файл | Ответственность |
|---|---|
| `src/config.ts` | `defineConfig`, значения по умолчанию, слияние с флагами CLI, валидация |
| `src/inspect.ts` | один визит: контекст, подписки на события, ожидание, подготовка, проверки, сбой проверки → находка |
| `src/run.ts` | основной проход, перепроверка, сводка, код выхода |
| `src/checks/*.ts` | по файлу на проверку; общий контракт `Check = (ctx) => Promise<Finding[]>` |
| `src/finding.ts` | отпечаток, шаги воспроизведения, вердикт, нормализация текста консоли |
| `src/report/*.ts` | HTML с экранированием, JSON, консольная сводка |
| `src/cli.ts` | разбор аргументов, загрузка `probe.config.ts`, коды выхода 0/1/2 |

Новая проверка = новый файл в `checks/` и строка в `checks/index.ts`. Раннер и отчёт
о ней ничего не знают.

## Посаженные дефекты

Флаг `SEEDED_BUGS` читает только бэкенд. Фронт узнаёт его из `GET /api/meta`, поэтому
одна сборка фронта обслуживает оба режима, и мета-тест переключает режим перезапуском
API ([ADR-0004](adr/0004-seeded-bugs-runtime-flag.md)).

| Дефект | Где живёт | Как устроен |
|---|---|---|
| Битая картинка | API | `/api/images/shu-puer-staroe-derevo.svg` отдаёт 200 и обрезанный SVG |
| Нестабильный запрос | API | `/api/recommendations` отвечает 503 на каждый нечётный вызов |
| Ошибка в консоли | фронт | виджет отзывов на карточке пишет `console.error` |
| 404 статического ресурса | фронт | `<link rel="stylesheet" href="/assets/legacy-promo.css">` на всех страницах |
| Горизонтальный скролл на 390 px | фронт | промо-полоса шириной 520 px на главной |
| Два h1 | фронт | второй h1 «Скидки недели» в каталоге |
| Низкий контраст | фронт | кнопка «Добавить в корзину» #a3aba0 на #e3e8e1 |

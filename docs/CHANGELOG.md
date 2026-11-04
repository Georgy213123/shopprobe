# Changelog

Формат — [Keep a Changelog](https://keepachangelog.com/ru/1.1.0/), версии — [SemVer](https://semver.org/lang/ru/).

## [1.0.2] — 2026-11-04
- Fixed: BUG-09, под дев-сервером Vite ошибки консоли приложения больше не отбрасываются.

## [1.0.1] — 2026-11-04
- Fixed: правки по ревью Codex R1…R11 ([04](04-ai-development.md)), в том числе BUG-06…BUG-08.
- Changed: `make test` идёт на отдельную базу с суффиксом `_test`.

## [1.0.0] — 2026-11-03
- Added: мета-тест в `make e2e`, сбой проверки как находка, CLI-тест под tsx, `make probe`.
- Fixed: BUG-04, BUG-05, сбой `__name` под tsx.

## [0.4.0] — 2026-10-30
- Added: перепроверка, HTML-отчёт, коды выхода. Fixed: BUG-02.

## [0.3.0] — 2026-10-27
- Added: axe-core, демо-витрина, `SEEDED_BUGS=1`. Fixed: BUG-03.

## [0.2.0] — 2026-10-24
- Added: два вьюпорта, скролл, h1, `report.json`. Fixed: BUG-01.

## [0.1.0] — 2026-10-21
- Added: проверки консоли, HTTP, картинок, сводка в консоль.

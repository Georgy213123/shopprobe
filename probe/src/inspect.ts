import type { Browser } from 'playwright';
import { CHECKS } from './checks';
import type { CheckContext, ConsoleEvent, HttpEvent } from './checks/context';
import type { ProbeConfig } from './config';
import { dedupe, makeFinding } from './finding';
import { preparePage, waitForStable } from './page';
import type { CheckId, Finding, Viewport } from './types';

export interface Visit {
  status: number | null;
  durationMs: number;
  findings: Finding[];
}

export function routeUrl(baseUrl: string, route: string): string {
  return new URL(route, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`).toString();
}

/**
 * Один визит: новый контекст браузера (без кэша, cookies и localStorage),
 * навигация, проверки. Используется и в основном проходе, и в перепроверке.
 */
export async function inspectPage(
  browser: Browser,
  config: ProbeConfig,
  route: string,
  viewport: Viewport,
  only: ReadonlySet<CheckId> = new Set(config.checks),
): Promise<Visit> {
  const started = Date.now();
  const url = routeUrl(config.baseUrl, route);
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    locale: 'ru-RU',
  });
  const page = await context.newPage();
  const consoleEvents: ConsoleEvent[] = [];
  const httpEvents: HttpEvent[] = [];

  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const loc = msg.location();
    consoleEvents.push({ kind: 'console', text: msg.text(), location: loc.url ?? '' });
  });
  page.on('pageerror', (err) => {
    // Источник исключения — в стеке: по нему отсекаются клиент HMR и расширения.
    consoleEvents.push({
      kind: 'pageerror',
      text: `${err.name}: ${err.message}`,
      location: err.stack ?? '',
    });
  });
  page.on('response', (res) => {
    if (res.status() < 400) return;
    const req = res.request();
    httpEvents.push({
      url: res.url(),
      status: res.status(),
      resourceType: req.resourceType(),
      method: req.method(),
    });
  });
  page.on('requestfailed', (req) => {
    const error = req.failure()?.errorText ?? '';
    // Отмена запроса при уходе со страницы или по AbortController — не дефект.
    if (error.includes('ERR_ABORTED')) return;
    httpEvents.push({
      url: req.url(),
      status: 'failed',
      resourceType: req.resourceType(),
      method: req.method(),
      error,
    });
  });

  const findings: Finding[] = [];
  let status: number | null = null;
  const message = (err: unknown) =>
    err instanceof Error ? (err.message.split('\n')[0] ?? err.message) : String(err);
  try {
    try {
      const response = await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: config.timeouts.navigationMs,
      });
      status = response?.status() ?? null;
      // Все проверки работают по устоявшейся странице: стили, шрифты, сеть (BUG-02).
      await waitForStable(page, config.timeouts.settleMs);
      await preparePage(page, config.timeouts.imagesMs);
    } catch (err) {
      findings.push(
        makeFinding({
          check: 'http',
          route,
          url,
          viewport,
          severity: 'critical',
          title: 'Страница не открылась',
          details: message(err),
          target: 'navigation',
          action: 'Дождаться загрузки страницы.',
          expected: 'страница открывается',
          actual: 'навигация завершилась ошибкой или таймаутом',
        }),
      );
      return { status, durationMs: Date.now() - started, findings };
    }
    const ctx: CheckContext = { page, route, url, viewport, config, consoleEvents, httpEvents };
    for (const [id, check] of CHECKS) {
      if (!only.has(id)) continue;
      try {
        findings.push(...(await check(ctx)));
      } catch (err) {
        // Сбой самой проверки — тоже находка, иначе прогон молча «зеленеет».
        findings.push(
          makeFinding({
            check: id,
            route,
            url,
            viewport,
            severity: 'critical',
            title: 'Проверка не выполнилась',
            details: message(err),
            target: 'probe-error',
            action: `Запустить ShopProbe только с проверкой ${id}.`,
            expected: 'проверка отрабатывает',
            actual: `ошибка инструмента: ${message(err)}`,
          }),
        );
      }
    }
  } finally {
    await context.close();
  }
  return { status, durationMs: Date.now() - started, findings: dedupe(findings) };
}

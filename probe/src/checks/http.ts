import { matches } from '../config';
import { makeFinding } from '../finding';
import type { Severity } from '../types';
import type { Check } from './context';

/** 500 и 503 — одна поломка: отпечаток берёт класс ответа, точный код идёт в подробности. */
export function statusClass(status: number | 'failed'): string {
  return status === 'failed' ? 'failed' : `${Math.floor(status / 100)}xx`;
}

/** Без query: cache-buster и метки не должны делать из одной поломки разные находки. */
export function withoutQuery(path: string): string {
  return path.split('?')[0] ?? path;
}

function pathOf(url: string, base: string): string {
  try {
    const u = new URL(url);
    return u.origin === new URL(base).origin ? `${u.pathname}${u.search}` : url;
  } catch {
    return url;
  }
}

export const httpCheck: Check = async (ctx) =>
  ctx.httpEvents
    .filter((e) => !matches(e.url, ctx.config.http.ignore))
    .map((e) => {
      const isDocument = e.resourceType === 'document';
      const severity: Severity = isDocument ? 'critical' : 'serious';
      const shown = pathOf(e.url, ctx.config.baseUrl);
      const code = e.status === 'failed' ? `сбой (${e.error ?? 'нет ответа'})` : String(e.status);
      return makeFinding({
        check: 'http',
        route: ctx.route,
        url: ctx.url,
        viewport: ctx.viewport,
        severity,
        title: isDocument ? `Страница отвечает ${code}` : `Ресурс отвечает ${code}`,
        details: `${e.method} ${shown} → ${code} (${e.resourceType})`,
        target: `${e.method} ${withoutQuery(shown)} ${statusClass(e.status)}`,
        action: 'Открыть DevTools → Network, перезагрузить страницу.',
        expected: 'все запросы отвечают кодом < 400',
        actual: `${e.method} ${shown} — ${code}`,
      });
    });

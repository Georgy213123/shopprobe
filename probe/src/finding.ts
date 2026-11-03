import { createHash } from 'node:crypto';
import type { CheckId, Finding, Retest, Severity, Verdict, Viewport } from './types';
import { SEVERITY_RANK } from './types';

export interface FindingInput {
  check: CheckId;
  route: string;
  url: string;
  viewport: Viewport;
  severity: Severity;
  title: string;
  details: string;
  target: string;
  /** Что сделать на открытой странице, чтобы увидеть дефект. */
  action: string;
  expected: string;
  actual: string;
}

export function fingerprint(check: CheckId, route: string, viewport: string, target: string) {
  return createHash('sha1')
    .update([check, route, viewport, target].join('\u0000'))
    .digest('hex')
    .slice(0, 12);
}

export function makeFinding(i: FindingInput): Finding {
  return {
    id: fingerprint(i.check, i.route, i.viewport.name, i.target),
    check: i.check,
    route: i.route,
    url: i.url,
    viewport: i.viewport.name,
    severity: i.severity,
    title: i.title,
    details: i.details,
    target: i.target,
    steps: [
      `Открыть ${i.url} в чистом профиле браузера, окно ${i.viewport.width}×${i.viewport.height}.`,
      i.action,
      `Ожидаемо: ${i.expected}. Фактически: ${i.actual}.`,
    ],
  };
}

/** Один и тот же дефект может всплыть дважды за визит (две одинаковые ошибки консоли). */
export function dedupe(findings: Finding[]): Finding[] {
  const seen = new Map<string, Finding>();
  for (const f of findings) if (!seen.has(f.id)) seen.set(f.id, f);
  return [...seen.values()];
}

export function verdict(attempts: number, reproduced: number): Verdict {
  if (reproduced >= attempts) return 'confirmed';
  if (reproduced === 0) return 'not_reproduced';
  return 'flaky';
}

export function makeRetest(attempts: number, reproduced: number): Retest {
  return { attempts, reproduced, verdict: verdict(attempts, reproduced) };
}

export function atLeast(severity: Severity, threshold: Severity): boolean {
  return SEVERITY_RANK[severity] >= SEVERITY_RANK[threshold];
}

/** Убирает из текста консоли то, что меняется между запусками: номера строк, query, хэши. */
export function normalizeMessage(text: string): string {
  // Первая строка: стек вызовов минифицированной сборки меняется от выкатки к выкатке.
  return (text.split('\n')[0] ?? '')
    .replace(/\?[^\s)'"]*/g, '')
    .replace(/:\d+:\d+/g, '')
    .replace(/-[A-Za-z0-9_]{8,}\.(js|css)/g, '.$1')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 300);
}

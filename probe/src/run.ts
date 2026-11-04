import { chromium, type Browser } from 'playwright';
import type { ProbeConfig } from './config';
import { atLeast, makeRetest } from './finding';
import { inspectPage } from './inspect';
import type { Finding, PageVisit, Report, ReportedFinding, Summary } from './types';

export const VERSION = '1.0.2';

export interface RunOptions {
  browser?: Browser;
  log?: (line: string) => void;
}

/**
 * Перепроверка: каждая пара «маршрут × вьюпорт» с находками повторяется N раз
 * в чистом контексте со всеми проверками, и для каждой находки считается,
 * сколько раз она воспроизвелась.
 * N из N — подтверждено, 0 из N — не подтвердилось, между — нестабильно.
 */
export async function retestFindings(
  browser: Browser,
  config: ProbeConfig,
  findings: Finding[],
): Promise<ReportedFinding[]> {
  const attempts = config.retest.attempts;
  const groups = new Map<string, Finding[]>();
  for (const f of findings) {
    const key = `${f.route}\u0000${f.viewport}`;
    groups.set(key, [...(groups.get(key) ?? []), f]);
  }

  const reproduced = new Map<string, number>();
  // Сбой навигации или проверки, которого не было в основном проходе, тоже попадает
  // в отчёт: иначе упавшая после первого визита витрина давала «не подтвердилось»
  // по исходной находке и зелёную приёмку (ревью Codex, R2).
  const emerged = new Map<string, { finding: Finding; count: number }>();
  for (const group of groups.values()) {
    const first = group[0]!;
    const viewport = config.viewports.find((v) => v.name === first.viewport)!;
    const known = new Set(group.map((f) => f.id));
    for (let i = 0; i < attempts; i++) {
      // Все проверки, а не только давшие находки: воспроизведению может быть нужна
      // прокрутка или другое действие соседней проверки (ревью Codex, R3).
      const visit = await inspectPage(browser, config, first.route, viewport);
      for (const f of visit.findings) {
        if (known.has(f.id)) reproduced.set(f.id, (reproduced.get(f.id) ?? 0) + 1);
        else if (f.target === 'navigation' || f.target === 'probe-error') {
          const e = emerged.get(f.id) ?? { finding: f, count: 0 };
          e.count += 1;
          emerged.set(f.id, e);
        }
      }
    }
  }
  return [
    ...findings.map((f) => ({ ...f, retest: makeRetest(attempts, reproduced.get(f.id) ?? 0) })),
    ...[...emerged.values()].map((e) => ({ ...e.finding, retest: makeRetest(attempts, e.count) })),
  ];
}

export function summarize(
  config: ProbeConfig,
  pages: PageVisit[],
  findings: ReportedFinding[],
): Summary {
  const confirmed = findings.filter((f) => f.retest.verdict === 'confirmed');
  const bySeverity = { critical: 0, serious: 0, moderate: 0, minor: 0 };
  for (const f of confirmed) bySeverity[f.severity] += 1;
  return {
    pages: pages.length,
    total: findings.length,
    confirmed: confirmed.length,
    flaky: findings.filter((f) => f.retest.verdict === 'flaky').length,
    notReproduced: findings.filter((f) => f.retest.verdict === 'not_reproduced').length,
    confirmedBySeverity: bySeverity,
    failed: confirmed.some((f) => atLeast(f.severity, config.thresholds.failOn)),
  };
}

export async function runProbe(config: ProbeConfig, options: RunOptions = {}): Promise<Report> {
  const log = options.log ?? (() => undefined);
  const startedAt = new Date();
  const browser = options.browser ?? (await chromium.launch());
  try {
    const pages: PageVisit[] = [];
    const found: Finding[] = [];
    for (const route of config.routes) {
      for (const viewport of config.viewports) {
        const visit = await inspectPage(browser, config, route, viewport);
        pages.push({
          route,
          url: new URL(route, config.baseUrl).toString(),
          viewport: viewport.name,
          status: visit.status,
          durationMs: visit.durationMs,
          findings: visit.findings.length,
        });
        found.push(...visit.findings);
        log(`  ${viewport.name.padEnd(8)} ${route}  находок: ${visit.findings.length}`);
      }
    }
    log(`перепроверка: ${found.length} находок × ${config.retest.attempts}`);
    const findings = await retestFindings(browser, config, found);
    return {
      tool: 'shopprobe',
      version: VERSION,
      baseUrl: config.baseUrl,
      startedAt: startedAt.toISOString(),
      durationMs: Date.now() - startedAt.getTime(),
      retestAttempts: config.retest.attempts,
      failOn: config.thresholds.failOn,
      pages,
      findings,
      summary: summarize(config, pages, findings),
    };
  } finally {
    if (!options.browser) await browser.close();
  }
}

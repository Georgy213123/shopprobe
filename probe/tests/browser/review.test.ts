/**
 * Находки ревью Codex (gpt-6.1-sol) по перепроверке и отпечаткам, воспроизведённые в Chromium.
 * Номера — из таблицы в docs/04-ai-development.md.
 */
import { chromium, type Browser } from 'playwright';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { resolveConfig, type UserConfig } from '../../src/config';
import { renderHtml } from '../../src/report/html';
import { consoleSummary } from '../../src/report/write';
import { runProbe } from '../../src/run';
import type { Viewport } from '../../src/types';
import { startFixtureServer, type FixtureServer } from './server';

const desktop: Viewport = { name: 'desktop', width: 1440, height: 900 };
const mobile: Viewport = { name: 'mobile', width: 390, height: 844 };

let browser: Browser;
let server: FixtureServer;

beforeAll(async () => {
  browser = await chromium.launch();
});
afterAll(async () => browser?.close());
// Свой сервер на тест: у динамических маршрутов счётчики визитов.
beforeEach(async () => {
  server = await startFixtureServer();
});
afterEach(async () => server?.close());

function probe(routes: string[], extra: UserConfig = {}) {
  return runProbe(
    resolveConfig({
      baseUrl: server.url,
      routes,
      viewports: [desktop],
      retest: { attempts: 3 },
      ...extra,
    }),
    { browser },
  );
}

describe('ревью Codex: перепроверка', () => {
  it('R2: витрина упала после первого визита — приёмка не проходит', async () => {
    const report = await probe(['/dyn/dies-after-first'], { viewports: [mobile] });
    const nav = report.findings.find((f) => f.target === 'navigation');
    expect(nav?.retest.verdict).toBe('confirmed');
    expect(report.summary.failed).toBe(true);
  });

  it('R3: ошибка, которую вызывает прокрутка, подтверждается при перепроверке', async () => {
    const report = await probe(['/fixtures/scroll-error.html']);
    const f = report.findings.find((x) => x.check === 'console');
    expect(f?.target).toContain('Трекер прокрутки');
    expect(f?.retest.verdict).toBe('confirmed');
  });

  it('R4: эндпоинт отвечает 500, затем 503 — это одна подтверждённая находка', async () => {
    const report = await probe(['/fixtures/flip-status.html'], { checks: ['http', 'console'] });
    const http = report.findings.filter((f) => f.check === 'http');
    expect(http).toHaveLength(1);
    expect(http[0]?.retest.verdict).toBe('confirmed');
  });

  it('R7: нарушение axe на другом элементе не подтверждает исходную находку', async () => {
    const report = await probe(['/dyn/contrast-moving'], { checks: ['a11y'] });
    const f = report.findings.find((x) => x.target.startsWith('color-contrast'));
    expect(f?.details).toContain('#old-button');
    expect(f?.retest.verdict).toBe('not_reproduced');
  });

  it('SP-01: новое нарушение на другом элементе подтверждается, приёмка не проходит', async () => {
    const report = await probe(['/dyn/contrast-moving'], { checks: ['a11y'] });
    const added = report.findings.find(
      (x) => x.target.startsWith('color-contrast') && x.details.includes('#different-button'),
    );
    expect(added?.retest).toMatchObject({ reproduced: 3, verdict: 'confirmed' });
    expect(report.summary.failed).toBe(true);
  });

  it('SP-02: проверка не выполнилась в одном из повторов — приёмка неполная', async () => {
    const report = await probe(['/dyn/dies-on-second'], { checks: ['single-h1'] });
    const h1 = report.findings.find((f) => f.check === 'single-h1');
    expect(h1?.retest.verdict).toBe('flaky');
    const nav = report.findings.find((f) => f.target === 'navigation');
    expect(nav?.retest.verdict).toBe('flaky');
    expect(report.summary).toMatchObject({ failed: false, incomplete: true, incompleteChecks: 1 });
    expect(consoleSummary(report)).toContain('ИТОГ: приёмка неполная');
    expect(renderHtml(report)).toContain('Приёмка: неполная');
  });
});

describe('ревью Codex: порядок проверок', () => {
  it('R8: содержимое, подгруженное прокруткой, проверяется на скролл и h1', async () => {
    const report = await probe(['/fixtures/scroll-adds.html'], { viewports: [mobile] });
    const checks = report.findings.map((f) => f.check).sort();
    expect(checks).toEqual(['h-scroll', 'single-h1']);
  });
});

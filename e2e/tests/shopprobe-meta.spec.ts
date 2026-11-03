import { expect, test } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

/**
 * Мета-тест ShopProbe: инструмент проверяется на витрине с известным ответом.
 * Чистая витрина → ноль подтверждённых находок (нет ложных срабатываний).
 * SEEDED_BUGS=1 → найдены все посаженные дефекты, нестабильный запрос не подтверждён.
 */

interface Finding {
  check: string;
  route: string;
  viewport: string;
  target: string;
  retest: { attempts: number; reproduced: number; verdict: string };
}
interface Report {
  findings: Finding[];
  summary: { confirmed: number; flaky: number; notReproduced: number; failed: boolean };
}

const PROBE_DIR = resolve(import.meta.dirname, '../../probe');
const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:5201';

function runProbe(): { code: number | null; report: Report; stdout: string } {
  const out = mkdtempSync(join(tmpdir(), 'shopprobe-meta-'));
  const res = spawnSync('npx', ['tsx', 'src/cli.ts', '--base-url', BASE_URL, '--out', out], {
    cwd: PROBE_DIR,
    encoding: 'utf8',
    timeout: 240_000,
  });
  try {
    const report = JSON.parse(readFileSync(join(out, 'report.json'), 'utf8')) as Report;
    return { code: res.status, report, stdout: res.stdout };
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
}

async function seeded(request: import('@playwright/test').APIRequestContext): Promise<boolean> {
  return (await (await request.get('/api/meta')).json()).seeded_bugs as boolean;
}

test.describe.configure({ timeout: 300_000 });

test('ShopProbe: на чистой витрине ноль подтверждённых находок', async ({ request }) => {
  expect(await seeded(request), 'нужен запуск без SEEDED_BUGS').toBe(false);
  const { code, report, stdout } = runProbe();
  const confirmed = report.findings.filter((f) => f.retest.verdict === 'confirmed');
  expect(confirmed, stdout).toEqual([]);
  expect(report.summary.failed).toBe(false);
  expect(code).toBe(0);
});

/** Посаженные дефекты: проверка, маршрут, кусок target, вьюпорт (если дефект зависит от ширины). */
const SEEDED: Array<{
  name: string;
  check: string;
  route: RegExp;
  target: RegExp;
  viewport?: string;
}> = [
  {
    name: 'битая картинка',
    check: 'broken-image',
    route: /^\/product\/shu-puer/,
    target: /shu-puer-staroe-derevo\.svg$/,
  },
  { name: 'ошибка в консоли', check: 'console', route: /^\/product\//, target: /Виджет отзывов/ },
  {
    name: '404 статического ресурса',
    check: 'http',
    route: /^\//,
    target: /^GET \/assets\/legacy-promo\.css 4xx$/,
  },
  {
    name: 'горизонтальный скролл на 390 px',
    check: 'h-scroll',
    route: /^\/$/,
    target: /document/,
    viewport: 'mobile',
  },
  { name: 'два h1', check: 'single-h1', route: /^\/catalog/, target: /h1/ },
  {
    name: 'низкий контраст кнопки',
    check: 'a11y',
    route: /^\/product\//,
    target: /^color-contrast /,
  },
];

test('ShopProbe: на SEEDED_BUGS=1 найдены все посаженные дефекты @seeded', async ({ request }) => {
  expect(await seeded(request), 'нужен запуск с SEEDED_BUGS=1').toBe(true);
  const { code, report, stdout } = runProbe();
  const confirmed = report.findings.filter((f) => f.retest.verdict === 'confirmed');

  for (const bug of SEEDED) {
    const hit = confirmed.find(
      (f) =>
        f.check === bug.check &&
        bug.route.test(f.route) &&
        bug.target.test(f.target) &&
        (!bug.viewport || f.viewport === bug.viewport),
    );
    expect(hit, `не найден посаженный дефект: ${bug.name}\n${stdout}`).toBeTruthy();
  }

  // Горизонтальный скролл только на мобильном: на 1440 px баннер помещается.
  expect(confirmed.some((f) => f.check === 'h-scroll' && f.viewport === 'desktop')).toBe(false);

  // Нестабильный запрос найден, но перепроверка его не подтвердила.
  const flaky = report.findings.filter((f) => /\/api\/recommendations/.test(f.target));
  expect(flaky.length, stdout).toBeGreaterThan(0);
  for (const f of flaky) expect(['flaky', 'not_reproduced']).toContain(f.retest.verdict);

  // Лишнего тоже нет: каждая подтверждённая находка — один из посаженных дефектов.
  const unexpected = confirmed.filter(
    (f) => !SEEDED.some((b) => f.check === b.check && b.target.test(f.target)),
  );
  expect(unexpected, stdout).toEqual([]);
  expect(code).toBe(1);
});

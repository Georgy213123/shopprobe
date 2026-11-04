/**
 * Проверки ShopProbe на фикстурах в настоящем Chromium.
 * Регрессионные тесты BUG-01, BUG-02, BUG-04, BUG-05, BUG-09 из docs/06-bugs.md.
 */
import { chromium, type Browser } from 'playwright';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { resolveConfig } from '../../src/config';
import { inspectPage } from '../../src/inspect';
import { runProbe } from '../../src/run';
import type { CheckId, Viewport } from '../../src/types';
import { startFixtureServer, type FixtureServer } from './server';

const desktop: Viewport = { name: 'desktop', width: 1440, height: 900 };
const mobile: Viewport = { name: 'mobile', width: 390, height: 844 };

let server: FixtureServer;
let browser: Browser;

beforeAll(async () => {
  server = await startFixtureServer();
  browser = await chromium.launch();
});

afterAll(async () => {
  await browser?.close();
  await server?.close();
});

async function visit(fixture: string, checks: CheckId[], viewport = desktop) {
  const config = resolveConfig({ baseUrl: server.url, routes: [`/fixtures/${fixture}`] });
  const result = await inspectPage(
    browser,
    config,
    `/fixtures/${fixture}`,
    viewport,
    new Set(checks),
  );
  return result.findings;
}

describe('broken-image', () => {
  it('BUG-01: lazy-картинка ниже экрана не считается битой', async () => {
    expect(await visit('lazy-ok.html', ['broken-image'])).toEqual([]);
  });

  it('BUG-01: битая картинка ниже экрана находится после прокрутки', async () => {
    const findings = await visit('lazy-broken.html', ['broken-image']);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ check: 'broken-image', target: '/broken.svg' });
  });
});

describe('h-scroll', () => {
  it('BUG-02: замер ждёт поздних стилей, а не ловит промежуточную раскладку', async () => {
    expect(await visit('late-styles.html', ['h-scroll'], mobile)).toEqual([]);
  });

  it('настоящий горизонтальный скролл ловится и указывает виновника', async () => {
    const findings = await visit('real-overflow.html', ['h-scroll'], mobile);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.details).toContain('div.promo');
  });

  it('BUG-05: вылезающее содержимое (длинное слово) ловится, виновник назван', async () => {
    const findings = await visit('long-word.html', ['h-scroll'], mobile);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.details).toContain('h3.name «Ферментированныйчайсбергамотом»');
  });

  it('на десктопе тот же баннер помещается', async () => {
    expect(await visit('real-overflow.html', ['h-scroll'], desktop)).toEqual([]);
  });
});

describe('console', () => {
  it('BUG-04: шум HMR дев-сервера не даёт находок', async () => {
    expect(await visit('dev-noise.html', ['console'])).toEqual([]);
  });

  it('BUG-09: ошибка приложения под дев-сервером Vite — находка, хотя источник /@vite/client', async () => {
    const findings = await visit('vite-dev-app-error.html', ['console']);
    expect(findings.map((f) => f.target)).toEqual(['Виджет отзывов: не удалось разобрать ответ']);
  });

  it('ошибка приложения в консоли — находка', async () => {
    const findings = await visit('app-error.html', ['console']);
    expect(findings.map((f) => f.target)).toEqual(['Виджет отзывов: не удалось разобрать ответ']);
  });

  it('404 скрипта даёт одну находку http, а не ещё и консольную (эхо сети)', async () => {
    const findings = await visit('missing-script.html', ['console', 'http']);
    expect(findings.map((f) => `${f.check} ${f.target}`)).toEqual(['http GET /missing.js 4xx']);
  });
});

describe('single-h1 и a11y', () => {
  it('два h1 — находка', async () => {
    const findings = await visit('two-h1.html', ['single-h1']);
    expect(findings[0]?.details).toBe('h1: 2 («Первый», «Второй»)');
  });

  it('низкий контраст кнопки ловится axe как serious', async () => {
    const findings = await visit('low-contrast.html', ['a11y']);
    const contrast = findings.find((f) => f.target.startsWith('color-contrast '));
    expect(contrast?.severity).toBe('serious');
    expect(contrast?.target).toBe('color-contrast button');
  });

  it('чистая страница проходит все проверки на обоих вьюпортах', async () => {
    expect(await visit('clean.html', [...resolveConfig().checks])).toEqual([]);
    expect(await visit('clean.html', [...resolveConfig().checks], mobile)).toEqual([]);
  });
});

describe('перепроверка', () => {
  it('стабильная находка подтверждается, падающий через раз запрос — нестабилен', async () => {
    const config = resolveConfig({
      baseUrl: server.url,
      routes: ['/fixtures/flaky.html', '/fixtures/missing-script.html'],
      viewports: [desktop],
      checks: ['http', 'console'],
      retest: { attempts: 3 },
    });
    const report = await runProbe(config, { browser });
    const byTarget = Object.fromEntries(report.findings.map((f) => [f.target, f.retest]));
    expect(byTarget['GET /missing.js 4xx']).toEqual({
      attempts: 3,
      reproduced: 3,
      verdict: 'confirmed',
    });
    expect(byTarget['GET /flaky-data 5xx']?.verdict).toBe('flaky');
    expect(report.summary).toMatchObject({ confirmed: 1, flaky: 1, failed: true });
  });
});

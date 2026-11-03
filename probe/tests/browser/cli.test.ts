/**
 * CLI запускается так же, как его запускает пользователь: через tsx.
 * Юнит-тесты под vitest не ловили, что tsx (esbuild keepNames) оборачивает функции
 * для page.evaluate в __name(), которого нет в странице.
 */
import { execFile } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Report } from '../../src/types';
import { startFixtureServer, type FixtureServer } from './server';

const PROBE = resolve(import.meta.dirname, '../..');
let server: FixtureServer;

beforeAll(async () => {
  server = await startFixtureServer();
});
afterAll(async () => server?.close());

/** Асинхронно: сервер фикстур живёт в этом же процессе и должен отвечать CLI. */
function cli(routes: string) {
  const out = mkdtempSync(join(tmpdir(), 'shopprobe-cli-'));
  const args = ['tsx', 'src/cli.ts', '--config', 'нет-такого.ts', '--base-url', server.url];
  args.push('--routes', routes, '--out', out, '--retest', '2');
  return new Promise<{ code: number; stdout: string; report: Report; html: string }>(
    (done, fail) => {
      execFile('npx', args, { cwd: PROBE, encoding: 'utf8', timeout: 120_000 }, (err, stdout) => {
        const code = err ? Number((err as { code?: number }).code ?? 2) : 0;
        try {
          const report = JSON.parse(readFileSync(join(out, 'report.json'), 'utf8')) as Report;
          const html = readFileSync(join(out, 'report.html'), 'utf8');
          done({ code, stdout, report, html });
        } catch (e) {
          fail(new Error(`CLI не записал отчёт (код ${code}): ${stdout} ${String(e)}`));
        } finally {
          rmSync(out, { recursive: true, force: true });
        }
      });
    },
  );
}

describe('CLI через tsx', () => {
  it('чистая страница без находок, настоящий дефект найден, код выхода 1', async () => {
    const { code, report, stdout } = await cli('/fixtures/clean.html,/fixtures/real-overflow.html');
    const navigation = report.findings.filter((f) => f.target === 'navigation');
    expect(navigation, stdout).toEqual([]);
    const clean = report.findings.filter((f) => f.route === '/fixtures/clean.html');
    expect(clean).toEqual([]);
    // real-overflow проверяет, что evaluate с прокруткой и замером работает под tsx.
    expect(report.findings.map((f) => `${f.check}:${f.viewport}`)).toEqual(['h-scroll:mobile']);
    expect(code).toBe(1);
    expect(stdout).toContain('ИТОГ: приёмка не пройдена');
  });

  it('пишет HTML-отчёт с таблицей находок', async () => {
    const { html } = await cli('/fixtures/two-h1.html');
    expect(html).toContain('<table>');
    expect(html).toContain('Несколько заголовков h1');
  });
});

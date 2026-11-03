import { describe, expect, it } from 'vitest';
import { resolveConfig } from '../../src/config';
import { escapeHtml, renderHtml, sortFindings } from '../../src/report/html';
import { consoleSummary } from '../../src/report/write';
import { summarize } from '../../src/run';
import type { Report, ReportedFinding } from '../../src/types';

function finding(over: Partial<ReportedFinding>): ReportedFinding {
  return {
    id: 'abc',
    check: 'console',
    route: '/',
    url: 'http://localhost:5201/',
    viewport: 'desktop',
    severity: 'serious',
    title: 'Ошибка в консоли',
    details: 'd',
    target: 't',
    steps: ['1', '2', '3'],
    retest: { attempts: 3, reproduced: 3, verdict: 'confirmed' },
    ...over,
  };
}

const config = resolveConfig();

describe('сводка', () => {
  it('считает вердикты и падает только на подтверждённых выше порога', () => {
    const findings = [
      finding({ id: '1' }),
      finding({ id: '2', retest: { attempts: 3, reproduced: 1, verdict: 'flaky' } }),
      finding({ id: '3', severity: 'minor' }),
    ];
    const s = summarize(config, [], findings);
    expect(s).toMatchObject({ total: 3, confirmed: 2, flaky: 1, notReproduced: 0, failed: true });
    expect(s.confirmedBySeverity).toMatchObject({ serious: 1, minor: 1 });
  });

  it('нестабильные находки не валят приёмку', () => {
    const s = summarize(
      config,
      [],
      [finding({ retest: { attempts: 3, reproduced: 2, verdict: 'flaky' } })],
    );
    expect(s.failed).toBe(false);
  });
});

describe('HTML-отчёт', () => {
  const report = (findings: ReportedFinding[]): Report => ({
    tool: 'shopprobe',
    version: 'test',
    baseUrl: 'http://localhost:5201',
    startedAt: '2026-01-01T00:00:00.000Z',
    durationMs: 1000,
    retestAttempts: 3,
    failOn: 'moderate',
    pages: [],
    findings,
    summary: summarize(config, [], findings),
  });

  it('экранирует текст со страницы: отчёт не исполняет чужой HTML', () => {
    const html = renderHtml(report([finding({ details: '<script>alert(1)</script>' })]));
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
    expect(escapeHtml(`"'&`)).toBe('&quot;&#39;&amp;');
  });

  it('содержит статус перепроверки, вьюпорт и шаги', () => {
    const html = renderHtml(report([finding({ steps: ['Открыть', 'Смотреть', 'Итог'] })]));
    expect(html).toContain('подтверждено');
    expect(html).toContain('3 из 3');
    expect(html).toContain('<li>Смотреть</li>');
  });

  it('подтверждённые и серьёзные идут первыми', () => {
    const sorted = sortFindings([
      finding({ id: 'nr', retest: { attempts: 3, reproduced: 0, verdict: 'not_reproduced' } }),
      finding({ id: 'minor', severity: 'minor' }),
      finding({ id: 'crit', severity: 'critical' }),
    ]);
    expect(sorted.map((f) => f.id)).toEqual(['crit', 'minor', 'nr']);
  });

  it('краткая сводка в консоль заканчивается итогом', () => {
    const text = consoleSummary(report([finding({})]));
    expect(text.split('\n').at(-1)).toBe('ИТОГ: приёмка не пройдена (порог moderate)');
  });
});

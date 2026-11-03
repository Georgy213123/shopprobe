import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Report } from '../types';
import { renderHtml, sortFindings, VERDICT_LABEL } from './html';

export async function writeReport(
  report: Report,
  dir: string,
): Promise<{ json: string; html: string }> {
  await mkdir(dir, { recursive: true });
  const json = join(dir, 'report.json');
  const html = join(dir, 'report.html');
  await writeFile(json, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(html, renderHtml(report), 'utf8');
  return { json, html };
}

export function consoleSummary(report: Report): string {
  const s = report.summary;
  const lines = [
    `ShopProbe ${report.version} · ${report.baseUrl} · ${(report.durationMs / 1000).toFixed(1)} с`,
    `страниц × вьюпортов: ${s.pages}; находок: ${s.total} — подтверждено ${s.confirmed}, нестабильно ${s.flaky}, не подтвердилось ${s.notReproduced}`,
  ];
  for (const f of sortFindings(report.findings)) {
    const v = VERDICT_LABEL[f.retest.verdict].padEnd(16);
    lines.push(
      `  ${v} ${f.severity.padEnd(8)} ${f.viewport.padEnd(8)} ${f.route.padEnd(34)} ${f.title}: ${f.target}`,
    );
  }
  lines.push(
    s.failed ? `ИТОГ: приёмка не пройдена (порог ${report.failOn})` : 'ИТОГ: приёмка пройдена',
  );
  return lines.join('\n');
}

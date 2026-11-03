import type { Report, ReportedFinding, Verdict } from '../types';
import { SEVERITY_RANK } from '../types';

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export const VERDICT_LABEL: Record<Verdict, string> = {
  confirmed: 'подтверждено',
  flaky: 'нестабильно',
  not_reproduced: 'не подтвердилось',
};

const VERDICT_ORDER: Record<Verdict, number> = { confirmed: 0, flaky: 1, not_reproduced: 2 };

export function sortFindings(findings: ReportedFinding[]): ReportedFinding[] {
  return [...findings].sort(
    (a, b) =>
      VERDICT_ORDER[a.retest.verdict] - VERDICT_ORDER[b.retest.verdict] ||
      SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] ||
      a.route.localeCompare(b.route) ||
      a.viewport.localeCompare(b.viewport),
  );
}

function row(f: ReportedFinding): string {
  const e = escapeHtml;
  const steps = f.steps.map((s) => `<li>${e(s)}</li>`).join('');
  return `<tr class="v-${f.retest.verdict}">
  <td><span class="badge ${f.retest.verdict}">${VERDICT_LABEL[f.retest.verdict]}</span><br><small>${f.retest.reproduced} из ${f.retest.attempts}</small></td>
  <td><span class="sev ${f.severity}">${f.severity}</span></td>
  <td><b>${e(f.title)}</b><br><small>${e(f.check)} · <code>${e(f.id)}</code></small></td>
  <td><a href="${e(f.url)}">${e(f.route)}</a></td>
  <td>${e(f.viewport)}</td>
  <td>${e(f.details)}</td>
  <td><ol>${steps}</ol></td>
</tr>`;
}

export function renderHtml(report: Report): string {
  const s = report.summary;
  const rows = sortFindings(report.findings).map(row).join('\n');
  const e = escapeHtml;
  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ShopProbe — отчёт</title>
<style>
body{font:14px/1.45 system-ui,sans-serif;margin:24px;color:#1f2328;background:#fff}
h1{font-size:22px;margin:0 0 4px}
.meta{color:#57606a;margin-bottom:16px}
.cards{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px}
.card{border:1px solid #d0d7de;border-radius:8px;padding:10px 14px;min-width:120px}
.card b{display:block;font-size:22px}
table{border-collapse:collapse;width:100%}
th,td{border-bottom:1px solid #d0d7de;padding:8px;vertical-align:top;text-align:left}
th{background:#f6f8fa;position:sticky;top:0}
ol{margin:0;padding-left:18px}
.badge{display:inline-block;border-radius:999px;padding:1px 8px;font-weight:600}
.badge.confirmed{background:#ffebe9;color:#82071e}
.badge.flaky{background:#fff8c5;color:#6a4b00}
.badge.not_reproduced{background:#eaeef2;color:#424a53}
.sev{font-weight:600}
.sev.critical,.sev.serious{color:#82071e}
.v-not_reproduced td{color:#57606a}
code{font-size:12px}
</style>
</head>
<body>
<h1>ShopProbe — отчёт приёмки</h1>
<p class="meta">${e(report.baseUrl)} · ${e(report.startedAt)} · ${(report.durationMs / 1000).toFixed(1)} с · страниц: ${s.pages} · перепроверка ×${report.retestAttempts} · порог: ${e(report.failOn)}</p>
<div class="cards">
<div class="card"><b>${s.confirmed}</b>подтверждено</div>
<div class="card"><b>${s.flaky}</b>нестабильно</div>
<div class="card"><b>${s.notReproduced}</b>не подтвердилось</div>
<div class="card"><b>${s.failed ? 'нет' : 'да'}</b>приёмка пройдена</div>
</div>
${
  report.findings.length === 0
    ? '<p>Находок нет.</p>'
    : `<table>
<thead><tr><th>Перепроверка</th><th>Серьёзность</th><th>Находка</th><th>Страница</th><th>Вьюпорт</th><th>Подробности</th><th>Шаги воспроизведения</th></tr></thead>
<tbody>
${rows}
</tbody>
</table>`
}
</body>
</html>
`;
}

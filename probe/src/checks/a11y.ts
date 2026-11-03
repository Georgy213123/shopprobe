import { AxeBuilder } from '@axe-core/playwright';
import { atLeast, makeFinding } from '../finding';
import type { Severity } from '../types';
import type { Check } from './context';

export const a11yCheck: Check = async (ctx) => {
  const { page, config } = ctx;
  let builder = new AxeBuilder({ page }).withTags(config.a11y.tags);
  if (config.a11y.disableRules.length) builder = builder.disableRules(config.a11y.disableRules);
  const result = await builder.analyze();

  return result.violations
    .filter((v) => atLeast((v.impact ?? 'minor') as Severity, config.a11y.minImpact))
    .map((v) => {
      const targets = v.nodes
        .slice(0, 3)
        .map((n) => n.target.join(' '))
        .join('; ');
      const summary = v.nodes[0]?.failureSummary?.split('\n').slice(1, 2).join(' ').trim() ?? '';
      return makeFinding({
        check: 'a11y',
        route: ctx.route,
        url: ctx.url,
        viewport: ctx.viewport,
        severity: (v.impact ?? 'minor') as Severity,
        title: `Доступность: ${v.id}`,
        details: `${v.help}. Узлов: ${v.nodes.length}. ${targets}${summary ? `. ${summary}` : ''}`,
        // Правило и узлы: нарушение на другом элементе — другая находка (ревью Codex, R7).
        target: `${v.id} ${v.nodes
          .map((n) => n.target.join(' '))
          .sort()
          .slice(0, 5)
          .join(', ')}`,
        action: `Проверить элементы: ${targets} (axe DevTools или Lighthouse → Accessibility).`,
        expected: `правило ${v.id} соблюдено`,
        actual: `${v.nodes.length} нарушений: ${v.help}`,
      });
    });
};

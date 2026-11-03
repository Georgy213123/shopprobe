import { makeFinding } from '../finding';
import type { Check } from './context';

export const singleH1Check: Check = async (ctx) => {
  const texts = await ctx.page.$$eval('h1', (els) =>
    els.map((e) => (e.textContent ?? '').trim().slice(0, 60)),
  );
  if (texts.length === 1) return [];
  const actual =
    texts.length === 0
      ? 'h1 нет'
      : `h1: ${texts.length} (${texts.map((t) => `«${t}»`).join(', ')})`;
  return [
    makeFinding({
      check: 'single-h1',
      route: ctx.route,
      url: ctx.url,
      viewport: ctx.viewport,
      severity: 'moderate',
      title: texts.length === 0 ? 'Нет заголовка h1' : 'Несколько заголовков h1',
      details: actual,
      target: 'h1',
      action: 'Найти на странице элементы h1 (DevTools → Elements, поиск «h1»).',
      expected: 'ровно один h1',
      actual,
    }),
  ];
};

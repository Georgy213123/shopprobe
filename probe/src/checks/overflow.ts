import { makeFinding } from '../finding';
import type { Check } from './context';

export const overflowCheck: Check = async (ctx) => {
  const { page, config } = ctx;
  // Раскладка к этому моменту устоялась: inspectPage ждёт waitForStable (BUG-02).
  const tolerance = config.thresholds.overflowTolerancePx;

  const m = await page.evaluate((tol) => {
    const doc = document.documentElement;
    const viewport = doc.clientWidth;
    const scrollWidth = Math.max(doc.scrollWidth, document.body ? document.body.scrollWidth : 0);
    // Виновник — самый внешний вылезающий элемент, а не все его потомки.
    const offenders: string[] = [];
    for (const el of document.querySelectorAll('body *')) {
      if (offenders.length >= 3) break;
      if (el.getBoundingClientRect().right <= viewport + tol) continue;
      const parent = el.parentElement;
      if (
        parent &&
        parent !== document.body &&
        parent.getBoundingClientRect().right > viewport + tol
      ) {
        continue;
      }
      const cls = [...el.classList]
        .slice(0, 2)
        .map((c) => `.${c}`)
        .join('');
      offenders.push(`${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${cls}`);
    }
    // Если вылезают не блоки, а их содержимое (длинное слово), ищем самый глубокий
    // элемент, у которого содержимое шире него самого.
    if (offenders.length === 0) {
      let deepest: Element | null = null;
      for (const el of document.querySelectorAll('body *')) {
        if (el.scrollWidth > el.clientWidth + tol && el.clientWidth > 0) {
          if (getComputedStyle(el).overflowX === 'visible') deepest = el;
        }
      }
      if (deepest) {
        const cls = [...deepest.classList]
          .slice(0, 2)
          .map((c) => `.${c}`)
          .join('');
        const text = (deepest.textContent ?? '').trim().slice(0, 40);
        offenders.push(`${deepest.tagName.toLowerCase()}${cls} «${text}» (содержимое шире блока)`);
      }
    }
    return { viewport, scrollWidth, offenders };
  }, tolerance);

  if (m.scrollWidth - m.viewport <= tolerance) return [];
  const who = m.offenders.length ? m.offenders.join(', ') : 'не определён';
  return [
    makeFinding({
      check: 'h-scroll',
      route: ctx.route,
      url: ctx.url,
      viewport: ctx.viewport,
      severity: 'serious',
      title: 'Горизонтальный скролл',
      details: `ширина документа ${m.scrollWidth} px при окне ${m.viewport} px; виновник: ${who}`,
      target: 'document',
      action: 'Попробовать прокрутить страницу вправо.',
      expected: 'ширина документа не больше ширины окна',
      actual: `документ шире окна на ${m.scrollWidth - m.viewport} px (${who})`,
    }),
  ];
};

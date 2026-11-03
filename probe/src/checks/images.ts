import { makeFinding } from '../finding';
import type { Check } from './context';

interface ImageState {
  src: string;
  alt: string;
  complete: boolean;
  naturalWidth: number;
}

/**
 * Битая картинка = браузер закончил загрузку (complete) и не смог её декодировать
 * (naturalWidth = 0). Lazy-load картинки ниже экрана сначала подгружаются прокруткой,
 * а незагруженные к таймауту не судим (BUG-01).
 */
export function brokenImages(states: ImageState[]): ImageState[] {
  return states.filter((s) => s.src !== '' && s.complete && s.naturalWidth === 0);
}

export const imagesCheck: Check = async (ctx) => {
  const { page, config } = ctx;
  // Прокрутку и ожидание загрузки уже сделал preparePage в inspectPage.
  const states = await page.evaluate(() =>
    Array.from(document.images).map((img) => ({
      src: img.currentSrc || img.getAttribute('src') || '',
      alt: img.alt,
      complete: img.complete,
      naturalWidth: img.naturalWidth,
    })),
  );

  const seen = new Set<string>();
  return brokenImages(states)
    .filter((s) => (seen.has(s.src) ? false : (seen.add(s.src), true)))
    .map((s) => {
      const src = s.src.startsWith(config.baseUrl) ? s.src.slice(config.baseUrl.length) : s.src;
      return makeFinding({
        check: 'broken-image',
        route: ctx.route,
        url: ctx.url,
        viewport: ctx.viewport,
        severity: 'serious',
        title: 'Битая картинка',
        details: `${src}${s.alt ? ` (alt: «${s.alt}»)` : ''}: загружена, но не декодируется`,
        target: src,
        action: 'Прокрутить страницу до конца, найти изображение.',
        expected: 'изображение отображается',
        actual: `изображение ${src} не отображается (naturalWidth = 0)`,
      });
    });
};

import type { CheckId } from '../types';
import { a11yCheck } from './a11y';
import { consoleCheck } from './console';
import type { Check } from './context';
import { singleH1Check } from './headings';
import { httpCheck } from './http';
import { imagesCheck } from './images';
import { overflowCheck } from './overflow';

/**
 * Перед проверками inspectPage уже прокрутил страницу до конца и вернул наверх
 * (preparePage), поэтому раскладка, h1 и axe видят подгруженное при прокрутке.
 * Консоль и сеть — последними: в них попадает всё, что случилось за визит.
 */
export const CHECKS: ReadonlyArray<[CheckId, Check]> = [
  ['h-scroll', overflowCheck],
  ['single-h1', singleH1Check],
  ['a11y', a11yCheck],
  ['broken-image', imagesCheck],
  ['console', consoleCheck],
  ['http', httpCheck],
];

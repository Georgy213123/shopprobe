import { describe, expect, it } from 'vitest';
import { formatPrice, formatWeight } from './format';

describe('форматирование', () => {
  it('цена в рублях без копеек', () => {
    expect(formatPrice(1290)).toBe('1 290 ₽');
  });

  it('вес в граммах и килограммах', () => {
    expect(formatWeight(357)).toBe('357 г');
    expect(formatWeight(1000)).toBe('1 кг');
  });
});

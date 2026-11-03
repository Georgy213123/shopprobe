import { describe, expect, it } from 'vitest';
import { parseCatalogState, toSearchParams, toggleValue } from './catalogQuery';

describe('состояние каталога в URL (US-02)', () => {
  it('разбирает и собирает обратно без потерь', () => {
    const raw =
      'category=green&category=white&origin=china&price_min=100&in_stock=true&sort=price_asc';
    const state = parseCatalogState(new URLSearchParams(raw));
    expect(state).toEqual({
      category: ['green', 'white'],
      origin: ['china'],
      form: [],
      priceMin: 100,
      priceMax: null,
      inStock: true,
      sort: 'price_asc',
    });
    expect(toSearchParams(state).toString()).toBe(raw);
  });

  it('игнорирует мусор в цене и сортировке', () => {
    const state = parseCatalogState(new URLSearchParams('price_min=-5&price_max=abc&sort=hack'));
    expect(state.priceMin).toBeNull();
    expect(state.priceMax).toBeNull();
    expect(state.sort).toBe('popular');
  });

  it('значения группы сортируются: одна выборка — один URL', () => {
    const a = parseCatalogState(new URLSearchParams('origin=japan&origin=china'));
    expect(toSearchParams(a).toString()).toBe('origin=china&origin=japan');
  });

  it('toggleValue включает и выключает значение', () => {
    const s0 = parseCatalogState(new URLSearchParams());
    const s1 = toggleValue(s0, 'form', 'leaf');
    expect(s1.form).toEqual(['leaf']);
    expect(toggleValue(s1, 'form', 'leaf').form).toEqual([]);
  });
});

/** Состояние фильтров каталога живёт в URL: ссылкой можно поделиться, «назад» работает. */

export type FacetKey = 'category' | 'origin' | 'form';
export type Sort = 'popular' | 'price_asc' | 'price_desc' | 'name';

export interface CatalogState {
  category: string[];
  origin: string[];
  form: string[];
  priceMin: number | null;
  priceMax: number | null;
  inStock: boolean;
  sort: Sort;
}

const SORTS: readonly Sort[] = ['popular', 'price_asc', 'price_desc', 'name'];

function toInt(raw: string | null): number | null {
  if (raw === null || raw.trim() === '') return null;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

export function parseCatalogState(params: URLSearchParams): CatalogState {
  const sort = params.get('sort');
  return {
    category: params.getAll('category'),
    origin: params.getAll('origin'),
    form: params.getAll('form'),
    priceMin: toInt(params.get('price_min')),
    priceMax: toInt(params.get('price_max')),
    inStock: params.get('in_stock') === 'true',
    sort: SORTS.includes(sort as Sort) ? (sort as Sort) : 'popular',
  };
}

export function toSearchParams(state: CatalogState): URLSearchParams {
  const p = new URLSearchParams();
  for (const key of ['category', 'origin', 'form'] as const) {
    for (const v of [...state[key]].sort()) p.append(key, v);
  }
  if (state.priceMin !== null) p.set('price_min', String(state.priceMin));
  if (state.priceMax !== null) p.set('price_max', String(state.priceMax));
  if (state.inStock) p.set('in_stock', 'true');
  if (state.sort !== 'popular') p.set('sort', state.sort);
  return p;
}

export function toggleValue(state: CatalogState, key: FacetKey, value: string): CatalogState {
  const current = state[key];
  const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
  return { ...state, [key]: next };
}

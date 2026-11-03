import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FacetFilter } from '../components/FacetFilter';
import { ProductTile } from '../components/ProductTile';
import { api } from '../lib/api';
import {
  parseCatalogState,
  toSearchParams,
  toggleValue,
  type CatalogState,
  type Sort,
} from '../lib/catalogQuery';
import { useSeededBugs } from '../lib/contexts';
import { useFetch } from '../lib/useFetch';

const SORT_LABELS: Record<Sort, string> = {
  popular: 'Сначала популярные',
  price_asc: 'Сначала дешевле',
  price_desc: 'Сначала дороже',
  name: 'По названию',
};

export function CatalogPage() {
  const [params, setParams] = useSearchParams();
  const urlQuery = toSearchParams(parseCatalogState(params)).toString();
  // React Router обновляет URL в transition, и управляемый чекбокс на мгновение
  // откатывается. Держим выбор локально, пока URL не сдвинется (вперёд или по «назад»).
  const [pending, setPending] = useState<{ from: string; state: CatalogState } | null>(null);
  // URL сдвинулся — локальный выбор больше не нужен (сброс во время рендера, без эффекта).
  if (pending && pending.from !== urlQuery) setPending(null);
  const state = pending?.from === urlQuery ? pending.state : parseCatalogState(params);
  const query = toSearchParams(state).toString();
  const fetched = useFetch((signal) => api.catalog(query, signal), query);
  const page =
    fetched.status === 'ok'
      ? fetched.data
      : fetched.status === 'loading'
        ? fetched.previous
        : undefined;
  const seeded = useSeededBugs();

  const update = (next: CatalogState) => {
    const nextParams = toSearchParams(next);
    setPending({ from: urlQuery, state: next });
    setParams(nextParams);
  };
  const priceInput = (key: 'priceMin' | 'priceMax', raw: string) => {
    const n = raw === '' ? null : Math.max(0, Math.trunc(Number(raw)));
    update({ ...state, [key]: Number.isNaN(n) ? null : n });
  };

  return (
    <>
      <h1>Каталог</h1>
      {seeded && (
        // Посаженный дефект: второй h1 на странице.
        <h1 className="promo-title" data-seeded="h1">
          Скидки недели
        </h1>
      )}
      <div className="catalog">
        <aside className="filters" aria-label="Фильтры">
          {page?.facets.map((g) => (
            <FacetFilter
              key={g.key}
              group={g}
              selected={state[g.key]}
              onToggle={(v) => update(toggleValue(state, g.key, v))}
            />
          ))}
          <fieldset className="facet">
            <legend>Цена, ₽</legend>
            <div className="price-row">
              <label>
                от
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={state.priceMin ?? ''}
                  placeholder={String(page?.price_range.min ?? '')}
                  onChange={(e) => priceInput('priceMin', e.target.value)}
                />
              </label>
              <label>
                до
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={state.priceMax ?? ''}
                  placeholder={String(page?.price_range.max ?? '')}
                  onChange={(e) => priceInput('priceMax', e.target.value)}
                />
              </label>
            </div>
          </fieldset>
          <div className="facet-row">
            <input
              id="f-in-stock"
              type="checkbox"
              checked={state.inStock}
              onChange={(e) => update({ ...state, inStock: e.target.checked })}
            />
            <label htmlFor="f-in-stock">Только в наличии</label>
          </div>
        </aside>
        <section className="results" aria-label="Товары">
          <div className="results-bar">
            <p data-testid="total" aria-live="polite">
              {fetched.status === 'ok' ? `Найдено: ${fetched.data.total}` : 'Загрузка…'}
            </p>
            <label>
              Сортировка{' '}
              <select
                value={state.sort}
                onChange={(e) => update({ ...state, sort: e.target.value as Sort })}
              >
                {Object.entries(SORT_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {fetched.status === 'error' && <p role="alert">Не удалось загрузить каталог.</p>}
          {page && page.items.length === 0 && (
            <p>Под эти фильтры ничего нет. Снимите часть условий.</p>
          )}
          {page && (
            <div className="grid" aria-busy={fetched.status === 'loading'}>
              {page.items.map((p, i) => (
                <ProductTile key={p.slug} product={p} eager={i < 6} />
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

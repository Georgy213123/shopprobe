import { Link } from 'react-router-dom';
import { ProductTile } from '../components/ProductTile';
import { api } from '../lib/api';
import { useSeededBugs } from '../lib/contexts';
import { useFetch } from '../lib/useFetch';

function Recommendations() {
  const state = useFetch((signal) => api.recommendations(signal), 'recommendations');
  // Отказ сервиса рекомендаций не ломает главную: блок просто не показывается.
  if (state.status !== 'ok' || state.data.length === 0) return null;
  return (
    <section aria-labelledby="rec-title">
      <h2 id="rec-title">Советуем попробовать</h2>
      <div className="grid">
        {state.data.map((p) => (
          <ProductTile key={p.slug} product={p} eager />
        ))}
      </div>
    </section>
  );
}

export function HomePage() {
  const seeded = useSeededBugs();
  const categories = useFetch((signal) => api.categories(signal), 'categories');

  return (
    <>
      <section className="hero">
        <h1>Чайная полка</h1>
        <p>
          Листовой, прессованный и травяной чай. Соберите корзину — оформление в демо не подключено.
        </p>
        <Link to="/catalog" className="button">
          Перейти в каталог
        </Link>
      </section>
      {seeded && (
        // Посаженный дефект: баннер фиксированной ширины даёт горизонтальный скролл на 390 px.
        <div className="promo-strip" style={{ width: 520 }} data-seeded="overflow">
          Неделя улунов: второй пакет со скидкой
        </div>
      )}
      <section aria-labelledby="cat-title">
        <h2 id="cat-title">Типы чая</h2>
        {categories.status === 'ok' && (
          <ul className="chips">
            {categories.data.map((c) => (
              <li key={c.slug}>
                <Link to={`/catalog?category=${c.slug}`}>
                  {c.title} <span className="count">({c.product_count})</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <Recommendations />
    </>
  );
}

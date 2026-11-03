import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import { useCart, useSeededBugs } from '../lib/contexts';
import { formatPrice, formatWeight } from '../lib/format';
import { useFetch } from '../lib/useFetch';

/** Посаженный дефект: виджет отзывов падает на разборе ответа и пишет ошибку в консоль. */
function BrokenReviews() {
  useEffect(() => {
    try {
      JSON.parse('{"reviews": [');
    } catch (err) {
      console.error('Виджет отзывов: не удалось разобрать ответ', err);
    }
  }, []);
  return null;
}

export function ProductPage() {
  const { slug = '' } = useParams();
  const state = useFetch((signal) => api.product(slug, signal), slug);
  const { dispatch } = useCart();
  const seeded = useSeededBugs();
  const [added, setAdded] = useState(false);

  if (state.status === 'loading') return <p>Загрузка…</p>;
  if (state.status === 'error') {
    const notFound = state.error instanceof ApiError && state.error.status === 404;
    return (
      <>
        <h1>{notFound ? 'Товар не найден' : 'Ошибка загрузки'}</h1>
        <p>
          <Link to="/catalog">Вернуться в каталог</Link>
        </p>
      </>
    );
  }

  const p = state.data;
  return (
    <article className="product">
      {seeded && <BrokenReviews />}
      <img src={p.image_url} alt={p.name} width={480} height={360} className="product-image" />
      <div className="product-info">
        <p className="crumbs">
          <Link to="/catalog">Каталог</Link> / {p.category_title}
        </p>
        <h1>{p.name}</h1>
        <dl className="props">
          <dt>Страна</dt>
          <dd>{p.origin_title}</dd>
          <dt>Форма</dt>
          <dd>{p.form_title}</dd>
          <dt>Вес</dt>
          <dd>{formatWeight(p.weight_g)}</dd>
        </dl>
        <p className="price" data-testid="price">
          {formatPrice(p.price)}
        </p>
        <p>{p.description}</p>
        {p.in_stock ? (
          <button
            type="button"
            className={seeded ? 'button button-faded' : 'button'}
            onClick={() => {
              dispatch({
                type: 'add',
                item: { slug: p.slug, name: p.name, price: p.price },
              });
              setAdded(true);
            }}
          >
            Добавить в корзину
          </button>
        ) : (
          <p className="out">Нет в наличии</p>
        )}
        <p role="status" className="added">
          {added ? 'Добавлено в корзину' : ''}
        </p>
      </div>
    </article>
  );
}

import { Link } from 'react-router-dom';
import { cartTotal, MAX_QTY } from '../lib/cart';
import { useCart } from '../lib/contexts';
import { formatPrice } from '../lib/format';

export function CartPage() {
  const { lines, dispatch } = useCart();

  if (lines.length === 0) {
    return (
      <>
        <h1>Корзина</h1>
        <p>
          Корзина пуста. <Link to="/catalog">Перейти в каталог</Link>
        </p>
      </>
    );
  }

  return (
    <>
      <h1>Корзина</h1>
      <ul className="cart" data-testid="cart-lines">
        {lines.map((l) => (
          <li key={l.slug} className="cart-line">
            <Link to={`/product/${l.slug}`} className="cart-name">
              {l.name}
            </Link>
            <label className="qty">
              <span className="visually-hidden">Количество: {l.name}</span>
              <input
                type="number"
                min={1}
                max={MAX_QTY}
                value={l.qty}
                onChange={(e) =>
                  dispatch({ type: 'setQty', slug: l.slug, qty: Number(e.target.value) || 1 })
                }
              />
            </label>
            <span className="cart-sum">{formatPrice(l.price * l.qty)}</span>
            <button
              type="button"
              className="link-button"
              onClick={() => dispatch({ type: 'remove', slug: l.slug })}
            >
              Удалить
            </button>
          </li>
        ))}
      </ul>
      <p className="cart-total" data-testid="cart-total">
        Итого: {formatPrice(cartTotal(lines))}
      </p>
      <p className="note">Оформление заказа и оплата в демо не подключены.</p>
    </>
  );
}

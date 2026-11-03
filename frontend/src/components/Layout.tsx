import { Link, NavLink, Outlet } from 'react-router-dom';
import { cartCount } from '../lib/cart';
import { useCart, useSeededBugs } from '../lib/contexts';

/** Посаженный дефект: ссылка на удалённый стиль даёт 404 у статического ресурса. */
function LegacyStylesheet() {
  return <link rel="stylesheet" href="/assets/legacy-promo.css" />;
}

export function Layout() {
  const { lines } = useCart();
  const seeded = useSeededBugs();
  const count = cartCount(lines);

  return (
    <>
      {seeded && <LegacyStylesheet />}
      <header className="site-header">
        <div className="container header-row">
          <Link to="/" className="logo">
            Чайная полка
          </Link>
          <nav aria-label="Основная навигация">
            <ul className="nav">
              <li>
                <NavLink to="/catalog">Каталог</NavLink>
              </li>
              <li>
                <NavLink to="/cart" data-testid="cart-link">
                  Корзина{count > 0 && <span className="badge">{count}</span>}
                </NavLink>
              </li>
            </ul>
          </nav>
        </div>
      </header>
      <main className="container main">
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="container">
          Чайная полка — демо-витрина. Оплата и доставка не подключены.
        </div>
      </footer>
    </>
  );
}

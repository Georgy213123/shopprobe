'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { cartCount } from '@/lib/cart';
import { useCart, useSeededBugs } from '@/lib/contexts';

function NavLink({ href, children, ...rest }: { href: string; children: ReactNode }) {
  const active = usePathname().startsWith(href);
  return (
    <Link
      href={href}
      className={active ? 'active' : undefined}
      aria-current={active ? 'page' : undefined}
      {...rest}
    >
      {children}
    </Link>
  );
}

/** Посаженный дефект: ссылка на удалённый стиль даёт 404 у статического ресурса. */
function LegacyStylesheet() {
  // Намеренно мимо сборщика: ссылка на несуществующий файл и есть дефект.
  // eslint-disable-next-line @next/next/no-css-tags
  return <link rel="stylesheet" href="/assets/legacy-promo.css" />;
}

export function Layout({ children }: { children: ReactNode }) {
  const { lines } = useCart();
  const seeded = useSeededBugs();
  const count = cartCount(lines);

  return (
    <>
      {seeded && <LegacyStylesheet />}
      <header className="site-header">
        <div className="container header-row">
          <Link href="/" className="logo">
            Чайная полка
          </Link>
          <nav aria-label="Основная навигация">
            <ul className="nav">
              <li>
                <NavLink href="/catalog">Каталог</NavLink>
              </li>
              <li>
                <NavLink href="/cart" data-testid="cart-link">
                  Корзина{count > 0 && <span className="badge">{count}</span>}
                </NavLink>
              </li>
            </ul>
          </nav>
        </div>
      </header>
      <main className="container main">{children}</main>
      <footer className="site-footer">
        <div className="container">
          Чайная полка — демо-витрина. Оплата и доставка не подключены.
        </div>
      </footer>
    </>
  );
}

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CART_KEY } from '../lib/cart';
import { AppProviders } from '../lib/context';
import { CartPage } from './CartPage';

function renderCart() {
  return render(
    <MemoryRouter>
      <AppProviders>
        <CartPage />
      </AppProviders>
    </MemoryRouter>,
  );
}

describe('CartPage (US-04)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ name: 'x', seeded_bugs: false }))),
    );
  });

  it('пустая корзина предлагает перейти в каталог', () => {
    renderCart();
    expect(screen.getByText(/Корзина пуста/)).toBeInTheDocument();
  });

  it('показывает позиции из localStorage, итог и удаляет позицию', async () => {
    window.localStorage.setItem(
      CART_KEY,
      JSON.stringify([
        { slug: 'sencha', name: 'Сенча', price: 760, qty: 2 },
        { slug: 'assam', name: 'Ассам', price: 540, qty: 1 },
      ]),
    );
    renderCart();
    expect(screen.getByTestId('cart-total')).toHaveTextContent('2 060 ₽');
    await userEvent.click(screen.getAllByRole('button', { name: 'Удалить' })[0]!);
    expect(screen.getByTestId('cart-total')).toHaveTextContent('540 ₽');
    expect(JSON.parse(window.localStorage.getItem(CART_KEY) ?? '[]')).toHaveLength(1);
  });
});

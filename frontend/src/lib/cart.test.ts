import { describe, expect, it } from 'vitest';
import {
  CART_KEY,
  cartCount,
  cartReducer,
  cartTotal,
  loadCart,
  MAX_QTY,
  saveCart,
  type CartLine,
} from './cart';

const tea = { slug: 'sencha', name: 'Сенча', price: 760 };

describe('cartReducer (US-04)', () => {
  it('добавляет новую позицию и увеличивает количество у существующей', () => {
    let s = cartReducer([], { type: 'add', item: tea });
    s = cartReducer(s, { type: 'add', item: tea, qty: 2 });
    expect(s).toEqual([{ ...tea, qty: 3 }]);
  });

  it('держит количество в пределах 1…MAX_QTY', () => {
    let s = cartReducer([], { type: 'add', item: tea, qty: 100 });
    expect(s[0]?.qty).toBe(MAX_QTY);
    s = cartReducer(s, { type: 'setQty', slug: 'sencha', qty: 0 });
    expect(s[0]?.qty).toBe(1);
  });

  it('удаляет и очищает', () => {
    const s = cartReducer([], { type: 'add', item: tea });
    expect(cartReducer(s, { type: 'remove', slug: 'sencha' })).toEqual([]);
    expect(cartReducer(s, { type: 'clear' })).toEqual([]);
  });

  it('считает итог и число штук', () => {
    const lines: CartLine[] = [
      { ...tea, qty: 2 },
      { slug: 'assam', name: 'Ассам', price: 540, qty: 1 },
    ];
    expect(cartTotal(lines)).toBe(2060);
    expect(cartCount(lines)).toBe(3);
  });
});

describe('хранение корзины', () => {
  const storage = (raw: string | null) => ({
    getItem: (k: string) => (k === CART_KEY ? raw : null),
  });

  it('восстанавливает сохранённую корзину', () => {
    const data: Record<string, string> = {};
    saveCart({ setItem: (k, v) => (data[k] = v) }, [{ ...tea, qty: 2 }]);
    expect(loadCart(storage(data[CART_KEY] ?? null))).toEqual([{ ...tea, qty: 2 }]);
  });

  it.each(['не json', '{"a":1}', '[{"slug":1}]', '[{"slug":"x","name":"y","price":1,"qty":0}]'])(
    'испорченное содержимое %s даёт пустую корзину',
    (raw) => {
      expect(loadCart(storage(raw))).toEqual([]);
    },
  );

  it('не падает, если хранилище недоступно', () => {
    expect(() =>
      saveCart(
        {
          setItem: () => {
            throw new Error('QuotaExceeded');
          },
        },
        [],
      ),
    ).not.toThrow();
  });
});

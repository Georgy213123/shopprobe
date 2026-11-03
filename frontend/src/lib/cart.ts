/** Корзина без сервера: состояние в localStorage, вся логика — чистые функции. */

export interface CartLine {
  slug: string;
  name: string;
  price: number;
  qty: number;
}

export type CartAction =
  | { type: 'add'; item: Omit<CartLine, 'qty'>; qty?: number }
  | { type: 'setQty'; slug: string; qty: number }
  | { type: 'remove'; slug: string }
  | { type: 'clear' };

export const CART_KEY = 'teashelf.cart.v1';
export const MAX_QTY = 20;

const clamp = (n: number) => Math.max(1, Math.min(MAX_QTY, Math.trunc(n)));

export function cartReducer(state: CartLine[], action: CartAction): CartLine[] {
  switch (action.type) {
    case 'add': {
      const qty = clamp(action.qty ?? 1);
      const existing = state.find((l) => l.slug === action.item.slug);
      if (existing) {
        return state.map((l) => (l === existing ? { ...l, qty: clamp(l.qty + qty) } : l));
      }
      return [...state, { ...action.item, qty }];
    }
    case 'setQty':
      return state.map((l) => (l.slug === action.slug ? { ...l, qty: clamp(action.qty) } : l));
    case 'remove':
      return state.filter((l) => l.slug !== action.slug);
    case 'clear':
      return [];
  }
}

export function cartTotal(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.price * l.qty, 0);
}

export function cartCount(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.qty, 0);
}

function isLine(x: unknown): x is CartLine {
  if (typeof x !== 'object' || x === null) return false;
  const l = x as Record<string, unknown>;
  return (
    typeof l.slug === 'string' &&
    typeof l.name === 'string' &&
    typeof l.price === 'number' &&
    typeof l.qty === 'number' &&
    l.qty >= 1
  );
}

/**
 * Само обращение к window.localStorage бросает SecurityError, если браузер запретил
 * хранилище, — поэтому оно тоже внутри try (ревью Codex, R9).
 */
export function browserStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Испорченное или чужое содержимое хранилища не должно ронять витрину. */
export function loadCart(storage: Pick<Storage, 'getItem'> | null): CartLine[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(CART_KEY);
    if (!raw) return [];
    const data: unknown = JSON.parse(raw);
    return Array.isArray(data) ? data.filter(isLine).map((l) => ({ ...l, qty: clamp(l.qty) })) : [];
  } catch {
    return [];
  }
}

export function saveCart(storage: Pick<Storage, 'setItem'> | null, lines: CartLine[]): void {
  if (!storage) return;
  try {
    storage.setItem(CART_KEY, JSON.stringify(lines));
  } catch {
    // Приватный режим или переполнение: корзина живёт до перезагрузки.
  }
}

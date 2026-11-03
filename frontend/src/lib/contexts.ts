import { createContext, useContext } from 'react';
import type { CartAction, CartLine } from './cart';

export interface CartContextValue {
  lines: CartLine[];
  dispatch: (action: CartAction) => void;
}

export const CartContext = createContext<CartContextValue | null>(null);
export const SeededBugsContext = createContext(false);

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart вне AppProviders');
  return ctx;
}

/** Флаг посаженных дефектов (SEEDED_BUGS=1 на сервере). В обычном режиме всегда false. */
export function useSeededBugs(): boolean {
  return useContext(SeededBugsContext);
}

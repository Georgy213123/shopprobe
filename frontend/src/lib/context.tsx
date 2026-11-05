'use client';

import { useEffect, useReducer, type ReactNode } from 'react';
import { api } from './api';
import {
  browserStorage,
  cartReducer,
  loadCart,
  saveCart,
  type CartAction,
  type CartLine,
} from './cart';
import { CartContext, SeededBugsContext } from './contexts';
import { useFetch } from './useFetch';

// Сервер не видит localStorage, поэтому корзина читается уже после гидратации:
// иначе разметка клиента разойдётся с серверной. До чтения сохранять нельзя — затрём корзину.
interface CartState {
  lines: CartLine[];
  loaded: boolean;
}

function reducer(state: CartState, action: CartAction | { type: 'load'; lines: CartLine[] }) {
  if (action.type === 'load') return { lines: action.lines, loaded: true };
  return { ...state, lines: cartReducer(state.lines, action) };
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [{ lines, loaded }, dispatch] = useReducer(reducer, { lines: [], loaded: false });
  useEffect(() => dispatch({ type: 'load', lines: loadCart(browserStorage()) }), []);
  useEffect(() => {
    if (loaded) saveCart(browserStorage(), lines);
  }, [lines, loaded]);
  const meta = useFetch((signal) => api.meta(signal), 'meta');
  const seeded = meta.status === 'ok' && meta.data.seeded_bugs;

  return (
    <SeededBugsContext.Provider value={seeded}>
      <CartContext.Provider value={{ lines, dispatch }}>{children}</CartContext.Provider>
    </SeededBugsContext.Provider>
  );
}

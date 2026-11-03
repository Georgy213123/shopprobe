import { useEffect, useReducer, type ReactNode } from 'react';
import { api } from './api';
import { browserStorage, cartReducer, loadCart, saveCart } from './cart';
import { CartContext, SeededBugsContext } from './contexts';
import { useFetch } from './useFetch';

export function AppProviders({ children }: { children: ReactNode }) {
  const [lines, dispatch] = useReducer(cartReducer, undefined, () => loadCart(browserStorage()));
  useEffect(() => saveCart(browserStorage(), lines), [lines]);
  const meta = useFetch((signal) => api.meta(signal), 'meta');
  const seeded = meta.status === 'ok' && meta.data.seeded_bugs;

  return (
    <SeededBugsContext.Provider value={seeded}>
      <CartContext.Provider value={{ lines, dispatch }}>{children}</CartContext.Provider>
    </SeededBugsContext.Provider>
  );
}
